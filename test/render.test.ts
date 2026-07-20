import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { renderHtml, renderLimits } from "../src/render.js"
import type { Document, Item, Period } from "../src/validation/model.js"

const fixture = (path: string): Document =>
  JSON.parse(readFileSync(resolve(path), "utf8")) as Document

const renderBytes = (document: Document): Buffer => {
  const rendered = renderHtml(document)
  expect(rendered.ok).toBe(true)
  if (!rendered.ok) throw new Error(`Unexpected ${rendered.budget} limit`)
  return rendered.bytes
}

const tableDocument = (periodCount: number, itemCount: number): Document => {
  const periods: Array<Period> = []
  const periodIds: Array<string> = []
  for (let index = 0; index < periodCount; index += 1) {
    const id = `p${index}`
    periods.push({ id, kind: "instant", date: "2025-12-31" })
    periodIds.push(id)
  }
  const values = Object.fromEntries(periodIds.map((period) => [period, "1"]))
  const items: Array<Item> = Array.from({ length: itemCount }, (_, index) => ({
    id: `item${index}`,
    label: `Item ${index}`,
    unit: "usd",
    values,
    groupings: {}
  }))
  return {
    formatVersion: "0.1",
    entity: { name: "Grid boundary" },
    scope: { label: "Rendering" },
    units: [{ id: "usd", label: "USD", measure: "USD", scale: 0 }],
    periods,
    statements: [{ id: "statement", label: "Statement", periods: periodIds, items }]
  }
}

describe("HTML rendering", () => {
  it.each([
    [
      "complete statement rows",
      "fixtures/valid/render-presentation.json",
      "fixtures/cli/expected/render/render-presentation.html"
    ],
    ["minimal statement", "examples/minimal.json", "fixtures/cli/expected/render/minimal.html"],
    [
      "rollup and snapshot content",
      "fixtures/valid/snapshot-mismatch-source.json",
      "fixtures/cli/expected/render/snapshot-mismatch.html"
    ]
  ] as const)("produces exact deterministic bytes for %s", (_name, input, expected) => {
    expect(renderBytes(fixture(input))).toEqual(readFileSync(resolve(expected)))
  })

  it("renders grouping columns as flat metadata without rollup styling", () => {
    const document = fixture("fixtures/valid/render-presentation.json")
    const original = JSON.stringify(document)
    const html = renderBytes(document).toString("utf8")

    expect(html).toContain('<th scope="col">valuation</th>')
    expect(html).toContain('<td class="metadata">Working &lt;Capital&gt;</td>')
    expect(html).not.toContain("colspan")
    expect(html).not.toContain("heading")
    expect(html).not.toContain("rowgroup")
    expect(JSON.stringify(document)).toBe(original)
  })

  it("excludes rollup and validation metadata", () => {
    const html = renderBytes(fixture("fixtures/valid/snapshot-mismatch-source.json")).toString("utf8")

    expect(html).not.toContain("rollupTo")
    expect(html).not.toContain("validationSnapshot")
    expect(html).not.toContain("unsatisfied")
    expect(html).not.toContain("difference")
  })

  it("escapes every HTML-sensitive author-text character", () => {
    const document = fixture("examples/minimal.json")
    const html = renderBytes({
      ...document,
      entity: { ...document.entity, name: "&<>\"'" }
    }).toString("utf8")

    expect(html).toContain("&amp;&lt;&gt;&quot;&#39;")
    expect(html).not.toContain("&<>\"'")
  })

  it("treats every dynamic string as text at the renderer seam", () => {
    const document = fixture("examples/minimal.json")
    const statement = document.statements[0]
    const item = statement?.items[0]
    if (statement === undefined || item === undefined) {
      throw new Error("Minimal fixture lost its first item")
    }
    const html = renderBytes({
      ...document,
      statements: [{
        ...statement,
        items: [{ ...item, values: { fy2025: "<script>alert('unsafe')</script>" } }]
      }]
    }).toString("utf8")

    expect(html).toContain("&lt;script&gt;alert(&#39;unsafe&#39;)&lt;/script&gt;")
    expect(html).not.toContain("<td class=\"value\"><script>alert('unsafe')</script></td>")
  })

  it("rejects the Phase-1 over-wide fixture before rendering cells", () => {
    expect(renderHtml(fixture("fixtures/valid/render-column-limit-exceeded.json"))).toEqual({
      ok: false,
      budget: "columns",
      limit: renderLimits.columns
    })
  })

  it("allows the total-column boundary", () => {
    const rendered = renderHtml(tableDocument(renderLimits.columns - 1, 1))
    expect(rendered.ok).toBe(true)
  })

  it("rejects documents beyond the total grid-slot budget", () => {
    const document = tableDocument(99, 1_000)
    expect(renderHtml(document)).toEqual({
      ok: false,
      budget: "grid-slots",
      limit: renderLimits.gridSlots
    })
  })

  it("gives any statement column failure precedence over document grid accumulation", () => {
    const gridExceeded = tableDocument(99, 1_000)
    const columnsExceeded = tableDocument(1_000, 1)
    expect(renderHtml({
      ...columnsExceeded,
      statements: [
        gridExceeded.statements[0] as Document["statements"][number],
        columnsExceeded.statements[0] as Document["statements"][number]
      ]
    })).toEqual({
      ok: false,
      budget: "columns",
      limit: renderLimits.columns
    })
  })

  it("allows the total grid-slot boundary", () => {
    const rendered = renderHtml(tableDocument(99, 999))
    expect(rendered.ok).toBe(true)
  })

  it("allows the exact encoded HTML byte boundary", () => {
    const document = fixture("examples/minimal.json")
    const baseline = renderBytes(document).length
    const valueLength = renderLimits.htmlBytes - baseline + 1
    const first = document.statements[0]?.items[0]
    if (first === undefined) throw new Error("Minimal fixture lost its first item")
    const rendered = renderHtml({
      ...document,
      statements: [{
        ...document.statements[0] as Document["statements"][number],
        items: [{ ...first, values: { fy2025: `1${"0".repeat(valueLength - 1)}` } }]
      }]
    })

    expect(rendered.ok).toBe(true)
    if (rendered.ok) expect(rendered.bytes).toHaveLength(renderLimits.htmlBytes)
  })

  it("rejects encoded HTML beyond the byte budget without materializing escaped output", () => {
    const document = fixture("examples/minimal.json")
    const oversizedName = "&".repeat(Math.floor(renderLimits.htmlBytes / 10) + 1)

    expect(renderHtml({
      ...document,
      entity: { ...document.entity, name: oversizedName }
    })).toEqual({
      ok: false,
      budget: "html-bytes",
      limit: renderLimits.htmlBytes
    })
  })

  it("rejects an oversized decimal without materializing a cell string", () => {
    const document = fixture("examples/minimal.json")
    const statement = document.statements[0]
    const first = statement?.items[0]
    if (statement === undefined || first === undefined) throw new Error("Minimal fixture lost its first item")

    expect(renderHtml({
      ...document,
      statements: [{
        ...statement,
        items: [{ ...first, values: { fy2025: `1${"0".repeat(renderLimits.htmlBytes)}` } }]
      }]
    })).toEqual({
      ok: false,
      budget: "html-bytes",
      limit: renderLimits.htmlBytes
    })
  })
})

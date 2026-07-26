import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { renderHtml, renderLimits } from "../src/render.js"
import { createRenderPresentation } from "../src/render/presentation.js"
import type { Document, Item, Period } from "../src/validation/model.js"
import { exactByteDocument } from "./support/exact-byte-document.js"

const fixture = (path: string): Document =>
  JSON.parse(readFileSync(resolve(path), "utf8")) as Document

const renderBytes = (document: Document): Buffer => {
  const rendered = renderHtml(document)
  expect(rendered.ok).toBe(true)
  if (!rendered.ok) throw new Error(`Unexpected ${rendered.budget} limit`)
  return rendered.bytes
}

const decodeHtmlText = (text: string): string =>
  text.replace(/&(?:amp|lt|gt|quot|#39);/gu, (entity) => {
    switch (entity) {
      case "&amp;": return "&"
      case "&lt;": return "<"
      case "&gt;": return ">"
      case "&quot;": return '"'
      case "&#39;": return "'"
      default: throw new Error(`Unexpected HTML entity ${entity}`)
    }
  })

const copySource = (html: string, ordinal: number): string => {
  const match = html.match(new RegExp(`<textarea[^>]+id="copy-source-${ordinal}"[^>]*>([\\s\\S]*?)</textarea>`, "u"))
  if (match?.[1] === undefined) throw new Error(`Missing copy source ${ordinal}`)
  const parsed: unknown = JSON.parse(decodeHtmlText(match[1]))
  if (typeof parsed !== "string") throw new Error(`Copy source ${ordinal} is not a string`)
  return parsed
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
    values
  }))
  return {
    formatVersion: "0.2",
    entity: { name: "Grid boundary" },
    scope: { label: "Rendering" },
    units: [{ id: "usd", label: "USD", measure: "USD", scale: 0 }],
    periods,
    statements: [{ id: "statement", label: "Statement", periods: periodIds, items }]
  }
}

const rollupChainDocument = (itemCount: number): Document => {
  const document = tableDocument(1, itemCount)
  const statement = document.statements[0]
  if (statement === undefined) throw new Error("Chain fixture lost its statement")
  return {
    ...document,
    statements: [{
      ...statement,
      items: statement.items.map((item, index) => ({
        ...item,
        ...(index === 0 ? {} : { rollupTo: `item${index - 1}` })
      }))
    }]
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

  it("renders statement rows without removed grouping metadata", () => {
    const document = fixture("fixtures/valid/render-presentation.json")
    const original = JSON.stringify(document)
    const html = renderBytes(document).toString("utf8")

    expect(html).not.toContain('data-col="g')
    expect(html).not.toContain("colspan")
    expect(html).not.toContain("rowgroup")
    expect(html).not.toContain('class="row-parent')
    expect(html).toContain("No rollup checks defined")
    expect(JSON.stringify(document)).toBe(original)
  })

  it("renders ordinal navigation, native table fallbacks, and progressive controls", () => {
    const html = renderBytes(fixture("fixtures/valid/render-presentation.json")).toString("utf8")

    expect(html).toContain('<nav class="statement-index" aria-label="Statements">')
    expect(html).toContain('<a href="#statement-1"><span class="index-number">01</span>')
    expect(html).toContain('<h2><span class="ordinal">02</span>Mixed units</h2>')
    expect(html).toContain('<caption class="table-caption"><span class="caption-inner">Ordered &amp; escaped — Unit: USD &lt;millions&gt; (USD, scale 6)</span></caption>')
    expect(html).toContain('<caption class="table-caption"><span class="caption-inner">Mixed units — Units shown by item</span></caption>')
    expect(html).toContain('role="region" aria-label="Ordered &amp; escaped table. Scroll horizontally to review all columns." tabindex="0"')
    expect(html).toContain('data-copy-handoff hidden')
    expect(html).toContain('aria-label="Copy Ordered &amp; escaped for Excel"')
    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true"')
    expect(html).toContain('<main id="statements" tabindex="-1">')
    expect(html).toContain('(expanded ? "Collapse " : "Expand ") + label + " detail rows"')
    expect(html).toContain("data-table-tools hidden")
    expect(html).toContain('<label><input type="checkbox" checked data-col-toggle="unit"> Unit</label>')
    expect(html.match(/<details class="col-menu" data-col-menu>/gu)).toHaveLength(1)
    expect(html.match(/data-col-toggle="unit"/gu)).toHaveLength(1)
    const homogeneous = renderBytes(fixture("examples/minimal.json")).toString("utf8")
    expect(homogeneous).not.toContain('<details class="col-menu" data-col-menu>')
    expect(homogeneous).not.toContain('data-col-toggle="unit"')
    expect(html).toContain("including any rows or columns hidden in this view")
    expect(html).toContain("The FS JSON document is authoritative")
    expect(html).not.toContain('<a class="doc-checks-link"')
    expect(html).not.toContain("data-rows-collapse>")
    expect(html.match(/<table id=/gu)).toHaveLength(2)
    expect(html.match(/data-copy-control data-copy-source=/gu)).toHaveLength(2)
  })

  it("aligns text and numeric columns and embeds tooltip unit context", () => {
    const document = fixture("fixtures/valid/render-presentation.json")
    const statement = document.statements[0]
    const item = statement?.items[0]
    if (statement === undefined || item === undefined) {
      throw new Error("Presentation fixture lost its first item")
    }
    const html = renderBytes({
      ...document,
      statements: [{
        ...statement,
        items: [{ ...item, description: "Primary <liquidity>" }, ...statement.items.slice(1)]
      }, ...document.statements.slice(1)]
    }).toString("utf8")

    expect(html).toContain('<th scope="col" class="col-text">Item</th>')
    expect(html).toContain('<th scope="col" class="col-text" data-col="unit">Unit</th>')
    expect(html).toContain('<th scope="col" class="col-num">2025-12-31</th>')
    expect(html).toContain('data-common-unit="USD &lt;millions&gt; (USD, scale 6)"')
    expect(html).toContain('data-unit-full="USD &lt;millions&gt; (USD, scale 6)">USD &lt;millions&gt;</td>')
    expect(html).toContain('<span class="item-description">Primary &lt;liquidity&gt;</span>')
  })

  it("streams exact per-statement TSV with an unconditional Unit column", () => {
    const html = renderBytes(fixture("fixtures/valid/render-presentation.json")).toString("utf8")

    expect(copySource(html, 1)).toBe([
      "Item\tUnit\t2025-12-31\t2024-12-31",
      "Cash <available>\tUSD <millions> (USD, scale 6)\t0\tMissing",
      "Inventory\tUSD <millions> (USD, scale 6)\t-1.25\tUnavailable"
    ].join("\n"))
    expect(copySource(html, 2)).toBe([
      "Item\tUnit\t2025-12-31",
      "Amount\tUSD <millions> (USD, scale 6)\t2.5",
      "Count\tShares & units (shares, scale 0)\t3"
    ].join("\n"))
    expect(copySource(html, 1)).not.toMatch(/\n$/u)
  })

  it("normalizes delimiters, protects formula prefixes, and keeps copy data inert", () => {
    const document = fixture("examples/minimal.json")
    const statement = document.statements[0]
    const item = statement?.items[0]
    const unit = document.units[0]
    if (statement === undefined || item === undefined || unit === undefined) {
      throw new Error("Minimal fixture lost its presentation data")
    }
    const rendered = renderBytes({
      ...document,
      units: [{
        ...unit,
        label: "\"Qualified</textarea><script>alert(\"x\")</script>&'\tLabel",
        measure: "Amount\r\nMeasure"
      }],
      statements: [{
        ...statement,
        items: [{
          ...item,
          label: "\u2003-Item\nName",
          values: { fy2025: "-1.25" }
        }]
      }]
    }).toString("utf8")

    expect(copySource(rendered, 1)).toBe([
      "Item\tUnit\t2025-01-01 – 2025-12-31",
      "'\u2003-Item Name\t'\"Qualified</textarea><script>alert(\"x\")</script>&' Label (Amount  Measure, scale 0)\t-1.25"
    ].join("\n"))
    expect(rendered).toContain("&lt;/textarea&gt;&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;")
    expect(rendered.match(/<script>/gu)).toHaveLength(1)
  })

  it("preserves U+0000 through the inert copy payload", () => {
    const document = fixture("examples/minimal.json")
    const statement = document.statements[0]
    const item = statement?.items[0]
    if (statement === undefined || item === undefined) {
      throw new Error("Minimal fixture lost its first statement item")
    }
    const rendered = renderBytes({
      ...document,
      statements: [{ ...statement, items: [{ ...item, label: "Before\u0000After" }] }]
    }).toString("utf8")

    expect(copySource(rendered, 1)).toContain("Before\u0000After")
    expect(rendered).toContain("Before\\u0000After")
  })

  it("keeps the executable script fixed and free of author text", () => {
    const baseline = renderBytes(fixture("examples/minimal.json")).toString("utf8")
    const document = fixture("examples/minimal.json")
    const authored = renderBytes({
      ...document,
      entity: { ...document.entity, name: "SCRIPT_SENTINEL" }
    }).toString("utf8")
    const extractScript = (value: string): string => value.match(/<script>([\s\S]*?)<\/script>/u)?.[1] ?? ""

    expect(extractScript(authored)).toBe(extractScript(baseline))
    expect(extractScript(authored)).not.toContain("SCRIPT_SENTINEL")
    expect(authored).not.toMatch(/\son[a-z]+=/u)
    expect(authored).not.toMatch(/<script[^>]+src=/u)
  })

  it("derives rollup hierarchy and fresh validation results without exposing identifiers", () => {
    const html = renderBytes(fixture("fixtures/valid/snapshot-mismatch-source.json")).toString("utf8")

    expect(html).toContain('data-parent-row="1"')
    expect(html).toContain('class="row-parent row-total"')
    expect(html).toContain('aria-label="Collapse Total detail rows"')
    expect(html).toContain('<tr class="row-heading" data-parent-row="1">')
    expect(html).toContain('<span class="collapsed-count" hidden>· 1 row</span>')
    expect(html).toContain("Rollup checks — 1 · 1 not satisfied")
    // The not-satisfied signal is navigable and pre-disclosed: the masthead
    // count links to the failing statement's checks, the disclosure renders
    // expanded, and the statement index carries a glyph-and-text flag.
    expect(html).toContain('<a class="doc-checks-link" href="#statement-checks-1">')
    expect(html).toContain('<details class="checks" id="statement-checks-1" open>')
    expect(html).toContain('≠<span class="visually-hidden"> checks not satisfied</span>')
    expect(html).toContain('<th scope="row">Total = Child</th>')
    // The embedded snapshot claims this check is satisfied; the rendered result
    // must come from a fresh calculation over the document instead.
    expect(html).toContain("≠ Not satisfied")
    expect(html).not.toContain("rollupTo")
    expect(html).not.toContain("validationSnapshot")
  })

  it("keeps check decimals verbatim and distinguishes unevaluated checks", () => {
    const document = fixture("examples/minimal.json")
    const statement = document.statements[0]
    const first = statement?.items[0]
    if (statement === undefined || first === undefined) {
      throw new Error("Minimal fixture lost its rollup inputs")
    }
    const evaluable = renderBytes({
      ...document,
      statements: [{
        ...statement,
        items: [
          { ...first, id: "child", label: "Child", values: { fy2025: "1" }, rollupTo: "total" },
          { ...first, id: "total", label: "Total", values: { fy2025: "1000.25" } }
        ]
      }]
    }).toString("utf8")

    expect(evaluable).toContain('<td class="value">1,000.25</td>')
    expect(evaluable).toContain(`                  <td class="value">1000.25</td>
                  <td class="value">1</td>
                  <td class="value">999.25</td>
                  <td class="value">0</td>`)

    const notChecked = renderBytes({
      ...document,
      statements: [{
        ...statement,
        items: [
          { ...first, id: "child", label: "Child", values: { fy2025: "1" }, rollupTo: "total" },
          { ...first, id: "total", label: "Total", values: { fy2025: null } }
        ]
      }]
    }).toString("utf8")

    expect(notChecked).toContain(
      '<span class="check-glyph" data-status="error">!</span> 1 rollup check · 1 not checked'
    )
    expect(notChecked).toContain("Rollup checks — 1 · 1 not checked")
    expect(notChecked).toContain('<details class="checks" id="statement-checks-1" open>')
    expect(notChecked).toContain(
      '!<span class="visually-hidden"> checks not checked</span>'
    )
    expect(notChecked).toContain("! Not checked")
  })

  it("resolves long rollup chains iteratively and caches transitive descendant counts", () => {
    const itemCount = 10_000
    const presentation = createRenderPresentation(rollupChainDocument(itemCount))
    const items = presentation.statements[0]?.items

    expect(items).toHaveLength(itemCount)
    expect(items?.[0]?.descendantCount).toBe(itemCount - 1)
    expect(items?.[itemCount - 1]?.depth).toBe(itemCount - 1)
    expect(items?.[itemCount - 1]?.descendantCount).toBe(0)
  })

  it("indexes calculation applications by statement", () => {
    const statementCount = 2_000
    const document = tableDocument(1, 2)
    const source = document.statements[0]
    const child = source?.items[0]
    const parent = source?.items[1]
    if (source === undefined || child === undefined || parent === undefined) {
      throw new Error("Application fixture lost its items")
    }
    const statements = Array.from({ length: statementCount }, (_, index) => ({
      ...source,
      id: `statement${index}`,
      items: [
        { ...child, id: "child", rollupTo: "parent" },
        { ...parent, id: "parent" }
      ]
    }))
    const presentation = createRenderPresentation({ ...document, statements })

    expect(presentation.statements).toHaveLength(statementCount)
    expect(presentation.statements.every(({ checks }) => checks.length === 1)).toBe(true)
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

  it("refuses structural limits before deriving visible or copied cell text", () => {
    const failOnCalculation = (document: Document): Document => {
      const statement = document.statements[0]
      const parent = statement?.items[0]
      const child = statement?.items[1]
      if (statement === undefined || parent === undefined || child === undefined) {
        throw new Error("Boundary fixture lost its items")
      }
      const rollupChild = { ...child, rollupTo: parent.id }
      Object.defineProperty(rollupChild, "values", {
        get: () => { throw new Error("calculations ran before structural refusal") }
      })
      return {
        ...document,
        statements: [{
          ...statement,
          items: [parent, rollupChild, ...statement.items.slice(2)]
        }]
      }
    }

    expect(renderHtml(failOnCalculation(tableDocument(renderLimits.columns, 2)))).toEqual({
      ok: false,
      budget: "columns",
      limit: renderLimits.columns
    })
    expect(renderHtml(failOnCalculation(tableDocument(99, 1_000)))).toEqual({
      ok: false,
      budget: "grid-slots",
      limit: renderLimits.gridSlots
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

  it("counts derived group headings against the total grid-slot budget", () => {
    const document = tableDocument(99, 999)
    const statement = document.statements[0]
    const parent = statement?.items.at(-1)
    if (statement === undefined || parent === undefined) {
      throw new Error("Heading boundary fixture lost its statement")
    }
    const items = statement.items.map((item, index) =>
      index === statement.items.length - 1 ? item : { ...item, rollupTo: parent.id }
    )

    expect(renderHtml({ ...document, statements: [{ ...statement, items }] })).toEqual({
      ok: false,
      budget: "grid-slots",
      limit: renderLimits.gridSlots
    })
  })

  it("allows the exact encoded HTML byte boundary", () => {
    const rendered = renderHtml(exactByteDocument())

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

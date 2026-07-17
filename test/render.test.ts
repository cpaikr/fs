import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { renderHtml, renderLimits } from "../src/render.js"
import type { Dimension, Document, Statement } from "../src/validation/model.js"

const fixture = (path: string): Document =>
  JSON.parse(readFileSync(resolve(path), "utf8")) as Document

const renderBytes = (document: Document): Buffer => {
  const rendered = renderHtml(document)
  expect(rendered.ok).toBe(true)
  if (!rendered.ok) throw new Error(`unexpected ${rendered.budget} limit`)
  return rendered.bytes
}

const dimension = (id: string, memberCount: number): Dimension => ({
  id,
  label: `Dimension ${id}`,
  members: Array.from({ length: memberCount }, (_, index) => ({
    id: `${id}-member-${index}`,
    label: `Member ${index}`
  }))
})

const withPresentation = (
  dimensions: ReadonlyArray<Dimension>,
  statement: Partial<Statement>
): Document => {
  const document = fixture("examples/minimal.json")
  return {
    ...document,
    dimensions,
    statements: [{ ...document.statements[0] as Statement, ...statement }]
  }
}

describe("HTML rendering", () => {
  it.each([
    [
      "complete presentation",
      "fixtures/valid/render-presentation.json",
      "fixtures/cli/expected/render/render-presentation.html"
    ],
    [
      "minimal presentation",
      "examples/minimal.json",
      "fixtures/cli/expected/render/minimal.html"
    ],
    [
      "calculation and snapshot content",
      "fixtures/valid/snapshot-mismatch-source.json",
      "fixtures/cli/expected/render/snapshot-mismatch.html"
    ]
  ] as const)("produces exact deterministic bytes for %s", (_name, input, expected) => {
    expect(renderBytes(fixture(input))).toEqual(readFileSync(resolve(expected)))
  })

  it("uses exact coordinates without leaking non-presentation content", () => {
    const document = fixture("fixtures/valid/render-presentation.json")
    const original = JSON.stringify(document)
    const html = renderBytes(document).toString("utf8")

    expect(html).not.toContain("999")
    expect(html).not.toContain("888")
    expect(html).not.toContain("777")
    expect(html).not.toContain("Unlisted alternate unit")
    expect(html).not.toContain("Unlisted West")
    expect(html).not.toContain("Not displayed")
    expect(html.match(/<td class="heading"/gu)).toHaveLength(2)
    expect(html).not.toContain('<th class="heading"')
    expect(html).not.toContain('scope="rowgroup"')
    expect(JSON.stringify(document)).toBe(original)
  })

  it("excludes calculation rules and validation snapshots", () => {
    const html = renderBytes(fixture("fixtures/valid/snapshot-mismatch-source.json")).toString("utf8")

    expect(html).not.toContain("subtotal")
    expect(html).not.toContain("parts-agree")
    expect(html).not.toContain("retired-rule")
  })

  it("rejects Cartesian expansion before allocating coordinates", () => {
    const dimensions = Array.from({ length: 10 }, (_, index) => dimension(`axis-${index}`, 2))
    const document = withPresentation(dimensions, {
      dimensions: dimensions.map((definition) => ({
        dimension: definition.id,
        members: definition.members.map((member) => member.id)
      }))
    })

    expect(renderHtml(document)).toEqual({
      ok: false,
      budget: "columns",
      limit: renderLimits.columns
    })
  })

  it("rejects many singleton axes while streaming header measurement", () => {
    const longLabel = "x".repeat(1_000)
    const dimensions: ReadonlyArray<Dimension> = Array.from({ length: 10_000 }, (_, index) => ({
      id: `axis-${index}`,
      label: longLabel,
      members: [{ id: `member-${index}`, label: longLabel }]
    }))
    const document = withPresentation(dimensions, {
      dimensions: dimensions.map((definition) => ({
        dimension: definition.id,
        members: [definition.members[0]?.id as string]
      }))
    })

    expect(renderHtml(document)).toEqual({
      ok: false,
      budget: "html-bytes",
      limit: renderLimits.htmlBytes
    })
  })

  it("allows the total-column boundary", () => {
    const axis = dimension("axis", renderLimits.columns - 1)
    const rendered = renderHtml(withPresentation([axis], {
      dimensions: [{ dimension: axis.id, members: axis.members.map((member) => member.id) }]
    }))

    expect(rendered.ok).toBe(true)
  })

  it("rejects documents beyond the total grid-slot budget", () => {
    const axis = dimension("axis", 99)
    const document = withPresentation([axis], {
      dimensions: [{ dimension: axis.id, members: axis.members.map((member) => member.id) }],
      entries: Array.from({ length: 1_000 }, () => ({ type: "item", item: "cash" } as const))
    })

    expect(renderHtml(document)).toEqual({
      ok: false,
      budget: "grid-slots",
      limit: renderLimits.gridSlots
    })
  })

  it("allows the total grid-slot boundary", () => {
    const axis = dimension("axis", 99)
    const rendered = renderHtml(withPresentation([axis], {
      dimensions: [{ dimension: axis.id, members: axis.members.map((member) => member.id) }],
      entries: Array.from({ length: 999 }, () => ({ type: "item", item: "cash" } as const))
    }))

    expect(rendered.ok).toBe(true)
  })

  it("allows the exact encoded HTML byte boundary", () => {
    const document = fixture("examples/minimal.json")
    const fact = document.facts[0] as Document["facts"][number]
    const baseline = renderBytes(document).length
    const valueLength = renderLimits.htmlBytes - baseline + 1
    const rendered = renderHtml({
      ...document,
      facts: [{
        ...fact,
        value: `1${"0".repeat(valueLength - 1)}`
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
    const fact = document.facts[0] as Document["facts"][number]

    expect(renderHtml({
      ...document,
      facts: [{
        ...fact,
        value: `1${"0".repeat(renderLimits.htmlBytes)}`
      }]
    })).toEqual({
      ok: false,
      budget: "html-bytes",
      limit: renderLimits.htmlBytes
    })
  })
})

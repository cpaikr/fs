import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { renderHtml } from "../src/render.js"
import type { Document } from "../src/validation/model.js"

const fixture = (path: string): Document =>
  JSON.parse(readFileSync(resolve(path), "utf8")) as Document

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
    expect(renderHtml(fixture(input))).toEqual(readFileSync(resolve(expected)))
  })

  it("uses exact coordinates without leaking non-presentation content", () => {
    const document = fixture("fixtures/valid/render-presentation.json")
    const original = JSON.stringify(document)
    const html = renderHtml(document).toString("utf8")

    expect(html).not.toContain("999")
    expect(html).not.toContain("888")
    expect(html).not.toContain("777")
    expect(html).not.toContain("Unlisted alternate unit")
    expect(html).not.toContain("Unlisted West")
    expect(html).not.toContain("Not displayed")
    expect(JSON.stringify(document)).toBe(original)
  })

  it("excludes calculation rules and validation snapshots", () => {
    const html = renderHtml(fixture("fixtures/valid/snapshot-mismatch-source.json")).toString("utf8")

    expect(html).not.toContain("subtotal")
    expect(html).not.toContain("parts-agree")
    expect(html).not.toContain("retired-rule")
  })
})

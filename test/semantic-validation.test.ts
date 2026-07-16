import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import type { Document } from "../src/validation/model.js"
import { validateSemantics } from "../src/validation/semantic.js"

const manifest = JSON.parse(readFileSync("fixtures/manifest.json", "utf8")) as {
  readonly validDocuments: ReadonlyArray<{ readonly document: string }>
  readonly invalidDocuments: ReadonlyArray<{
    readonly document: string
    readonly layer: "schema" | "semantic"
    readonly code: string
    readonly path: string
  }>
}

const document = (path: string): Document =>
  JSON.parse(readFileSync(path, "utf8")) as Document

describe("semantic validation", () => {
  it.each(manifest.validDocuments)("accepts $document", (entry) => {
    expect(validateSemantics(document(`fixtures/${entry.document}`))).toEqual([])
  })

  it.each(manifest.invalidDocuments.filter((entry) => entry.layer === "semantic"))(
    "normalizes $document",
    (entry) => {
      expect(validateSemantics(document(`fixtures/${entry.document}`))).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: entry.code, path: entry.path })
        ])
      )
    }
  )

  it("returns the complete deterministic diagnostic order", () => {
    const value = JSON.parse(readFileSync("examples/minimal.json", "utf8")) as Document & {
      items: Array<{ id: string; label: string }>
      facts: Array<{ item: string }>
    }
    value.items.push({ id: value.items[0]?.id ?? "cash", label: "Duplicate" })
    if (value.facts[0] !== undefined) value.facts[0].item = "unknown-item"

    expect(validateSemantics(value).map(({ code, path }) => ({ code, path }))).toEqual([
      { code: "unresolved-reference", path: "/facts/0/item" },
      { code: "duplicate-id", path: "/items/1/id" }
    ])
  })
})

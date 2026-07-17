import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import type { Document, Item } from "../src/validation/model.js"
import { validateSemantics } from "../src/validation/semantic.js"
import { validateDocument } from "../src/validation/validate.js"

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
      const errors = validateSemantics(document(`fixtures/${entry.document}`))
      expect(errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: entry.code, path: entry.path })])
      )
      expect(errors).toHaveLength(entry.code === "cyclic-rollup" ? 2 : 1)
    }
  )

  it.each(
    manifest.invalidDocuments.filter(
      (entry) => entry.layer === "semantic" && !entry.document.includes("snapshot")
    )
  )("returns $document through the public validator", (entry) => {
    const result = validateDocument(document(`fixtures/${entry.document}`))
    expect(result.validation.conformance).toEqual(
      expect.objectContaining({
        status: "nonconforming",
        errors: expect.arrayContaining([
          expect.objectContaining({ code: entry.code, path: entry.path })
        ])
      })
    )
    expect(result.validation.calculations).toEqual({ status: "not-run", applications: [] })
  })

  it("returns the complete deterministic diagnostic order", () => {
    const value = document("examples/minimal.json") as Document & {
      statements: Array<{ items: Array<Item> }>
    }
    const statement = value.statements[0]
    const first = statement?.items[0]
    if (statement === undefined || first === undefined) throw new Error("Minimal fixture lost its first item")
    statement.items.push({ ...first, unit: "unknown" })
    statement.items[0] = { ...first, unit: "unknown" }

    expect(validateSemantics(value).map(({ code, path }) => ({ code, path }))).toEqual([
      { code: "unresolved-reference", path: "/statements/0/items/0/unit" },
      { code: "duplicate-id", path: "/statements/0/items/1/id" },
      { code: "unresolved-reference", path: "/statements/0/items/1/unit" }
    ])
  })

  it("reports every edge in a non-self rollup cycle", () => {
    const errors = validateSemantics(document("fixtures/invalid/cyclic-rollup.json"))
    expect(errors.map(({ code, path }) => ({ code, path }))).toEqual([
      { code: "cyclic-rollup", path: "/statements/0/items/0/rollupTo" },
      { code: "cyclic-rollup", path: "/statements/0/items/1/rollupTo" }
    ])
  })
})

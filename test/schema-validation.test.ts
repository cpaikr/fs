import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { validateSchema } from "../src/validation/schema.js"

const manifest = JSON.parse(readFileSync("fixtures/manifest.json", "utf8")) as {
  readonly invalidDocuments: ReadonlyArray<{
    readonly document: string
    readonly layer: "schema" | "semantic"
    readonly code: string
    readonly path: string
  }>
}

describe("document schema validation", () => {
  it.each(manifest.invalidDocuments.filter((entry) => entry.layer === "schema"))(
    "normalizes $document",
    (entry) => {
      const value = JSON.parse(readFileSync(`fixtures/${entry.document}`, "utf8")) as unknown
      expect(validateSchema(value)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: entry.code, path: entry.path })
        ])
      )
    }
  )

  it("retains and orders independent named and generic errors", () => {
    const value = JSON.parse(readFileSync("examples/minimal.json", "utf8")) as {
      facts: Array<{ value: unknown }>
      statements?: unknown
    }
    value.facts[0] = { value: 1.25 }
    delete value.statements

    expect(validateSchema(value).map(({ code, path }) => ({ code, path }))).toEqual([
      { code: "schema-required", path: "" },
      { code: "schema-required", path: "/facts/0" },
      { code: "schema-required", path: "/facts/0" },
      { code: "schema-required", path: "/facts/0" },
      { code: "decimal-string-required", path: "/facts/0/value" }
    ])
  })
})

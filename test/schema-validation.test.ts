import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { validateSchema } from "../src/validation/schema.js"
import { validateDocument } from "../src/validation/validate.js"

const manifest = JSON.parse(readFileSync("fixtures/manifest.json", "utf8")) as {
  readonly invalidDocuments: ReadonlyArray<{
    readonly document: string
    readonly layer: "schema" | "semantic"
    readonly code: string
    readonly path: string
  }>
}

interface MutableDocument {
  periods: Array<Record<string, unknown>>
  groupingColumns?: Array<string>
  statements: Array<{ items: Array<{ values: Record<string, unknown>; groupings: Record<string, unknown> }> }>
  validationSnapshot?: unknown
}

const minimal = (): MutableDocument =>
  JSON.parse(readFileSync("examples/minimal.json", "utf8")) as MutableDocument

describe("document schema validation", () => {
  it.each(manifest.invalidDocuments.filter((entry) => entry.layer === "schema"))(
    "normalizes $document",
    (entry) => {
      const value = JSON.parse(readFileSync(`fixtures/${entry.document}`, "utf8")) as unknown
      const result = validateDocument(value)
      expect(result.validation.conformance).toEqual({
        status: "nonconforming",
        errors: [expect.objectContaining({ code: entry.code, path: entry.path })]
      })
      expect(result.validation.calculations).toEqual({ status: "not-run", applications: [] })
    }
  )

  it("returns complete deterministic public diagnostics", () => {
    const value = JSON.parse(readFileSync("examples/minimal.json", "utf8")) as {
      scope?: unknown
      statements: Array<{ items: Array<{ values: Record<string, unknown> }> }>
    }
    delete value.scope
    const firstItem = value.statements[0]?.items[0]
    if (firstItem !== undefined) firstItem.values.fy2025 = 1.25

    expect(validateSchema(value).map(({ code, path }) => ({ code, path }))).toEqual([
      { code: "required-property", path: "/scope" },
      { code: "decimal-string-required", path: "/statements/0/items/0/values/fy2025" }
    ])
  })

  it("reports a root type error at the empty JSON Pointer", () => {
    expect(validateSchema(null)).toEqual([
      expect.objectContaining({ code: "invalid-type", path: "" })
    ])
  })

  it("distinguishes well-typed invalid cells from JSON type failures", () => {
    const noncanonicalDecimal = minimal()
    const decimalItem = noncanonicalDecimal.statements[0]?.items[0]
    if (decimalItem === undefined) throw new Error("Minimal fixture lost its first item")
    decimalItem.values.fy2025 = "1.0"
    expect(validateSchema(noncanonicalDecimal)).toEqual([
      expect.objectContaining({ code: "invalid-value", path: "/statements/0/items/0/values/fy2025" })
    ])

    const emptyGrouping = minimal()
    emptyGrouping.groupingColumns = ["category"]
    const groupingItem = emptyGrouping.statements[0]?.items[0]
    if (groupingItem === undefined) throw new Error("Minimal fixture lost its first item")
    groupingItem.groupings.category = ""
    expect(validateSchema(emptyGrouping)).toEqual([
      expect.objectContaining({ code: "invalid-value", path: "/statements/0/items/0/groupings/category" })
    ])

    const malformedUnavailable = minimal()
    const unavailableItem = malformedUnavailable.statements[0]?.items[0]
    if (unavailableItem === undefined) throw new Error("Minimal fixture lost its first item")
    unavailableItem.values.fy2025 = { unavailable: false }
    expect(validateSchema(malformedUnavailable)).toEqual([
      expect.objectContaining({
        code: "invalid-value",
        path: "/statements/0/items/0/values/fy2025/unavailable"
      })
    ])
  })

  it("reports only the selected period variant", () => {
    const value = minimal()
    value.periods[0] = { id: "fy2025", kind: "instant" }
    expect(validateSchema(value)).toEqual([
      expect.objectContaining({ code: "required-property", path: "/periods/0/date" })
    ])
  })

  it("reports only the inconsistent snapshot status field", () => {
    const value = minimal()
    value.validationSnapshot = {
      conformance: "conforming",
      calculations: "not-run",
      applications: []
    }
    expect(validateSchema(value)).toEqual([
      expect.objectContaining({ code: "invalid-value", path: "/validationSnapshot/calculations" })
    ])
  })

  it("leaves document-local value-map exactness to semantic validation", () => {
    const value = minimal()
    const firstItem = value.statements[0]?.items[0]
    if (firstItem === undefined) throw new Error("Minimal fixture lost its first item")
    firstItem.values = {}
    expect(validateSchema(value)).toEqual([])
    expect(validateDocument(value).validation.conformance).toEqual({
      status: "nonconforming",
      errors: [
        expect.objectContaining({ code: "map-key-mismatch", path: "/statements/0/items/0/values" })
      ]
    })
  })
})

import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { decodeJson } from "../src/json.js"
import { inputLimits } from "../src/limits.js"
import { validateSchema } from "../src/validation/schema.js"
import { validateDocument, validateDocumentBounded } from "../src/validation/validate.js"

const manifest = JSON.parse(readFileSync("fixtures/manifest.json", "utf8")) as {
  readonly invalidDocuments: ReadonlyArray<{
    readonly document: string
    readonly layer: "schema" | "semantic"
    readonly code: string
    readonly path: string
  }>
}

interface MutableDocument {
  $schema?: string
  scope?: unknown
  periods: Array<Record<string, unknown>>
  groupingColumns?: Array<string>
  statements: Array<{ items: Array<{ values: Record<string, unknown>; groupings: Record<string, unknown> }> }>
  validationSnapshot?: unknown
}

const minimal = (): MutableDocument =>
  JSON.parse(readFileSync("examples/minimal.json", "utf8")) as MutableDocument

const validateBytesBounded = (bytes: Buffer) => {
  const decoded = decodeJson(bytes)
  if (!decoded.ok) throw new Error("Test input did not cross the JSON boundary")
  return { decoded, validation: validateDocumentBounded(decoded.value, decoded.values) }
}

describe("document schema validation", () => {
  it("accepts only the optional canonical schema discovery pointer", () => {
    const withoutPointer = minimal()
    expect(validateSchema(withoutPointer)).toEqual([])

    const withPointer = minimal()
    withPointer.$schema = "https://cpaikr.github.io/fs/schema/0.1/fs-document.schema.json"
    expect(validateSchema(withPointer)).toEqual([])

    const wrongPointer = minimal()
    wrongPointer.$schema = "https://cpaikr.github.io/fs/schema/0.2/fs-document.schema.json"
    expect(validateSchema(wrongPointer)).toEqual([
      expect.objectContaining({ code: "invalid-value", path: "/$schema" })
    ])
  })

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

  it("bounds complete diagnostics without rejecting large conforming documents", () => {
    const prefix = '{"formatVersion":"0.1","entity":{"name":"x"},"scope":{"label":"x"},"units":[{"id":"u","label":"u","measure":"u","scale":0}],"periods":[{"id":"p","kind":"instant","date":"2024-01-01"}],"statements":[{"id":"s","label":"s","periods":["p"],"items":['
    const suffix = "]}]}"
    const document = (items: number): Buffer =>
      Buffer.from(`${prefix}${Array.from({ length: items }, () => "{}").join(",")}${suffix}`)

    const exact = validateBytesBounded(document(inputLimits.invalidDocumentValues - 24))
    expect(exact.decoded.values).toBe(inputLimits.invalidDocumentValues)
    expect(exact.validation).toMatchObject({
      ok: true,
      result: { validation: { conformance: { status: "nonconforming" } } }
    })

    const excess = validateBytesBounded(document(inputLimits.invalidDocumentValues - 23))
    expect(excess.decoded.values).toBe(inputLimits.invalidDocumentValues + 1)
    expect(excess.validation).toMatchObject({
      ok: false,
      budget: "invalid-document-values",
      limit: inputLimits.invalidDocumentValues
    })

    const largeConforming = validateBytesBounded(
      readFileSync("fixtures/valid/render-column-limit-exceeded.json")
    )
    expect(largeConforming.decoded.values).toBeGreaterThan(inputLimits.invalidDocumentValues)
    expect(largeConforming.validation).toMatchObject({ ok: true })
  })

  it("bounds semantic fanout and encoded diagnostic bytes", () => {
    const semantic = minimal()
    const firstItem = semantic.statements[0]?.items[0]
    if (firstItem === undefined) throw new Error("Minimal fixture lost its first item")
    semantic.statements[0] = {
      ...semantic.statements[0],
      items: Array.from({ length: 40 }, () => ({ ...firstItem }))
    }
    expect(validateBytesBounded(Buffer.from(JSON.stringify(semantic))).validation).toMatchObject({
      ok: false,
      budget: "invalid-document-values",
      limit: inputLimits.invalidDocumentValues
    })

    const withUnknownProperty = (length: number) => ({
      ...minimal(),
      ["x".repeat(length)]: null
    })
    const seedErrors = validateSchema(withUnknownProperty(1))
    const seedBytes = Buffer.byteLength(JSON.stringify(seedErrors), "utf8")
    const exactKeyLength = 1 + inputLimits.validationDiagnosticBytes - seedBytes
    const exactDiagnostic = withUnknownProperty(exactKeyLength)
    expect(Buffer.byteLength(JSON.stringify(validateSchema(exactDiagnostic)), "utf8"))
      .toBe(inputLimits.validationDiagnosticBytes)
    expect(validateDocumentBounded(exactDiagnostic, 0)).toMatchObject({ ok: true })
    expect(validateDocumentBounded(withUnknownProperty(exactKeyLength + 1), 0)).toMatchObject({
      ok: false,
      budget: "validation-diagnostic-bytes",
      limit: inputLimits.validationDiagnosticBytes
    })

    const invalidWithSnapshot = minimal()
    delete invalidWithSnapshot.scope
    invalidWithSnapshot.validationSnapshot = {
      conformance: "conforming",
      calculations: "consistent",
      applications: [{
        key: { statement: "s", parent: "p", period: "p" },
        status: "satisfied",
        actual: "1".repeat(inputLimits.decimalDigits + 1),
        expected: "0",
        difference: "0",
        tolerance: "0"
      }]
    }
    expect(validateBytesBounded(Buffer.from(JSON.stringify(invalidWithSnapshot))).validation).toMatchObject({
      ok: false,
      budget: "decimal-digits",
      limit: inputLimits.decimalDigits
    })
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

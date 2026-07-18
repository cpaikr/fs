import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { decodeJson } from "../src/json.js"
import { recordValidationSnapshot } from "../src/record-validation.js"
import type { ApplicationResult, Document } from "../src/validation/model.js"
import { validateDocument } from "../src/validation/validate.js"

describe("validation snapshot recording", () => {
  it.each([
    [
      "without an existing snapshot",
      "fixtures/valid/no-rollups.json",
      "fixtures/cli/expected/record-validation/no-rollups.json"
    ],
    [
      "while replacing a mismatching snapshot",
      "fixtures/valid/snapshot-mismatch-source.json",
      "fixtures/cli/expected/record-validation/snapshot-mismatch.json"
    ]
  ] as const)("renders exact deterministic bytes %s", (_name, inputPath, expectedPath) => {
    const decoded = decodeJson(readFileSync(resolve(inputPath)))
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    const input = decoded.value as Document
    const before = structuredClone(input)
    const current = validateDocument(input)
    expect(current.validation.conformance.status).toBe("conforming")

    const recorded = recordValidationSnapshot(input, current.validation)

    expect(recorded.bytes).toEqual(readFileSync(resolve(expectedPath)))
    expect(input).toEqual(before)
    expect(Object.keys(recorded.document).at(-1)).toBe("validationSnapshot")
    expect(validateDocument(recorded.document).snapshotDiff.status).toBe("match")
  })

  it("preserves arbitrary parsed top-level member order before the appended snapshot", () => {
    const decoded = decodeJson(readFileSync(resolve("fixtures/valid/no-rollups.json")))
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    const source = decoded.value as Document
    const reordered: Document = {
      statements: source.statements,
      periods: source.periods,
      units: source.units,
      scope: source.scope,
      entity: source.entity,
      formatVersion: source.formatVersion
    }
    const validation = validateDocument(reordered).validation
    expect(validation.conformance.status).toBe("conforming")

    const recorded = recordValidationSnapshot(reordered, validation)
    const expectedOrder = [
      "statements",
      "periods",
      "units",
      "scope",
      "entity",
      "formatVersion",
      "validationSnapshot"
    ]

    expect(Object.keys(recorded.document)).toEqual(expectedOrder)
    expect(Object.keys(JSON.parse(recorded.bytes.toString("utf8")) as object)).toEqual(expectedOrder)
  })

  it("preserves the optional schema pointer in its author-chosen position", () => {
    const source = JSON.parse(readFileSync("examples/manufacturing-group.json", "utf8")) as Document
    if (
      source.$schema === undefined ||
      source.documentId === undefined ||
      source.groupingColumns === undefined
    ) {
      throw new Error("Manufacturing example lost its optional discovery members")
    }
    const input: Document = {
      formatVersion: source.formatVersion,
      documentId: source.documentId,
      entity: source.entity,
      $schema: source.$schema,
      scope: source.scope,
      units: source.units,
      periods: source.periods,
      groupingColumns: source.groupingColumns,
      statements: source.statements
    }
    const validation = validateDocument(input).validation
    const recorded = recordValidationSnapshot(input, validation)
    const expectedOrder = [
      "formatVersion",
      "documentId",
      "entity",
      "$schema",
      "scope",
      "units",
      "periods",
      "groupingColumns",
      "statements",
      "validationSnapshot"
    ]

    expect(recorded.document.$schema).toBe(
      "https://cpaikr.github.io/fs/schema/0.1/fs-document.schema.json"
    )
    expect(Object.keys(recorded.document)).toEqual(expectedOrder)
    expect(Object.keys(JSON.parse(recorded.bytes.toString("utf8")) as object)).toEqual(expectedOrder)
    expect(validateDocument(recorded.document).snapshotDiff.status).toBe("match")
  })

  it("does not retain a mutable alias to refined application arrays", () => {
    const input = JSON.parse(readFileSync("examples/manufacturing-group.json", "utf8")) as Document
    const validation = validateDocument(input).validation
    const recorded = recordValidationSnapshot(input, validation)
    const snapshot = structuredClone(recorded.document.validationSnapshot)

    const sourceApplications = validation.calculations.applications as unknown as Array<ApplicationResult>
    sourceApplications.splice(0)

    expect(recorded.document.validationSnapshot).toEqual(snapshot)
  })
})

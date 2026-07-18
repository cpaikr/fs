import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import {
  inconsistentApplications,
  type ApplicationResult,
  type Document,
  type ValidationSnapshot
} from "../src/validation/model.js"
import { compareSnapshot, type ValidationResult } from "../src/validation/snapshot.js"
import { validateDocument } from "../src/validation/validate.js"

const document = (path: string): Document =>
  JSON.parse(readFileSync(path, "utf8")) as Document

describe("snapshot comparison", () => {
  it.each([
    ["fixtures/valid/no-rollups.json", "fixtures/snapshot-diffs/not-recorded.json"],
    ["fixtures/valid/recorded-snapshot.json", "fixtures/snapshot-diffs/match.json"],
    ["fixtures/valid/snapshot-mismatch-source.json", "fixtures/snapshot-diffs/mismatch.json"],
    ["fixtures/invalid/duplicate-snapshot-application-key.json", "fixtures/snapshot-diffs/invalid-snapshot.json"],
    [
      "fixtures/cli/expected/record-validation/snapshot-mismatch.json",
      "fixtures/snapshot-diffs/recorded-snapshot-mismatch.json"
    ]
  ] as const)("matches %s", (documentPath, expectedPath) => {
    expect(validateDocument(document(documentPath)).snapshotDiff).toEqual(
      JSON.parse(readFileSync(expectedPath, "utf8")) as unknown
    )
  })

  it("orders current additions before recorded removals", () => {
    const expected = JSON.parse(readFileSync("fixtures/snapshot-diffs/application-set-changes.json", "utf8")) as {
      readonly applications: ReadonlyArray<
        | { readonly change: "added"; readonly current: ApplicationResult }
        | { readonly change: "removed"; readonly recorded: ApplicationResult }
      >
    }
    const added = expected.applications.find(
      (change): change is { readonly change: "added"; readonly current: ApplicationResult } =>
        change.change === "added"
    )
    const removed = expected.applications.find(
      (change): change is { readonly change: "removed"; readonly recorded: ApplicationResult } =>
        change.change === "removed"
    )
    if (added === undefined || removed === undefined) throw new Error("Application-set fixture lost a change")
    if (removed.recorded.status !== "satisfied") throw new Error("Recorded removal must be satisfied")

    const snapshot: ValidationSnapshot = {
      conformance: "conforming",
      calculations: "consistent",
      applications: [removed.recorded]
    }
    const inconsistent = inconsistentApplications([added.current])
    if (inconsistent === undefined) throw new Error("Added application must be inconsistent")
    const current: ValidationResult = {
      formatVersion: "0.1",
      conformance: { status: "conforming", errors: [] },
      calculations: { status: "inconsistent", applications: inconsistent }
    }
    expect(compareSnapshot(snapshot, current)).toEqual(expected)
  })

  it("does not traverse a schema-invalid snapshot", () => {
    const value = JSON.parse(readFileSync("examples/minimal.json", "utf8")) as Record<string, unknown>
    value.validationSnapshot = {}

    const result = validateDocument(value)
    expect(result.validation.conformance.status).toBe("nonconforming")
    expect(result.snapshotDiff).toEqual({
      formatVersion: "0.1",
      status: "not-comparable",
      reason: "invalid-snapshot"
    })
  })

  it("compares a valid snapshot when an unrelated property shares its name prefix", () => {
    const result = validateDocument(
      document("fixtures/invalid/validation-snapshot-prefix-property.json")
    )
    expect(result.validation.conformance).toEqual({
      status: "nonconforming",
      errors: [
        expect.objectContaining({
          code: "unknown-property",
          path: "/validationSnapshotExtra"
        })
      ]
    })
    expect(result.snapshotDiff).toMatchObject({
      status: "mismatch",
      conformance: { recorded: "conforming", current: "nonconforming" },
      calculations: { recorded: "consistent", current: "not-run" },
      applications: [{ change: "removed" }]
    })
  })

  it("rejects contradictory numeric snapshot applications as structural nonconformance", () => {
    for (const application of [
      { status: "unsatisfied", difference: "999" },
      { status: "satisfied", difference: "-1" }
    ] as const) {
      const value = JSON.parse(readFileSync("examples/minimal.json", "utf8")) as Record<string, unknown>
      value.validationSnapshot = {
        conformance: "conforming",
        calculations: application.status === "satisfied" ? "consistent" : "inconsistent",
        applications: [
          {
            key: { statement: "historical", parent: "total", period: "historical" },
            status: application.status,
            actual: "1",
            expected: "2",
            difference: application.difference,
            tolerance: "0"
          }
        ]
      }

      const result = validateDocument(value)
      expect(result.validation.conformance).toEqual({
        status: "nonconforming",
        errors: [
          expect.objectContaining({
            code: "invalid-value",
            path: "/validationSnapshot/applications/0"
          })
        ]
      })
      expect(result.validation.calculations).toEqual({ status: "not-run", applications: [] })
      expect(result.snapshotDiff).toEqual({
        formatVersion: "0.1",
        status: "not-comparable",
        reason: "invalid-snapshot"
      })
    }
  })
})

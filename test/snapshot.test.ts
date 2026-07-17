import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import type { Document } from "../src/validation/model.js"
import { validateDocument } from "../src/validation/validate.js"

const document = (path: string): Document =>
  JSON.parse(readFileSync(path, "utf8")) as Document

describe("snapshot comparison", () => {
  it.each([
    ["fixtures/valid/no-calculation-rules.json", "fixtures/snapshot-diffs/not-recorded.json"],
    ["fixtures/valid/recorded-snapshot.json", "fixtures/snapshot-diffs/match.json"],
    ["fixtures/valid/snapshot-mismatch-source.json", "fixtures/snapshot-diffs/mismatch.json"],
    ["fixtures/invalid/duplicate-snapshot-application-key.json", "fixtures/snapshot-diffs/invalid-snapshot.json"]
  ] as const)("matches %s", (documentPath, expectedPath) => {
    expect(validateDocument(document(documentPath)).snapshotDiff).toEqual(
      JSON.parse(readFileSync(expectedPath, "utf8")) as unknown
    )
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

  it("rejects a contradictory numeric snapshot application", () => {
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
            key: { rule: "historical-rule", period: "historical-period", dimensions: {} },
            status: application.status,
            actual: "1",
            expected: "2",
            difference: application.difference,
            tolerance: "0"
          }
        ]
      }

      const result = validateDocument(value)
      expect(result.validation.conformance).toMatchObject({
        status: "nonconforming",
        errors: expect.arrayContaining([
          expect.objectContaining({ code: "invalid-snapshot", path: "/validationSnapshot" })
        ])
      })
      expect(result.snapshotDiff).toEqual({
        formatVersion: "0.1",
        status: "not-comparable",
        reason: "invalid-snapshot"
      })
    }
  })
})

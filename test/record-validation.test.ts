import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { decodeJson } from "../src/json.js"
import { recordValidationSnapshot } from "../src/record-validation.js"
import type { Document } from "../src/validation/model.js"
import { validateDocument } from "../src/validation/validate.js"

describe("validation snapshot recording", () => {
  it.each([
    [
      "without an existing snapshot",
      "fixtures/valid/no-calculation-rules.json",
      "fixtures/cli/expected/record-validation/no-rules.json"
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
})

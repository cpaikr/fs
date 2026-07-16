import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { calculate, nextGregorianDay } from "../src/validation/calculate.js"
import { Decimal } from "../src/validation/decimal.js"
import type { Document } from "../src/validation/model.js"

const cases = [
  ["examples/minimal.json", "fixtures/calculation-results/no-rules.json"],
  ["examples/manufacturing-group.json", "fixtures/calculation-results/manufacturing-group.json"],
  ["fixtures/valid/no-calculation-rules.json", "fixtures/calculation-results/no-rules.json"],
  ["fixtures/valid/all-rules-skipped.json", "fixtures/calculation-results/all-skipped.json"],
  ["fixtures/valid/calculation-errors.json", "fixtures/calculation-results/required-fact-errors.json"],
  ["fixtures/valid/exact-arithmetic.json", "fixtures/calculation-results/exact-arithmetic.json"],
  ["fixtures/valid/recorded-snapshot.json", "fixtures/calculation-results/recorded-snapshot-current.json"],
  ["fixtures/valid/scale-boundaries.json", "fixtures/calculation-results/no-rules.json"],
  ["fixtures/valid/snapshot-mismatch-source.json", "fixtures/calculation-results/snapshot-mismatch-current.json"]
] as const

describe("exact decimal", () => {
  it("normalizes exact arithmetic without binary conversion", () => {
    expect(Decimal.parse("-1.5").subtract(Decimal.parse("-1")).toString()).toBe("-0.5")
    expect(Decimal.parse("0.10").multiply(Decimal.parse("10")).toString()).toBe("1")
  })
})

describe("Gregorian binding", () => {
  it("handles early years and leap-century boundaries without Date remapping", () => {
    expect(nextGregorianDay("0099-12-31")).toBe("0100-01-01")
    expect(nextGregorianDay("1900-02-28")).toBe("1900-03-01")
    expect(nextGregorianDay("2000-02-28")).toBe("2000-02-29")
    expect(nextGregorianDay("2000-02-29")).toBe("2000-03-01")
  })
})

describe("calculation evaluation", () => {
  it.each(cases)("matches %s", (documentPath, expectedPath) => {
    const document = JSON.parse(readFileSync(documentPath, "utf8")) as Document
    const expected = JSON.parse(readFileSync(expectedPath, "utf8")) as {
      readonly calculations: unknown
    }
    expect(calculate(document)).toEqual(expected.calculations)
  })
})

import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { calculate } from "../src/validation/calculate.js"
import { Decimal } from "../src/validation/decimal.js"
import type { Document } from "../src/validation/model.js"
import { validateDocument } from "../src/validation/validate.js"

const cases = [
  ["examples/minimal.json", "fixtures/calculation-results/no-rollups.json"],
  ["examples/manufacturing-group.json", "fixtures/calculation-results/manufacturing-group.json"],
  ["fixtures/valid/no-rollups.json", "fixtures/calculation-results/no-rollups.json"],
  ["fixtures/valid/rollup-cell-errors.json", "fixtures/calculation-results/rollup-cell-errors.json"],
  ["fixtures/valid/exact-arithmetic.json", "fixtures/calculation-results/exact-arithmetic.json"],
  ["fixtures/valid/recorded-snapshot.json", "fixtures/calculation-results/recorded-snapshot-current.json"],
  ["fixtures/valid/scale-boundaries.json", "fixtures/calculation-results/no-rollups.json"],
  ["fixtures/valid/snapshot-mismatch-source.json", "fixtures/calculation-results/snapshot-mismatch-current.json"],
  ["fixtures/valid/statement-local-rollups.json", "fixtures/calculation-results/statement-local-rollups.json"]
] as const

describe("exact decimal", () => {
  it("normalizes exact arithmetic without binary conversion", () => {
    expect(Decimal.parse("-1.5").subtract(Decimal.parse("-1")).toString()).toBe("-0.5")
    expect(Decimal.parse("0.10").multiply(Decimal.parse("10")).toString()).toBe("1")
  })
})

describe("rollup evaluation", () => {
  it.each(cases)("matches %s", (documentPath, expectedPath) => {
    const document = JSON.parse(readFileSync(documentPath, "utf8")) as Document
    const expected = JSON.parse(readFileSync(expectedPath, "utf8")) as { readonly calculations: unknown }
    expect(calculate(document)).toEqual(expected.calculations)
    expect(validateDocument(document).validation).toEqual(expected)
  })

  it("orders parents by item order and evaluates only direct children", () => {
    const document = JSON.parse(readFileSync("fixtures/valid/exact-arithmetic.json", "utf8")) as Document
    expect(calculate(document).applications.map(({ key }) => key.parent)).toEqual([
      "subtotal",
      "grand-total"
    ])
  })
})

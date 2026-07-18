import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { calculate } from "../src/validation/calculate.js"
import { Decimal } from "../src/validation/decimal.js"
import type { Document } from "../src/validation/model.js"
import { inputLimits } from "../src/limits.js"
import { validateDocument, validateDocumentBounded } from "../src/validation/validate.js"

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
  })

  it("aggregates high-scale cancellation independently of author order", () => {
    const small = Decimal.parse(`0.${"0".repeat(inputLimits.decimalDigits - 2)}1`)
    const values = [Decimal.parse("1"), small, small.subtract(small).subtract(small)]
    expect(Decimal.sum(values).toString()).toBe("1")
    expect(Decimal.sum(values.toReversed()).toString()).toBe("1")
    expect(Decimal.parse(`1.${"0".repeat(inputLimits.decimalDigits)}`).toString()).toBe("1")
  })

  it("enforces per-decimal and aggregate budgets after schema conformance", () => {
    const document = JSON.parse(readFileSync("examples/minimal.json", "utf8")) as Document
    const exact = `1${"0".repeat(inputLimits.decimalDigits - 1)}`
    const statement = document.statements[0]
    const item = statement?.items[0]
    if (statement === undefined || item === undefined) throw new Error("Minimal fixture lost its value")

    const atPerDecimalLimit = {
      ...document,
      statements: [{ ...statement, items: [{ ...item, values: { fy2025: exact } }] }]
    }
    expect(validateDocumentBounded(atPerDecimalLimit)).toMatchObject({ ok: true })
    expect(validateDocumentBounded({
      ...atPerDecimalLimit,
      statements: [{
        ...statement,
        items: [{ ...item, values: { fy2025: `${exact}0` } }]
      }]
    })).toMatchObject({
      ok: false,
      budget: "decimal-digits",
      limit: inputLimits.decimalDigits
    })

    const application = {
      key: { statement: "statement", parent: "cash", period: "fy2025" },
      status: "satisfied",
      actual: exact,
      expected: exact,
      difference: "0",
      tolerance: exact
    }
    const applications = Array.from({ length: 333 }, () => application)
    const aggregateDocument = {
      ...document,
      units: [{
        ...document.units[0],
        defaultTolerance: `1${"0".repeat(665)}`
      }],
      validationSnapshot: {
        conformance: "conforming",
        calculations: "consistent",
        applications
      }
    }
    expect(validateDocumentBounded(aggregateDocument)).toMatchObject({ ok: true })
    expect(validateDocumentBounded({
      ...aggregateDocument,
      units: [{
        ...document.units[0],
        defaultTolerance: `1${"0".repeat(666)}`
      }]
    })).toMatchObject({
      ok: false,
      budget: "total-decimal-digits",
      limit: inputLimits.totalDecimalDigits
    })
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

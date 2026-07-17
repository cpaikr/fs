import { Decimal } from "./decimal.js"
import type { ApplicationKey, ApplicationResult, Document, Item, Unit, ValueCell } from "./model.js"

export interface CalculationResult {
  readonly status: "not-defined" | "consistent" | "inconsistent"
  readonly applications: ReadonlyArray<ApplicationResult>
}

const key = (statement: string, parent: string, period: string): ApplicationKey => ({
  statement,
  parent,
  period
})

const isUnavailable = (cell: ValueCell): cell is { readonly unavailable: true } =>
  typeof cell === "object" && cell !== null

const cellFailure = (
  applicationKey: ApplicationKey,
  statement: string,
  item: Item,
  period: string
): ApplicationResult | undefined => {
  const cell = item.values[period]
  if (cell === null || cell === undefined) {
    return {
      key: applicationKey,
      status: "error",
      reason: "missing-value",
      cell: { statement, item: item.id, period }
    }
  }
  if (isUnavailable(cell)) {
    return {
      key: applicationKey,
      status: "error",
      reason: "unavailable-value",
      cell: { statement, item: item.id, period }
    }
  }
  return undefined
}

const toleranceFor = (parent: Item, units: ReadonlyMap<string, Unit>): string =>
  units.get(parent.unit)?.defaultTolerance ?? "0"

const evaluate = (
  statement: string,
  parent: Item,
  children: ReadonlyArray<Item>,
  period: string,
  units: ReadonlyMap<string, Unit>
): ApplicationResult => {
  const applicationKey = key(statement, parent.id, period)
  const parentFailure = cellFailure(applicationKey, statement, parent, period)
  if (parentFailure !== undefined) return parentFailure
  for (const child of children) {
    const failure = cellFailure(applicationKey, statement, child, period)
    if (failure !== undefined) return failure
  }

  const parentValue = parent.values[period]
  if (typeof parentValue !== "string") throw new Error("Validated parent cell lost its decimal value")
  let expected = Decimal.zero()
  for (const child of children) {
    const value = child.values[period]
    if (typeof value !== "string") throw new Error("Validated child cell lost its decimal value")
    expected = expected.add(Decimal.parse(value))
  }
  const actual = Decimal.parse(parentValue)
  const difference = actual.subtract(expected)
  const tolerance = Decimal.parse(toleranceFor(parent, units))
  return {
    key: applicationKey,
    status: difference.absolute().lessThanOrEqual(tolerance) ? "satisfied" : "unsatisfied",
    actual: actual.toString(),
    expected: expected.toString(),
    difference: difference.toString(),
    tolerance: tolerance.toString()
  }
}

export const calculate = (document: Document): CalculationResult => {
  const units = new Map(document.units.map((unit) => [unit.id, unit]))
  const applications: Array<ApplicationResult> = []

  for (const statement of document.statements) {
    const childrenByParent = new Map<string, Array<Item>>()
    for (const item of statement.items) {
      if (item.rollupTo === undefined) continue
      const children = childrenByParent.get(item.rollupTo) ?? []
      children.push(item)
      childrenByParent.set(item.rollupTo, children)
    }
    for (const parent of statement.items) {
      const children = childrenByParent.get(parent.id)
      if (children === undefined) continue
      for (const period of statement.periods) {
        applications.push(evaluate(statement.id, parent, children, period, units))
      }
    }
  }

  if (applications.length === 0) return { status: "not-defined", applications }
  return {
    status: applications.some(({ status }) => status === "unsatisfied" || status === "error")
      ? "inconsistent"
      : "consistent",
    applications
  }
}

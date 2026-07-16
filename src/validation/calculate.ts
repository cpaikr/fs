import { Decimal } from "./decimal.js"
import { coordinateKey } from "./identity.js"
import type {
  ApplicationKey,
  ApplicationResult,
  CalculationRule,
  Coordinate,
  Dimensions,
  Document,
  Fact,
  Period,
  Unit
} from "./model.js"

export interface CalculationResult {
  readonly status: "not-defined" | "not-evaluated" | "consistent" | "inconsistent"
  readonly applications: ReadonlyArray<ApplicationResult>
}

const complete = (coordinate: Coordinate): Required<Coordinate> => ({
  item: coordinate.item,
  period: coordinate.period,
  unit: coordinate.unit,
  dimensions: coordinate.dimensions ?? {}
})

const leapYear = (year: number): boolean => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)

export const nextGregorianDay = (value: string): string => {
  let [year = 0, month = 0, day = 0] = value.split("-").map(Number)
  const days = [31, leapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  day += 1
  if (day > (days[month - 1] ?? 0)) {
    day = 1
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
}

const application = (rule: string, period: string, dimensions: Dimensions): ApplicationKey => ({
  rule,
  period,
  dimensions
})

const factFailure = (
  key: ApplicationKey,
  coordinate: Coordinate,
  facts: ReadonlyMap<string, Fact>
): ApplicationResult | null => {
  const fact = facts.get(coordinateKey(coordinate))
  if (fact === undefined) return { key, status: "error", reason: "missing-fact", coordinate: complete(coordinate) }
  if (fact.unavailable === true) {
    return { key, status: "error", reason: "unavailable-fact", coordinate: complete(coordinate) }
  }
  return null
}

const toleranceFor = (
  rule: CalculationRule,
  unitId: string,
  units: ReadonlyMap<string, Unit>
): string => rule.tolerance ?? units.get(unitId)?.defaultTolerance ?? "0"

const evaluate = (
  key: ApplicationKey,
  target: Coordinate,
  terms: ReadonlyArray<{ readonly coefficient: string; readonly coordinate: Coordinate }>,
  tolerance: string,
  facts: ReadonlyMap<string, Fact>
): ApplicationResult => {
  const targetFailure = factFailure(key, target, facts)
  if (targetFailure !== null) return targetFailure
  for (const term of terms) {
    const failure = factFailure(key, term.coordinate, facts)
    if (failure !== null) return failure
  }

  const targetFact = facts.get(coordinateKey(target))
  if (targetFact?.value === undefined) throw new Error("Validated target fact lost its value")
  let expected = Decimal.zero()
  for (const term of terms) {
    const fact = facts.get(coordinateKey(term.coordinate))
    if (fact?.value === undefined) throw new Error("Validated operand fact lost its value")
    expected = expected.add(Decimal.parse(term.coefficient).multiply(Decimal.parse(fact.value)))
  }
  const actual = Decimal.parse(targetFact.value)
  const difference = actual.subtract(expected)
  return {
    key,
    status: difference.absolute().lessThanOrEqual(Decimal.parse(tolerance)) ? "satisfied" : "unsatisfied",
    actual: actual.toString(),
    expected: expected.toString(),
    difference: difference.toString(),
    tolerance: Decimal.parse(tolerance).toString()
  }
}

const scopedDimensions = (rule: Exclude<CalculationRule, { readonly kind: "assertion" }>): ReadonlyArray<Dimensions> =>
  rule.scope.dimensions ?? [{}]

const samePeriodApplications = (
  rule: Extract<CalculationRule, { readonly kind: "samePeriod" }>,
  facts: ReadonlyMap<string, Fact>,
  units: ReadonlyMap<string, Unit>
): ReadonlyArray<ApplicationResult> => {
  const results: Array<ApplicationResult> = []
  for (const period of rule.scope.periods) {
    for (const dimensions of scopedDimensions(rule)) {
      const key = application(rule.id, period, dimensions)
      results.push(
        evaluate(
          key,
          { item: rule.target.item, period, unit: rule.unit, dimensions },
          rule.terms.map((term) => ({
            coefficient: term.coefficient,
            coordinate: { item: term.item, period, unit: rule.unit, dimensions }
          })),
          toleranceFor(rule, rule.unit, units),
          facts
        )
      )
    }
  }
  return results
}

const assertionApplications = (
  rule: Extract<CalculationRule, { readonly kind: "assertion" }>,
  facts: ReadonlyMap<string, Fact>,
  units: ReadonlyMap<string, Unit>
): ReadonlyArray<ApplicationResult> => {
  const dimensions = rule.target.dimensions ?? {}
  return [
    evaluate(
      application(rule.id, rule.target.period, dimensions),
      { ...rule.target, dimensions },
      rule.terms.map((term) => ({ coefficient: term.coefficient, coordinate: term.fact })),
      toleranceFor(rule, rule.target.unit, units),
      facts
    )
  ]
}

const duration = (period: Period | undefined): Extract<Period, { readonly kind: "duration" }> => {
  if (period?.kind !== "duration") throw new Error("Validated roll-forward scope lost a duration")
  return period
}

const rollForwardApplications = (
  rule: Extract<CalculationRule, { readonly kind: "rollForward" }>,
  facts: ReadonlyMap<string, Fact>,
  units: ReadonlyMap<string, Unit>,
  periods: ReadonlyMap<string, Period>
): ReadonlyArray<ApplicationResult> => {
  const results: Array<ApplicationResult> = []
  const scoped = rule.scope.periods.map((period) => duration(periods.get(period)))
  const instants = [...periods.values()].filter(
    (period): period is Extract<Period, { readonly kind: "instant" }> => period.kind === "instant"
  )
  for (const current of scoped) {
    const candidates = scoped.filter((candidate) => nextGregorianDay(candidate.end) === current.start)
    const reason = candidates.length > 1
      ? "ambiguous-predecessor"
      : candidates.length === 0
        ? scoped.some((candidate) => candidate.end < current.start)
          ? "gap"
          : "no-predecessor"
        : null
    for (const dimensions of scopedDimensions(rule)) {
      const key = application(rule.id, current.id, dimensions)
      if (reason !== null) {
        results.push({ key, status: "skipped", reason })
        continue
      }
      const predecessor = candidates[0]
      if (predecessor === undefined) throw new Error("Unique predecessor disappeared")
      const openingPeriod = instants.find((period) => period.date === predecessor.end)
      if (openingPeriod === undefined) {
        results.push({
          key,
          status: "error",
          reason: "missing-boundary-period",
          boundary: "opening",
          date: predecessor.end
        })
        continue
      }
      const closingPeriod = instants.find((period) => period.date === current.end)
      if (closingPeriod === undefined) {
        results.push({
          key,
          status: "error",
          reason: "missing-boundary-period",
          boundary: "closing",
          date: current.end
        })
        continue
      }
      const target = { item: rule.balance.item, period: closingPeriod.id, unit: rule.unit, dimensions }
      const terms = [
        {
          coefficient: "1",
          coordinate: { item: rule.balance.item, period: openingPeriod.id, unit: rule.unit, dimensions }
        },
        ...rule.movements.map((term) => ({
          coefficient: term.coefficient,
          coordinate: { item: term.item, period: current.id, unit: rule.unit, dimensions }
        }))
      ]
      results.push(evaluate(key, target, terms, toleranceFor(rule, rule.unit, units), facts))
    }
  }
  return results
}

export const calculate = (document: Document): CalculationResult => {
  const rules = document.calculationRules ?? []
  if (rules.length === 0) return { status: "not-defined", applications: [] }
  const facts = new Map((document.facts ?? []).map((fact) => [coordinateKey(fact), fact]))
  const units = new Map((document.units ?? []).map((unit) => [unit.id, unit]))
  const periods = new Map((document.periods ?? []).map((period) => [period.id, period]))
  const applications = rules.flatMap((rule) => {
    if (rule.kind === "samePeriod") return samePeriodApplications(rule, facts, units)
    if (rule.kind === "assertion") return assertionApplications(rule, facts, units)
    return rollForwardApplications(rule, facts, units, periods)
  })
  const status = applications.every((result) => result.status === "skipped")
    ? "not-evaluated"
    : applications.some((result) => result.status === "unsatisfied" || result.status === "error")
      ? "inconsistent"
      : "consistent"
  return { status, applications }
}

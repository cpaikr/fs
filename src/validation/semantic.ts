import { applicationKey, compareDiagnostics, coordinateKey } from "./identity.js"
import type { Coordinate, Dimension, Dimensions, Document, Period } from "./model.js"
import type { StructuralError } from "./schema.js"
import { isSnapshotValid } from "./snapshot.js"

const diagnostic = (code: string, path: string): StructuralError => ({
  code,
  path,
  message: `The document violates the ${code} constraint.`
})

const isLeapYear = (year: number): boolean => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)

const isGregorianDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value)
  if (match === null) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return month >= 1 && month <= 12 && day >= 1 && day <= (days[month - 1] ?? 0)
}

const duplicateDefinitions = (
  definitions: ReadonlyArray<{ readonly id: string }>,
  basePath: string,
  errors: Array<StructuralError>
): void => {
  const ids = new Set<string>()
  definitions.forEach((definition, index) => {
    if (ids.has(definition.id)) errors.push(diagnostic("duplicate-id", `${basePath}/${index}/id`))
    ids.add(definition.id)
  })
}

const reference = (
  registry: ReadonlySet<string>,
  value: string,
  path: string,
  errors: Array<StructuralError>
): void => {
  if (!registry.has(value)) errors.push(diagnostic("unresolved-reference", path))
}

const validateDimensions = (
  dimensions: Dimensions | undefined,
  path: string,
  dimensionMap: ReadonlyMap<string, Dimension>,
  errors: Array<StructuralError>
): void => {
  for (const [dimensionId, memberId] of Object.entries(dimensions ?? {})) {
    const dimension = dimensionMap.get(dimensionId)
    if (dimension === undefined) {
      errors.push(diagnostic("unresolved-reference", `${path}/${dimensionId}`))
    } else if (!dimension.members.some((member) => member.id === memberId)) {
      errors.push(diagnostic("unresolved-reference", `${path}/${dimensionId}`))
    }
  }
}

const validateCoordinate = (
  coordinate: Coordinate,
  path: string,
  items: ReadonlySet<string>,
  periods: ReadonlySet<string>,
  units: ReadonlySet<string>,
  dimensions: ReadonlyMap<string, Dimension>,
  errors: Array<StructuralError>
): void => {
  reference(items, coordinate.item, `${path}/item`, errors)
  reference(periods, coordinate.period, `${path}/period`, errors)
  reference(units, coordinate.unit, `${path}/unit`, errors)
  validateDimensions(coordinate.dimensions, `${path}/dimensions`, dimensions, errors)
}

const periodDefinitionKey = (period: Period): string =>
  period.kind === "instant" ? `instant:${period.date}` : `duration:${period.start}:${period.end}`

export const validateSemantics = (document: Document): ReadonlyArray<StructuralError> => {
  const errors: Array<StructuralError> = []
  const itemDefinitions = document.items ?? []
  const unitDefinitions = document.units ?? []
  const periodDefinitions = document.periods ?? []
  const dimensionDefinitions = document.dimensions ?? []
  const facts = document.facts ?? []
  const rules = document.calculationRules ?? []

  duplicateDefinitions(itemDefinitions, "/items", errors)
  duplicateDefinitions(unitDefinitions, "/units", errors)
  duplicateDefinitions(periodDefinitions, "/periods", errors)
  duplicateDefinitions(dimensionDefinitions, "/dimensions", errors)
  dimensionDefinitions.forEach((dimension, index) =>
    duplicateDefinitions(dimension.members, `/dimensions/${index}/members`, errors)
  )
  duplicateDefinitions(document.statements, "/statements", errors)
  duplicateDefinitions(rules, "/calculationRules", errors)

  const items = new Set(itemDefinitions.map((definition) => definition.id))
  const units = new Set(unitDefinitions.map((definition) => definition.id))
  const periods = new Set(periodDefinitions.map((definition) => definition.id))
  const dimensions = new Map(dimensionDefinitions.map((definition) => [definition.id, definition]))
  const periodMap = new Map(periodDefinitions.map((period) => [period.id, period]))

  const periodValues = new Set<string>()
  periodDefinitions.forEach((period, index) => {
    if (period.kind === "instant") {
      if (!isGregorianDate(period.date)) errors.push(diagnostic("invalid-date", `/periods/${index}/date`))
    } else {
      if (!isGregorianDate(period.start)) errors.push(diagnostic("invalid-date", `/periods/${index}/start`))
      if (!isGregorianDate(period.end)) errors.push(diagnostic("invalid-date", `/periods/${index}/end`))
      if (period.start > period.end) errors.push(diagnostic("invalid-duration", `/periods/${index}`))
    }
    const key = periodDefinitionKey(period)
    if (periodValues.has(key)) errors.push(diagnostic("duplicate-period-definition", `/periods/${index}`))
    periodValues.add(key)
  })

  const factCoordinates = new Set<string>()
  facts.forEach((fact, index) => {
    validateCoordinate(fact, `/facts/${index}`, items, periods, units, dimensions, errors)
    const key = coordinateKey(fact)
    if (factCoordinates.has(key)) errors.push(diagnostic("duplicate-fact-coordinate", `/facts/${index}`))
    factCoordinates.add(key)
  })

  document.statements.forEach((statement, statementIndex) => {
    reference(units, statement.unit, `/statements/${statementIndex}/unit`, errors)
    statement.periods.forEach((period, index) =>
      reference(periods, period, `/statements/${statementIndex}/periods/${index}`, errors)
    )
    const axes = new Set<string>()
    statement.dimensions?.forEach((axis, axisIndex) => {
      if (axes.has(axis.dimension)) {
        errors.push(
          diagnostic("duplicate-statement-axis", `/statements/${statementIndex}/dimensions/${axisIndex}/dimension`)
        )
      }
      axes.add(axis.dimension)
      const dimension = dimensions.get(axis.dimension)
      if (dimension === undefined) {
        errors.push(
          diagnostic("unresolved-reference", `/statements/${statementIndex}/dimensions/${axisIndex}/dimension`)
        )
      } else {
        axis.members.forEach((member, memberIndex) => {
          if (!dimension.members.some((candidate) => candidate.id === member)) {
            errors.push(
              diagnostic(
                "unresolved-reference",
                `/statements/${statementIndex}/dimensions/${axisIndex}/members/${memberIndex}`
              )
            )
          }
        })
      }
    })
    statement.entries.forEach((entry, entryIndex) => {
      if (entry.type === "item") {
        reference(items, entry.item, `/statements/${statementIndex}/entries/${entryIndex}/item`, errors)
      }
    })
  })

  rules.forEach((rule, ruleIndex) => {
    if (rule.kind === "assertion") {
      validateCoordinate(rule.target, `/calculationRules/${ruleIndex}/target`, items, periods, units, dimensions, errors)
      rule.terms.forEach((term, termIndex) => {
        validateCoordinate(
          term.fact,
          `/calculationRules/${ruleIndex}/terms/${termIndex}/fact`,
          items,
          periods,
          units,
          dimensions,
          errors
        )
        if (term.fact.unit !== rule.target.unit) {
          errors.push(diagnostic("unit-mismatch", `/calculationRules/${ruleIndex}/terms/${termIndex}/fact/unit`))
        }
      })
      return
    }

    reference(units, rule.unit, `/calculationRules/${ruleIndex}/unit`, errors)
    reference(
      items,
      rule.kind === "samePeriod" ? rule.target.item : rule.balance.item,
      `/calculationRules/${ruleIndex}/${rule.kind === "samePeriod" ? "target" : "balance"}/item`,
      errors
    )
    const terms = rule.kind === "samePeriod" ? rule.terms : rule.movements
    const termName = rule.kind === "samePeriod" ? "terms" : "movements"
    terms.forEach((term, termIndex) =>
      reference(items, term.item, `/calculationRules/${ruleIndex}/${termName}/${termIndex}/item`, errors)
    )
    rule.scope.periods.forEach((periodId, periodIndex) => {
      reference(periods, periodId, `/calculationRules/${ruleIndex}/scope/periods/${periodIndex}`, errors)
      if (rule.kind === "rollForward" && periodMap.get(periodId)?.kind !== "duration") {
        errors.push(diagnostic("invalid-period-kind", `/calculationRules/${ruleIndex}/scope/periods/${periodIndex}`))
      }
    })
    rule.scope.dimensions?.forEach((coordinate, coordinateIndex) =>
      validateDimensions(
        coordinate,
        `/calculationRules/${ruleIndex}/scope/dimensions/${coordinateIndex}`,
        dimensions,
        errors
      )
    )
  })

  const snapshotKeys = new Set<string>()
  document.validationSnapshot?.applications.forEach((application, index) => {
    const key = applicationKey(application.key)
    if (snapshotKeys.has(key)) {
      errors.push(diagnostic("duplicate-application-key", `/validationSnapshot/applications/${index}/key`))
    }
    snapshotKeys.add(key)
  })
  if (
    document.validationSnapshot !== undefined &&
    snapshotKeys.size === document.validationSnapshot.applications.length &&
    !isSnapshotValid(document.validationSnapshot)
  ) {
    errors.push(diagnostic("invalid-snapshot", "/validationSnapshot"))
  }

  return errors.sort(compareDiagnostics)
}

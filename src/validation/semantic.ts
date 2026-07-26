import { applicationKey, compareDiagnostics } from "./identity.js"
import type { Document, Period } from "./model.js"
import type { StructuralError } from "./schema.js"
import { isApplicationValid } from "./snapshot.js"

type AddDiagnostic = (error: StructuralError) => void

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
  add: AddDiagnostic
): void => {
  const ids = new Set<string>()
  definitions.forEach((definition, index) => {
    if (ids.has(definition.id)) add(diagnostic("duplicate-id", `${basePath}/${index}/id`))
    ids.add(definition.id)
  })
}

const duplicateReferences = (
  references: ReadonlyArray<string>,
  basePath: string,
  add: AddDiagnostic
): void => {
  const values = new Set<string>()
  references.forEach((reference, index) => {
    if (values.has(reference)) add(diagnostic("duplicate-reference", `${basePath}/${index}`))
    values.add(reference)
  })
}

const reference = (
  registry: ReadonlySet<string>,
  value: string,
  path: string,
  add: AddDiagnostic
): boolean => {
  if (registry.has(value)) return true
  add(diagnostic("unresolved-reference", path))
  return false
}

const periodDefinitionKey = (period: Period): string =>
  period.kind === "instant" ? `instant:${period.date}` : `duration:${period.start}:${period.end}`

const sameKeys = (actual: Readonly<Record<string, unknown>>, expected: ReadonlyArray<string>): boolean => {
  const actualKeys = Object.keys(actual).sort()
  const expectedKeys = [...new Set(expected)].sort()
  return actualKeys.length === expectedKeys.length && actualKeys.every((key, index) => key === expectedKeys[index])
}

const cyclicItems = (parents: ReadonlyMap<string, string>): ReadonlySet<string> => {
  const done = new Set<string>()
  const cyclic = new Set<string>()

  parents.forEach((_parent, start) => {
    if (done.has(start)) return
    const path: Array<string> = []
    const positions = new Map<string, number>()
    let current: string | undefined = start
    while (current !== undefined && !done.has(current)) {
      const cycleStart = positions.get(current)
      if (cycleStart !== undefined) {
        path.slice(cycleStart).forEach((item) => cyclic.add(item))
        break
      }
      positions.set(current, path.length)
      path.push(current)
      current = parents.get(current)
    }
    path.forEach((item) => done.add(item))
  })
  return cyclic
}

const scanSemantics = (document: Document, add: AddDiagnostic): void => {
  duplicateDefinitions(document.units, "/units", add)
  duplicateDefinitions(document.periods, "/periods", add)
  duplicateDefinitions(document.statements, "/statements", add)

  const units = new Set(document.units.map(({ id }) => id))
  const periods = new Set(document.periods.map(({ id }) => id))

  const periodValues = new Set<string>()
  document.periods.forEach((period, index) => {
    if (period.kind === "instant") {
      if (!isGregorianDate(period.date)) add(diagnostic("invalid-date", `/periods/${index}/date`))
    } else {
      if (!isGregorianDate(period.start)) add(diagnostic("invalid-date", `/periods/${index}/start`))
      if (!isGregorianDate(period.end)) add(diagnostic("invalid-date", `/periods/${index}/end`))
      if (period.start > period.end) add(diagnostic("invalid-duration", `/periods/${index}`))
    }
    const definition = periodDefinitionKey(period)
    if (periodValues.has(definition)) {
      add(diagnostic("duplicate-period-definition", `/periods/${index}`))
    }
    periodValues.add(definition)
  })

  document.statements.forEach((statement, statementIndex) => {
    const statementPath = `/statements/${statementIndex}`
    duplicateReferences(statement.periods, `${statementPath}/periods`, add)
    statement.periods.forEach((period, periodIndex) => {
      reference(periods, period, `${statementPath}/periods/${periodIndex}`, add)
    })

    duplicateDefinitions(statement.items, `${statementPath}/items`, add)
    const items = new Map(statement.items.map((item) => [item.id, item]))
    const rollupParents = new Map<string, string>()

    statement.items.forEach((item, itemIndex) => {
      const itemPath = `${statementPath}/items/${itemIndex}`
      reference(units, item.unit, `${itemPath}/unit`, add)
      if (!sameKeys(item.values, statement.periods)) {
        add(diagnostic("map-key-mismatch", `${itemPath}/values`))
      }
      if (item.rollupTo === undefined) return
      if (item.rollupTo === item.id) {
        add(diagnostic("self-rollup", `${itemPath}/rollupTo`))
        return
      }
      const parent = items.get(item.rollupTo)
      if (parent === undefined) {
        add(diagnostic("unresolved-reference", `${itemPath}/rollupTo`))
        return
      }
      rollupParents.set(item.id, parent.id)
      if (item.unit !== parent.unit) {
        add(diagnostic("unit-mismatch", `${itemPath}/rollupTo`))
      }
    })

    const cycles = cyclicItems(rollupParents)
    statement.items.forEach((item, itemIndex) => {
      if (item.rollupTo !== undefined && cycles.has(item.id)) {
        add(diagnostic("cyclic-rollup", `${statementPath}/items/${itemIndex}/rollupTo`))
      }
    })
  })

  const snapshotKeys = new Set<string>()
  document.validationSnapshot?.applications.forEach((application, index) => {
    const key = applicationKey(application.key)
    if (snapshotKeys.has(key)) {
      add(diagnostic("duplicate-application-key", `/validationSnapshot/applications/${index}/key`))
    }
    snapshotKeys.add(key)
    if (!isApplicationValid(application)) {
      add(diagnostic("invalid-value", `/validationSnapshot/applications/${index}`))
    }
  })
}

export const validateSemantics = (document: Document): ReadonlyArray<StructuralError> => {
  const errors: Array<StructuralError> = []
  scanSemantics(document, (error) => errors.push(error))
  return errors.sort(compareDiagnostics)
}

class SemanticNonconformance extends Error {}

export const conformsSemantically = (document: Document): boolean => {
  try {
    scanSemantics(document, () => {
      throw new SemanticNonconformance()
    })
    return true
  } catch (error) {
    if (error instanceof SemanticNonconformance) return false
    throw error
  }
}

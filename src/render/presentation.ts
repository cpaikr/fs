import type { Document, Statement, Unit } from "../validation/model.js"

export interface StatementPresentation {
  readonly statement: Statement
  readonly commonUnit: Unit | undefined
  readonly fixedColumnCount: number
}

export interface RenderPresentation {
  readonly document: Document
  readonly groupingColumns: ReadonlyArray<string>
  readonly units: ReadonlyMap<string, Unit>
  readonly periods: ReadonlyMap<string, Document["periods"][number]>
  readonly statements: ReadonlyArray<StatementPresentation>
}

const commonUnitId = (statement: Statement): string | undefined => {
  const first = statement.items[0]
  if (first === undefined) throw new Error("Validated statement lost its first item")
  return statement.items.every(({ unit }) => unit === first.unit) ? first.unit : undefined
}

export const createRenderPresentation = (document: Document): RenderPresentation => {
  const units = new Map(document.units.map((unit) => [unit.id, unit]))
  const periods = new Map(document.periods.map((period) => [period.id, period]))
  const groupingColumns = document.groupingColumns ?? []
  const statements = document.statements.map((statement): StatementPresentation => {
    const unitId = commonUnitId(statement)
    const commonUnit = unitId === undefined ? undefined : units.get(unitId)
    if (unitId !== undefined && commonUnit === undefined) {
      throw new Error("Validated statement lost its unit")
    }
    return {
      statement,
      commonUnit,
      fixedColumnCount: 1 + (commonUnit === undefined ? 1 : 0) + groupingColumns.length
    }
  })

  return { document, groupingColumns, units, periods, statements }
}

import { calculate, type CalculationResult } from "../validation/calculate.js"
import type {
  ApplicationResult,
  Document,
  Item,
  Period,
  Statement,
  Unit
} from "../validation/model.js"

export interface ItemPresentation {
  readonly item: Item
  readonly unit: Unit
  /** Distance from a rollup root; 0 for items outside any rollup chain. */
  readonly depth: number
  /** Number of transitive rollup descendants. */
  readonly descendantCount: number
  /** True when other items in the statement roll up into this item. */
  readonly isParent: boolean
  /** Item-array index of the rollup parent, when one exists in the statement. */
  readonly parentIndex: number | undefined
}

export interface StatementCheck {
  readonly application: ApplicationResult
  readonly parent: Item
  readonly children: ReadonlyArray<Item>
  readonly period: Period
}

export interface StatementPresentation {
  readonly statement: Statement
  readonly items: ReadonlyArray<ItemPresentation>
  readonly checks: ReadonlyArray<StatementCheck>
  readonly commonUnit: Unit | undefined
  readonly fixedColumnCount: number
  readonly ordinal: number
  readonly anchorId: string
  readonly tableId: string
  readonly copySourceId: string
  readonly copyStatusId: string
  readonly copyHelpId: string
}

export interface RenderPresentation {
  readonly document: Document
  readonly groupingColumns: ReadonlyArray<string>
  readonly units: ReadonlyMap<string, Unit>
  readonly periods: ReadonlyMap<string, Document["periods"][number]>
  readonly calculations: CalculationResult
  readonly statements: ReadonlyArray<StatementPresentation>
}

const commonUnitId = (statement: Statement): string | undefined => {
  const first = statement.items[0]
  if (first === undefined) throw new Error("Validated statement lost its first item")
  return statement.items.every(({ unit }) => unit === first.unit) ? first.unit : undefined
}

export const statementFixedColumnCount = (
  statement: Statement,
  groupingColumnCount: number
): number => 1 + (commonUnitId(statement) === undefined ? 1 : 0) + groupingColumnCount

const rollupDepths = (statement: Statement): ReadonlyMap<string, number> => {
  const parentOf = new Map<string, string>()
  const ids = new Set(statement.items.map(({ id }) => id))
  for (const item of statement.items) {
    if (item.rollupTo !== undefined && ids.has(item.rollupTo)) {
      parentOf.set(item.id, item.rollupTo)
    }
  }
  const depths = new Map<string, number>()
  for (const item of statement.items) {
    if (depths.has(item.id)) continue
    const path: Array<string> = []
    const visiting = new Set<string>()
    let current = item.id
    let resolvedDepth: number
    while (true) {
      const known = depths.get(current)
      if (known !== undefined) {
        resolvedDepth = known
        break
      }
      if (visiting.has(current)) throw new Error("Validated statement lost its acyclic rollups")
      visiting.add(current)
      path.push(current)
      const parent = parentOf.get(current)
      if (parent === undefined) {
        resolvedDepth = -1
        break
      }
      current = parent
    }
    for (let index = path.length - 1; index >= 0; index -= 1) {
      const id = path[index]
      if (id === undefined) throw new Error("Validated rollup path lost an item")
      resolvedDepth += 1
      depths.set(id, resolvedDepth)
    }
  }
  return depths
}

const presentItems = (
  statement: Statement,
  units: ReadonlyMap<string, Unit>
): ReadonlyArray<ItemPresentation> => {
  const depths = rollupDepths(statement)
  const indexOf = new Map(statement.items.map((item, index) => [item.id, index]))
  const parentIndices = statement.items.map(
    ({ rollupTo }) => rollupTo === undefined ? undefined : indexOf.get(rollupTo)
  )
  const descendantCounts = statement.items.map(() => 0)
  const indicesByDepth = new Map<number, Array<number>>()
  let maximumDepth = 0
  for (const [index, item] of statement.items.entries()) {
    const depth = depths.get(item.id)
    if (depth === undefined) throw new Error("Validated item lost its rollup depth")
    maximumDepth = Math.max(maximumDepth, depth)
    const indices = indicesByDepth.get(depth) ?? []
    indices.push(index)
    indicesByDepth.set(depth, indices)
  }
  for (let depth = maximumDepth; depth > 0; depth -= 1) {
    for (const index of indicesByDepth.get(depth) ?? []) {
      const parentIndex = parentIndices[index]
      if (parentIndex === undefined) throw new Error("Validated rollup item lost its parent")
      descendantCounts[parentIndex] =
        (descendantCounts[parentIndex] ?? 0) + (descendantCounts[index] ?? 0) + 1
    }
  }

  return statement.items.map((item, index) => {
    const unit = units.get(item.unit)
    if (unit === undefined) throw new Error("Validated item lost its unit")
    const depth = depths.get(item.id)
    if (depth === undefined) throw new Error("Validated item lost its rollup depth")
    const descendantCount = descendantCounts[index]
    if (descendantCount === undefined) throw new Error("Validated item lost its descendant count")
    return {
      item,
      unit,
      depth,
      descendantCount,
      isParent: descendantCount > 0,
      parentIndex: parentIndices[index]
    }
  })
}

const presentChecks = (
  statement: Statement,
  applications: ReadonlyArray<ApplicationResult>,
  periods: ReadonlyMap<string, Period>
): ReadonlyArray<StatementCheck> => {
  const itemsById = new Map(statement.items.map((item) => [item.id, item]))
  const childrenByParent = new Map<string, Array<Item>>()
  for (const item of statement.items) {
    if (item.rollupTo === undefined) continue
    const children = childrenByParent.get(item.rollupTo) ?? []
    children.push(item)
    childrenByParent.set(item.rollupTo, children)
  }
  const checks: Array<StatementCheck> = []
  for (const application of applications) {
    const parent = itemsById.get(application.key.parent)
    if (parent === undefined) throw new Error("Validated application lost its parent item")
    const period = periods.get(application.key.period)
    if (period === undefined) throw new Error("Validated application lost its period")
    const children = childrenByParent.get(parent.id)
    if (children === undefined) throw new Error("Validated application lost its child items")
    checks.push({ application, parent, children, period })
  }
  return checks
}

export const createRenderPresentation = (document: Document): RenderPresentation => {
  const units = new Map(document.units.map((unit) => [unit.id, unit]))
  const periods = new Map(document.periods.map((period) => [period.id, period]))
  const groupingColumns = document.groupingColumns ?? []
  const calculations = calculate(document)
  const applicationsByStatement = new Map<string, Array<ApplicationResult>>()
  for (const application of calculations.applications) {
    const applications = applicationsByStatement.get(application.key.statement) ?? []
    applications.push(application)
    applicationsByStatement.set(application.key.statement, applications)
  }
  const statements = document.statements.map((statement, index): StatementPresentation => {
    const unitId = commonUnitId(statement)
    const commonUnit = unitId === undefined ? undefined : units.get(unitId)
    if (unitId !== undefined && commonUnit === undefined) {
      throw new Error("Validated statement lost its unit")
    }
    const ordinal = index + 1
    return {
      statement,
      items: presentItems(statement, units),
      checks: presentChecks(
        statement,
        applicationsByStatement.get(statement.id) ?? [],
        periods
      ),
      commonUnit,
      fixedColumnCount: statementFixedColumnCount(statement, groupingColumns.length),
      ordinal,
      anchorId: `statement-${ordinal}`,
      tableId: `statement-table-${ordinal}`,
      copySourceId: `copy-source-${ordinal}`,
      copyStatusId: `copy-status-${ordinal}`,
      copyHelpId: `copy-help-${ordinal}`
    }
  })

  return { document, groupingColumns, units, periods, calculations, statements }
}

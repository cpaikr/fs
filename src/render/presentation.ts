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
  /**
   * Group-heading rows derived from rollups: first subtree row index → the
   * parent indexes (outermost first) whose contiguous subtree starts there.
   */
  readonly headings: ReadonlyMap<number, ReadonlyArray<number>>
  readonly headingCount: number
  readonly checks: ReadonlyArray<StatementCheck>
  /** Checks whose fresh application is not `satisfied` (unsatisfied or error). */
  readonly unsatisfiedCheckCount: number
  /**
   * Declared grouping columns, in declaration order, that carry at least one
   * value in this statement. An all-null column would render and copy as an
   * empty column, so it is omitted per statement.
   */
  readonly groupingColumns: ReadonlyArray<string>
  readonly commonUnit: Unit | undefined
  readonly fixedColumnCount: number
  readonly ordinal: number
  readonly anchorId: string
  readonly tableId: string
  readonly copySourceId: string
  readonly copyStatusId: string
  readonly copyHelpId: string
  readonly checksId: string
}

export interface RenderPresentation {
  readonly document: Document
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

const rollupDepths = (statement: Statement): ReadonlyMap<string, number> => {
  const parentOf = new Map<string, string>()
  const ids = new Set(statement.items.map(({ id }) => id))
  for (const item of statement.items) {
    if (item.rollupTo !== undefined && ids.has(item.rollupTo)) {
      parentOf.set(item.id, item.rollupTo)
    }
  }
  const depths = new Map<string, number>()
  const depthOf = (id: string, visiting: ReadonlySet<string>): number => {
    const known = depths.get(id)
    if (known !== undefined) return known
    if (visiting.has(id)) throw new Error("Validated statement lost its acyclic rollups")
    const parent = parentOf.get(id)
    const depth = parent === undefined ? 0 : depthOf(parent, new Set(visiting).add(id)) + 1
    depths.set(id, depth)
    return depth
  }
  for (const item of statement.items) depthOf(item.id, new Set())
  return depths
}

const presentItems = (
  statement: Statement,
  units: ReadonlyMap<string, Unit>
): ReadonlyArray<ItemPresentation> => {
  const depths = rollupDepths(statement)
  const indexOf = new Map(statement.items.map((item, index) => [item.id, index]))
  const parentIds = new Set(
    statement.items
      .map(({ rollupTo }) => rollupTo)
      .filter((id): id is string => id !== undefined && indexOf.has(id))
  )
  return statement.items.map((item) => {
    const unit = units.get(item.unit)
    if (unit === undefined) throw new Error("Validated item lost its unit")
    const depth = depths.get(item.id)
    if (depth === undefined) throw new Error("Validated item lost its rollup depth")
    const parentIndex = item.rollupTo === undefined ? undefined : indexOf.get(item.rollupTo)
    return { item, unit, depth, isParent: parentIds.has(item.id), parentIndex }
  })
}

const presentHeadings = (
  items: ReadonlyArray<ItemPresentation>
): ReadonlyMap<number, ReadonlyArray<number>> => {
  const inSubtree = (candidate: number, root: number): boolean => {
    let ancestor: number | undefined = candidate
    while (ancestor !== undefined) {
      if (ancestor === root) return true
      ancestor = items[ancestor]?.parentIndex
    }
    return false
  }
  const headings = new Map<number, Array<number>>()
  for (const [parentIndex, { isParent }] of items.entries()) {
    if (!isParent) continue
    let first = parentIndex
    for (const [candidate] of items.entries()) {
      if (candidate < first && inSubtree(candidate, parentIndex)) first = candidate
    }
    if (first === parentIndex) continue
    const contiguous = items
      .slice(first, parentIndex + 1)
      .every((_, offset) => inSubtree(first + offset, parentIndex))
    if (!contiguous) continue
    const stack = headings.get(first) ?? []
    stack.push(parentIndex)
    headings.set(first, stack)
  }
  for (const stack of headings.values()) {
    stack.sort((a, b) => {
      const depthA = items[a]?.depth ?? 0
      const depthB = items[b]?.depth ?? 0
      return depthA - depthB
    })
  }
  return headings
}

const presentChecks = (
  statement: Statement,
  calculations: CalculationResult,
  periods: ReadonlyMap<string, Period>
): ReadonlyArray<StatementCheck> => {
  const itemsById = new Map(statement.items.map((item) => [item.id, item]))
  const checks: Array<StatementCheck> = []
  for (const application of calculations.applications) {
    if (application.key.statement !== statement.id) continue
    const parent = itemsById.get(application.key.parent)
    if (parent === undefined) throw new Error("Validated application lost its parent item")
    const period = periods.get(application.key.period)
    if (period === undefined) throw new Error("Validated application lost its period")
    const children = statement.items.filter(({ rollupTo }) => rollupTo === parent.id)
    checks.push({ application, parent, children, period })
  }
  return checks
}

const presentGroupingColumns = (
  statement: Statement,
  declared: ReadonlyArray<string>
): ReadonlyArray<string> =>
  declared.filter((column) =>
    statement.items.some((item) => typeof item.groupings[column] === "string")
  )

export const createRenderPresentation = (document: Document): RenderPresentation => {
  const units = new Map(document.units.map((unit) => [unit.id, unit]))
  const periods = new Map(document.periods.map((period) => [period.id, period]))
  const declaredGroupingColumns = document.groupingColumns ?? []
  const calculations = calculate(document)
  const statements = document.statements.map((statement, index): StatementPresentation => {
    const unitId = commonUnitId(statement)
    const commonUnit = unitId === undefined ? undefined : units.get(unitId)
    if (unitId !== undefined && commonUnit === undefined) {
      throw new Error("Validated statement lost its unit")
    }
    const ordinal = index + 1
    const items = presentItems(statement, units)
    const headings = presentHeadings(items)
    let headingCount = 0
    for (const stack of headings.values()) headingCount += stack.length
    const checks = presentChecks(statement, calculations, periods)
    const groupingColumns = presentGroupingColumns(statement, declaredGroupingColumns)
    return {
      statement,
      items,
      headings,
      headingCount,
      checks,
      unsatisfiedCheckCount:
        checks.filter(({ application }) => application.status !== "satisfied").length,
      groupingColumns,
      commonUnit,
      fixedColumnCount: 1 + (commonUnit === undefined ? 1 : 0) + groupingColumns.length,
      ordinal,
      anchorId: `statement-${ordinal}`,
      tableId: `statement-table-${ordinal}`,
      copySourceId: `copy-source-${ordinal}`,
      copyStatusId: `copy-status-${ordinal}`,
      copyHelpId: `copy-help-${ordinal}`,
      checksId: `statement-checks-${ordinal}`
    }
  })

  return { document, units, periods, calculations, statements }
}

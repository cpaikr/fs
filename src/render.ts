import { coordinateKey } from "./validation/identity.js"
import type {
  Dimension,
  Dimensions,
  Document,
  Fact,
  Period,
  Statement
} from "./validation/model.js"

export const renderLimits = {
  columns: 1_000,
  gridSlots: 100_000,
  htmlBytes: 16 * 1024 * 1024
} as const

export type RenderLimitBudget = "columns" | "grid-slots" | "html-bytes"

export type RenderResult =
  | { readonly ok: true; readonly bytes: Buffer }
  | {
      readonly ok: false
      readonly budget: RenderLimitBudget
      readonly limit: number
    }

interface Column {
  readonly period: Period
  readonly axes: NonNullable<Statement["dimensions"]>
  readonly coordinate: AxisCoordinate
}

interface DimensionIndex {
  readonly definition: Dimension
  readonly members: ReadonlyMap<string, Dimension["members"][number]>
}

interface AxisCoordinate {
  readonly memberIndexes: ReadonlyMap<number, number>
}

interface HtmlPart {
  readonly text: string
  readonly escaped: boolean
}

const literal = (text: string): HtmlPart => ({ text, escaped: false })
const authorText = (text: string): HtmlPart => ({ text, escaped: true })

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/gu, (character) => {
    switch (character) {
      case "&":
        return "&amp;"
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case '"':
        return "&quot;"
      case "'":
        return "&#39;"
      default:
        return character
    }
  })

const escapedByteLength = (text: string): number => {
  let bytes = Buffer.byteLength(text, "utf8")
  for (const character of text.matchAll(/[&<>"']/gu)) {
    switch (character[0]) {
      case "&":
      case "'":
        bytes += 4
        break
      case "<":
      case ">":
        bytes += 3
        break
      case '"':
        bytes += 5
        break
    }
  }
  return bytes
}

class HtmlSink {
  private readonly lines: Array<string> | null
  private byteCount = 0
  exceeded = false

  constructor(collect: boolean) {
    this.lines = collect ? [] : null
  }

  append(parts: Iterable<HtmlPart>): void {
    if (this.exceeded) return
    let remaining = renderLimits.htmlBytes - this.byteCount - 1
    const renderedParts: Array<string> | null = this.lines === null ? null : []
    for (const part of parts) {
      const length = part.escaped
        ? escapedByteLength(part.text)
        : Buffer.byteLength(part.text, "utf8")
      if (length > remaining) {
        this.exceeded = true
        return
      }
      remaining -= length
      renderedParts?.push(part.escaped ? escapeHtml(part.text) : part.text)
    }
    this.byteCount = renderLimits.htmlBytes - remaining
    if (renderedParts !== null) this.lines?.push(renderedParts.join(""))
  }

  appendLiteral(line: string): void {
    this.append([literal(line)])
  }

  bytes(): Buffer {
    if (this.lines === null || this.exceeded) throw new Error("HTML sink has no complete output")
    return Buffer.from(`${this.lines.join("\n")}\n`, "utf8")
  }
}

const stylesheet = [
  "    :root { color-scheme: light; font-family: system-ui, sans-serif; }",
  "    body { color: #1f2937; margin: 2rem; }",
  "    header, main { max-width: 100%; }",
  "    h1 { margin: 0; }",
  "    .scope { color: #4b5563; margin: 0.5rem 0 2rem; }",
  "    section + section { margin-top: 2.5rem; }",
  "    .unit { color: #4b5563; }",
  "    .table-scroll { overflow-x: auto; }",
  "    table { border-collapse: collapse; min-width: 100%; }",
  "    th, td { border-bottom: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; white-space: nowrap; }",
  "    th:first-child, td:first-child { text-align: left; }",
  "    thead th { border-bottom: 2px solid #6b7280; }",
  "    .heading { background: #f3f4f6; }",
  "    .missing, .unavailable { color: #6b7280; font-style: italic; }"
] as const

const limitExceeded = (budget: RenderLimitBudget, limit: number): RenderResult => ({
  ok: false,
  budget,
  limit
})

const structuralPreflight = (document: Document): RenderResult | null => {
  const maximumDataColumns = renderLimits.columns - 1
  let gridSlots = 0

  for (const statement of document.statements) {
    let dataColumns = statement.periods.length
    if (dataColumns > maximumDataColumns) {
      return limitExceeded("columns", renderLimits.columns)
    }
    for (const axis of statement.dimensions ?? []) {
      if (dataColumns > Math.floor(maximumDataColumns / axis.members.length)) {
        return limitExceeded("columns", renderLimits.columns)
      }
      dataColumns *= axis.members.length
    }

    const columns = dataColumns + 1
    const rows = statement.entries.length + 1
    const remainingSlots = renderLimits.gridSlots - gridSlots
    if (rows > Math.floor(remainingSlots / columns)) {
      return limitExceeded("grid-slots", renderLimits.gridSlots)
    }
    gridSlots += rows * columns
  }

  return null
}

const periodLabel = (period: Period): string =>
  period.kind === "instant" ? period.date : `${period.start} – ${period.end}`

const coordinateDimensions = (column: Column): Dimensions => {
  const dimensions: Record<string, string> = {}
  for (const [axisIndex, axis] of column.axes.entries()) {
    const memberIndex = column.coordinate.memberIndexes.get(axisIndex) ?? 0
    dimensions[axis.dimension] = axis.members[memberIndex] as string
  }
  return dimensions
}

const axisCoordinates = function* (statement: Statement): IterableIterator<AxisCoordinate> {
  const axes = statement.dimensions ?? []
  const varyingAxes: Array<{
    readonly axis: NonNullable<Statement["dimensions"]>[number]
    readonly index: number
  }> = []
  for (const [index, axis] of axes.entries()) {
    if (axis.members.length > 1) varyingAxes.push({ axis, index })
  }

  const memberIndexes = Array.from({ length: varyingAxes.length }, () => 0)
  while (true) {
    yield {
      memberIndexes: new Map(varyingAxes.map(({ index }, position) => [
        index,
        memberIndexes[position] as number
      ]))
    }

    let position = varyingAxes.length - 1
    while (position >= 0) {
      const axis = varyingAxes[position]?.axis as NonNullable<Statement["dimensions"]>[number]
      memberIndexes[position] = (memberIndexes[position] as number) + 1
      if ((memberIndexes[position] as number) < axis.members.length) break
      memberIndexes[position] = 0
      position -= 1
    }
    if (position < 0) return
  }
}

const statementColumns = function* (
  statement: Statement,
  periods: ReadonlyMap<string, Period>
): IterableIterator<Column> {
  const axes = statement.dimensions ?? []
  for (const periodId of statement.periods) {
    const period = periods.get(periodId) as Period
    for (const coordinate of axisCoordinates(statement)) {
      yield { period, axes, coordinate }
    }
  }
}

const columnHeaderParts = function* (
  column: Column,
  dimensions: ReadonlyMap<string, DimensionIndex>
): IterableIterator<HtmlPart> {
  yield literal('              <th scope="col">')
  yield authorText(periodLabel(column.period))
  for (const [axisIndex, axis] of column.axes.entries()) {
    const dimension = dimensions.get(axis.dimension) as DimensionIndex
    const memberIndex = column.coordinate.memberIndexes.get(axisIndex) ?? 0
    const memberId = axis.members[memberIndex] as string
    const member = dimension.members.get(memberId) as Dimension["members"][number]
    yield literal(" · ")
    yield authorText(dimension.definition.label)
    yield literal(": ")
    yield authorText(member.label)
  }
  yield literal("</th>")
}

const statementDataColumnCount = (statement: Statement): number => {
  let columns = statement.periods.length
  for (const axis of statement.dimensions ?? []) columns *= axis.members.length
  return columns
}

const appendColumnHeader = (
  sink: HtmlSink,
  column: Column,
  dimensions: ReadonlyMap<string, DimensionIndex>
): void => {
  sink.append(columnHeaderParts(column, dimensions))
}

const appendRenderedCell = (sink: HtmlSink, fact: Fact | undefined): void => {
  if (fact === undefined) {
    sink.appendLiteral('              <td class="missing">Missing</td>')
    return
  }
  if (fact.unavailable === true) {
    sink.appendLiteral('              <td class="unavailable">Unavailable</td>')
    return
  }
  sink.append([
    literal('              <td class="value">'),
    literal(fact.value as string),
    literal("</td>")
  ])
}

const renderStatement = (
  statement: Statement,
  items: ReadonlyMap<string, Document["items"][number]>,
  units: ReadonlyMap<string, Document["units"][number]>,
  periods: ReadonlyMap<string, Period>,
  dimensions: ReadonlyMap<string, DimensionIndex>,
  facts: ReadonlyMap<string, Fact>,
  sink: HtmlSink
): void => {
  const unit = units.get(statement.unit) as Document["units"][number]
  const dataColumns = statementDataColumnCount(statement)
  sink.appendLiteral("    <section>")
  sink.append([literal("      <h2>"), authorText(statement.label), literal("</h2>")])
  sink.append([
    literal('      <p class="unit">Unit: '),
    authorText(unit.label),
    literal(" · Measure: "),
    authorText(unit.measure),
    literal(` · Scale: 10<sup>${unit.scale}</sup></p>`)
  ])
  sink.appendLiteral('      <div class="table-scroll">')
  sink.appendLiteral("        <table>")
  sink.appendLiteral("          <thead>")
  sink.appendLiteral("            <tr>")
  sink.appendLiteral('              <th scope="col">Item</th>')
  for (const column of statementColumns(statement, periods)) {
    appendColumnHeader(sink, column, dimensions)
    if (sink.exceeded) return
  }
  sink.appendLiteral("            </tr>")
  sink.appendLiteral("          </thead>")
  sink.appendLiteral("          <tbody>")

  for (const entry of statement.entries) {
    sink.appendLiteral("            <tr>")
    if (entry.type === "heading") {
      sink.append([
        literal(`              <td class="heading" colspan="${dataColumns + 1}">`),
        authorText(entry.label),
        literal("</td>")
      ])
    } else {
      const item = items.get(entry.item) as Document["items"][number]
      sink.append([
        literal('              <th scope="row">'),
        authorText(entry.label ?? item.label),
        literal("</th>")
      ])
      for (const column of statementColumns(statement, periods)) {
        appendRenderedCell(sink, facts.get(coordinateKey({
          item: entry.item,
          period: column.period.id,
          unit: statement.unit,
          dimensions: coordinateDimensions(column)
        })))
        if (sink.exceeded) return
      }
    }
    sink.appendLiteral("            </tr>")
    if (sink.exceeded) return
  }

  sink.appendLiteral("          </tbody>")
  sink.appendLiteral("        </table>")
  sink.appendLiteral("      </div>")
  sink.appendLiteral("    </section>")
}

const renderInto = (document: Document, sink: HtmlSink): void => {
  const items = new Map(document.items.map((item) => [item.id, item]))
  const units = new Map(document.units.map((unit) => [unit.id, unit]))
  const periods = new Map(document.periods.map((period) => [period.id, period]))
  const dimensions = new Map(
    (document.dimensions ?? []).map((dimension) => [
      dimension.id,
      {
        definition: dimension,
        members: new Map(dimension.members.map((member) => [member.id, member]))
      }
    ])
  )
  const facts = new Map(document.facts.map((fact) => [coordinateKey(fact), fact]))

  sink.appendLiteral("<!doctype html>")
  sink.appendLiteral('<html lang="en">')
  sink.appendLiteral("<head>")
  sink.appendLiteral('  <meta charset="utf-8">')
  sink.appendLiteral('  <meta name="viewport" content="width=device-width, initial-scale=1">')
  sink.append([
    literal("  <title>"),
    authorText(document.entity.name),
    literal(" — "),
    authorText(document.scope.label),
    literal("</title>")
  ])
  sink.appendLiteral("  <style>")
  for (const line of stylesheet) sink.appendLiteral(line)
  sink.appendLiteral("  </style>")
  sink.appendLiteral("</head>")
  sink.appendLiteral("<body>")
  sink.appendLiteral("  <header>")
  sink.append([literal("    <h1>"), authorText(document.entity.name), literal("</h1>")])
  sink.append([
    literal('    <p class="scope">'),
    authorText(document.scope.label),
    literal("</p>")
  ])
  sink.appendLiteral("  </header>")
  sink.appendLiteral("  <main>")
  for (const statement of document.statements) {
    renderStatement(statement, items, units, periods, dimensions, facts, sink)
    if (sink.exceeded) return
  }
  sink.appendLiteral("  </main>")
  sink.appendLiteral("</body>")
  sink.appendLiteral("</html>")
}

export const renderHtml = (document: Document): RenderResult => {
  const structuralFailure = structuralPreflight(document)
  if (structuralFailure !== null) return structuralFailure

  const measuringSink = new HtmlSink(false)
  renderInto(document, measuringSink)
  if (measuringSink.exceeded) return limitExceeded("html-bytes", renderLimits.htmlBytes)

  const outputSink = new HtmlSink(true)
  renderInto(document, outputSink)
  if (outputSink.exceeded) throw new Error("measured HTML exceeded its byte budget while encoding")
  return { ok: true, bytes: outputSink.bytes() }
}

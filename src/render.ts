import type { Document, Period, Statement, Unit, ValueCell } from "./validation/model.js"

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
      const length = part.escaped ? escapedByteLength(part.text) : Buffer.byteLength(part.text, "utf8")
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
  "    th:first-child, td:first-child, .metadata { text-align: left; }",
  "    thead th { border-bottom: 2px solid #6b7280; }",
  "    .missing, .unavailable { color: #6b7280; font-style: italic; }"
] as const

const limitExceeded = (budget: RenderLimitBudget, limit: number): RenderResult => ({
  ok: false,
  budget,
  limit
})

const homogeneousUnit = (statement: Statement): string | undefined => {
  const first = statement.items[0]
  if (first === undefined) throw new Error("Validated statement lost its first item")
  return statement.items.every(({ unit }) => unit === first.unit) ? first.unit : undefined
}

const structuralPreflight = (document: Document): RenderResult | undefined => {
  const groupingColumns = document.groupingColumns?.length ?? 0
  for (const statement of document.statements) {
    const fixedColumns = 1 + (homogeneousUnit(statement) === undefined ? 1 : 0) + groupingColumns
    if (fixedColumns > renderLimits.columns || statement.periods.length > renderLimits.columns - fixedColumns) {
      return limitExceeded("columns", renderLimits.columns)
    }
  }

  let gridSlots = 0
  for (const statement of document.statements) {
    const fixedColumns = 1 + (homogeneousUnit(statement) === undefined ? 1 : 0) + groupingColumns
    const columns = fixedColumns + statement.periods.length
    const rows = statement.items.length + 1
    const remainingSlots = renderLimits.gridSlots - gridSlots
    if (rows > Math.floor(remainingSlots / columns)) {
      return limitExceeded("grid-slots", renderLimits.gridSlots)
    }
    gridSlots += rows * columns
  }
  return undefined
}

const periodLabel = (period: Period): string =>
  period.kind === "instant" ? period.date : `${period.start} – ${period.end}`

const unitParts = (unit: Unit): ReadonlyArray<HtmlPart> =>
  [
    authorText(unit.label),
    literal(" ("),
    authorText(unit.measure),
    literal(`, scale ${unit.scale})`)
  ]

const appendValue = (sink: HtmlSink, value: ValueCell): void => {
  if (value === null) {
    sink.appendLiteral('              <td class="missing">Missing</td>')
  } else if (typeof value === "object") {
    sink.appendLiteral('              <td class="unavailable">Unavailable</td>')
  } else {
    sink.append([literal('              <td class="value">'), literal(value), literal("</td>")])
  }
}

const renderStatement = (
  statement: Statement,
  groupingColumns: ReadonlyArray<string>,
  units: ReadonlyMap<string, Unit>,
  periods: ReadonlyMap<string, Period>,
  sink: HtmlSink
): void => {
  const commonUnit = homogeneousUnit(statement)
  sink.appendLiteral("    <section>")
  sink.append([literal("      <h2>"), authorText(statement.label), literal("</h2>")])
  if (commonUnit !== undefined) {
    const unit = units.get(commonUnit)
    if (unit === undefined) throw new Error("Validated statement lost its unit")
    sink.append([literal('      <p class="unit">Unit: '), ...unitParts(unit), literal("</p>")])
  }
  sink.appendLiteral('      <div class="table-scroll">')
  sink.appendLiteral("        <table>")
  sink.appendLiteral("          <thead>")
  sink.appendLiteral("            <tr>")
  sink.appendLiteral('              <th scope="col">Item</th>')
  if (commonUnit === undefined) sink.appendLiteral('              <th scope="col">Unit</th>')
  for (const grouping of groupingColumns) {
    sink.append([literal('              <th scope="col">'), authorText(grouping), literal("</th>")])
  }
  for (const periodId of statement.periods) {
    const period = periods.get(periodId)
    if (period === undefined) throw new Error("Validated statement lost its period")
    sink.append([literal('              <th scope="col">'), authorText(periodLabel(period)), literal("</th>")])
  }
  sink.appendLiteral("            </tr>")
  sink.appendLiteral("          </thead>")
  sink.appendLiteral("          <tbody>")

  for (const item of statement.items) {
    sink.appendLiteral("            <tr>")
    sink.append([literal('              <th scope="row">'), authorText(item.label), literal("</th>")])
    if (commonUnit === undefined) {
      const unit = units.get(item.unit)
      if (unit === undefined) throw new Error("Validated item lost its unit")
      sink.append([literal('              <td class="metadata">'), ...unitParts(unit), literal("</td>")])
    }
    for (const grouping of groupingColumns) {
      const value = item.groupings[grouping]
      sink.append([
        literal('              <td class="metadata">'),
        value === null ? literal("—") : authorText(value as string),
        literal("</td>")
      ])
    }
    for (const period of statement.periods) {
      appendValue(sink, item.values[period] as ValueCell)
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
  const units = new Map(document.units.map((unit) => [unit.id, unit]))
  const periods = new Map(document.periods.map((period) => [period.id, period]))
  const groupingColumns = document.groupingColumns ?? []

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
  sink.append([literal('    <p class="scope">'), authorText(document.scope.label), literal("</p>")])
  sink.appendLiteral("  </header>")
  sink.appendLiteral("  <main>")
  for (const statement of document.statements) {
    renderStatement(statement, groupingColumns, units, periods, sink)
    if (sink.exceeded) return
  }
  sink.appendLiteral("  </main>")
  sink.appendLiteral("</body>")
  sink.appendLiteral("</html>")
}

export const renderHtml = (document: Document): RenderResult => {
  const structuralFailure = structuralPreflight(document)
  if (structuralFailure !== undefined) return structuralFailure

  const measuringSink = new HtmlSink(false)
  renderInto(document, measuringSink)
  if (measuringSink.exceeded) return limitExceeded("html-bytes", renderLimits.htmlBytes)

  const outputSink = new HtmlSink(true)
  renderInto(document, outputSink)
  if (outputSink.exceeded) throw new Error("Measured HTML exceeded its byte budget while encoding")
  return { ok: true, bytes: outputSink.bytes() }
}

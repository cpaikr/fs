import { coordinateKey } from "./validation/identity.js"
import type {
  Dimension,
  Dimensions,
  Document,
  Fact,
  Period,
  Statement
} from "./validation/model.js"

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

interface Column {
  readonly period: Period
  readonly dimensions: Dimensions
  readonly label: string
}

interface DimensionIndex {
  readonly definition: Dimension
  readonly members: ReadonlyMap<string, Dimension["members"][number]>
}

const periodLabel = (period: Period): string =>
  period.kind === "instant" ? period.date : `${period.start} – ${period.end}`

const axisCoordinates = (
  statement: Statement,
  dimensions: ReadonlyMap<string, DimensionIndex>
): ReadonlyArray<{ readonly dimensions: Dimensions; readonly labels: ReadonlyArray<string> }> =>
  (statement.dimensions ?? []).reduce<
    ReadonlyArray<{ readonly dimensions: Dimensions; readonly labels: ReadonlyArray<string> }>
  >(
    (coordinates, axis) => {
      const dimension = dimensions.get(axis.dimension) as DimensionIndex
      return coordinates.flatMap((coordinate) =>
        axis.members.map((memberId) => {
          const member = dimension.members.get(memberId) as Dimension["members"][number]
          return {
            dimensions: { ...coordinate.dimensions, [axis.dimension]: memberId },
            labels: [...coordinate.labels, `${dimension.definition.label}: ${member.label}`]
          }
        })
      )
    },
    [{ dimensions: {}, labels: [] }]
  )

const statementColumns = (
  statement: Statement,
  periods: ReadonlyMap<string, Period>,
  dimensions: ReadonlyMap<string, DimensionIndex>
): ReadonlyArray<Column> => {
  const coordinates = axisCoordinates(statement, dimensions)
  return statement.periods.flatMap((periodId) => {
    const period = periods.get(periodId) as Period
    return coordinates.map((coordinate) => ({
      period,
      dimensions: coordinate.dimensions,
      label: [periodLabel(period), ...coordinate.labels].join(" · ")
    }))
  })
}

const renderedCell = (fact: Fact | undefined): string => {
  if (fact === undefined) return '              <td class="missing">Missing</td>'
  if (fact.unavailable === true) return '              <td class="unavailable">Unavailable</td>'
  return `              <td class="value">${fact.value as string}</td>`
}

const renderStatement = (
  statement: Statement,
  items: ReadonlyMap<string, Document["items"][number]>,
  units: ReadonlyMap<string, Document["units"][number]>,
  periods: ReadonlyMap<string, Period>,
  dimensions: ReadonlyMap<string, DimensionIndex>,
  facts: ReadonlyMap<string, Fact>
): ReadonlyArray<string> => {
  const unit = units.get(statement.unit) as Document["units"][number]
  const columns = statementColumns(statement, periods, dimensions)
  const lines = [
    "    <section>",
    `      <h2>${escapeHtml(statement.label)}</h2>`,
    `      <p class="unit">Unit: ${escapeHtml(unit.label)} · Measure: ${escapeHtml(unit.measure)} · Scale: 10<sup>${unit.scale}</sup></p>`,
    '      <div class="table-scroll">',
    "        <table>",
    "          <thead>",
    "            <tr>",
    '              <th scope="col">Item</th>',
    ...columns.map((column) => `              <th scope="col">${escapeHtml(column.label)}</th>`),
    "            </tr>",
    "          </thead>",
    "          <tbody>"
  ]

  for (const entry of statement.entries) {
    lines.push("            <tr>")
    if (entry.type === "heading") {
      lines.push(
        `              <td class="heading" colspan="${columns.length + 1}">${escapeHtml(entry.label)}</td>`
      )
    } else {
      const item = items.get(entry.item) as Document["items"][number]
      lines.push(`              <th scope="row">${escapeHtml(entry.label ?? item.label)}</th>`)
      for (const column of columns) {
        lines.push(renderedCell(facts.get(coordinateKey({
          item: entry.item,
          period: column.period.id,
          unit: statement.unit,
          dimensions: column.dimensions
        }))))
      }
    }
    lines.push("            </tr>")
  }

  lines.push(
    "          </tbody>",
    "        </table>",
    "      </div>",
    "    </section>"
  )
  return lines
}

export const renderHtml = (document: Document): Buffer => {
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
  const title = `${escapeHtml(document.entity.name)} — ${escapeHtml(document.scope.label)}`
  const lines = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${title}</title>`,
    "  <style>",
    ...stylesheet,
    "  </style>",
    "</head>",
    "<body>",
    "  <header>",
    `    <h1>${escapeHtml(document.entity.name)}</h1>`,
    `    <p class="scope">${escapeHtml(document.scope.label)}</p>`,
    "  </header>",
    "  <main>",
    ...document.statements.flatMap((statement) =>
      renderStatement(statement, items, units, periods, dimensions, facts)
    ),
    "  </main>",
    "</body>",
    "</html>"
  ]
  return Buffer.from(`${lines.join("\n")}\n`, "utf8")
}

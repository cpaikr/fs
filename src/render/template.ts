import type { Unit, ValueCell } from "../validation/model.js"
import { HtmlSink, html, type HtmlTemplate } from "./html.js"
import type { RenderPresentation, StatementPresentation } from "./presentation.js"

const stylesheet = html`    :root { color-scheme: light; font-family: system-ui, sans-serif; }
    body { color: #1f2937; margin: 2rem; }
    header, main { max-width: 100%; }
    h1 { margin: 0; }
    .scope { color: #4b5563; margin: 0.5rem 0 2rem; }
    section + section { margin-top: 2.5rem; }
    .unit { color: #4b5563; }
    .table-scroll { overflow-x: auto; }
    table { border-collapse: collapse; min-width: 100%; }
    th, td { border-bottom: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: right; white-space: nowrap; }
    th:first-child, td:first-child, .metadata { text-align: left; }
    thead th { border-bottom: 2px solid #6b7280; }
    .missing, .unavailable { color: #6b7280; font-style: italic; }`

const periodLabel = (period: RenderPresentation["document"]["periods"][number]): string =>
  period.kind === "instant" ? period.date : `${period.start} – ${period.end}`

const unitTemplate = (unit: Unit): HtmlTemplate =>
  html`${unit.label} (${unit.measure}, scale ${unit.scale})`

const groupingTemplate = (value: string | null | undefined): HtmlTemplate => {
  if (value === null) return html`—`
  if (value === undefined) throw new Error("Validated item lost its grouping value")
  return html`${value}`
}

const appendValue = (sink: HtmlSink, value: ValueCell): void => {
  if (value === null) {
    sink.writeLine(html`              <td class="missing">Missing</td>`)
  } else if (typeof value === "object") {
    sink.writeLine(html`              <td class="unavailable">Unavailable</td>`)
  } else {
    sink.writeLine(html`              <td class="value">${value}</td>`)
  }
}

const appendStatement = (
  presentation: RenderPresentation,
  statementPresentation: StatementPresentation,
  sink: HtmlSink
): void => {
  const { statement, commonUnit } = statementPresentation
  sink.writeLine(html`    <section>
      <h2>${statement.label}</h2>`)
  if (commonUnit !== undefined) {
    sink.writeLine(html`      <p class="unit">Unit: ${unitTemplate(commonUnit)}</p>`)
  }
  sink.writeLine(html`      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Item</th>`)
  if (commonUnit === undefined) sink.writeLine(html`              <th scope="col">Unit</th>`)
  for (const grouping of presentation.groupingColumns) {
    sink.writeLine(html`              <th scope="col">${grouping}</th>`)
  }
  for (const periodId of statement.periods) {
    const period = presentation.periods.get(periodId)
    if (period === undefined) throw new Error("Validated statement lost its period")
    sink.writeLine(html`              <th scope="col">${periodLabel(period)}</th>`)
  }
  sink.writeLine(html`            </tr>
          </thead>
          <tbody>`)

  for (const item of statement.items) {
    sink.writeLine(html`            <tr>
              <th scope="row">${item.label}</th>`)
    if (commonUnit === undefined) {
      const unit = presentation.units.get(item.unit)
      if (unit === undefined) throw new Error("Validated item lost its unit")
      sink.writeLine(html`              <td class="metadata">${unitTemplate(unit)}</td>`)
    }
    for (const grouping of presentation.groupingColumns) {
      sink.writeLine(html`              <td class="metadata">${groupingTemplate(item.groupings[grouping])}</td>`)
    }
    for (const period of statement.periods) {
      const value = item.values[period]
      if (value === undefined) throw new Error("Validated item lost its period value")
      appendValue(sink, value)
    }
    sink.writeLine(html`            </tr>`)
    if (sink.exceeded) return
  }

  sink.writeLine(html`          </tbody>
        </table>
      </div>
    </section>`)
}

export const renderTemplate = (presentation: RenderPresentation, sink: HtmlSink): void => {
  const { document } = presentation
  sink.writeLine(html`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${document.entity.name} — ${document.scope.label}</title>
  <style>
${stylesheet}
  </style>
</head>
<body>
  <header>
    <h1>${document.entity.name}</h1>
    <p class="scope">${document.scope.label}</p>
  </header>
  <main>`)
  for (const statement of presentation.statements) {
    appendStatement(presentation, statement, sink)
    if (sink.exceeded) return
  }
  sink.writeLine(html`  </main>
</body>
</html>`)
}

import type { Unit, ValueCell } from "../validation/model.js"
import { HtmlSink, html, type HtmlTemplate } from "./html.js"
import type { RenderPresentation, StatementPresentation } from "./presentation.js"

const stylesheet = html`    :root {
      color-scheme: light;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-synthesis: none;
      --paper: #f6f2e9;
      --sheet: #fffdf8;
      --ink: #171a1c;
      --secondary: #606a6e;
      --rule: #c8c2b7;
      --teal: #1f6f78;
      --teal-wash: #ddecef;
      --error: #9f3f3a;
    }
    * { box-sizing: border-box; }
    body { background: var(--paper); color: var(--ink); margin: 0; }
    [hidden] { display: none !important; }
    a { color: var(--teal); text-underline-offset: 0.2em; }
    a:hover { text-decoration-thickness: 0.12em; }
    :focus-visible { outline: 3px solid var(--teal); outline-offset: 3px; }
    .skip-link {
      background: var(--ink);
      color: var(--sheet);
      left: 1rem;
      padding: 0.75rem 1rem;
      position: fixed;
      top: 1rem;
      transform: translateY(-200%);
      z-index: 10;
    }
    .skip-link:focus { transform: none; }
    .document {
      background: var(--sheet);
      border-inline: 1px solid var(--rule);
      margin: 0 auto;
      max-width: 112rem;
      min-height: 100vh;
    }
    .masthead {
      align-items: baseline;
      border-bottom: 2px solid var(--ink);
      display: flex;
      gap: 1rem 2.5rem;
      justify-content: space-between;
      margin-inline: 2rem;
      padding: 1.25rem 0 1rem;
    }
    h1, h2, p { margin-top: 0; }
    h1, h2, .scope { overflow-wrap: anywhere; }
    h1 { font-size: clamp(1.6rem, 3vw, 2.35rem); letter-spacing: -0.03em; margin-bottom: 0; }
    h2 { font-size: clamp(1.4rem, 2.2vw, 1.9rem); letter-spacing: -0.02em; margin-bottom: 1.25rem; }
    .scope { color: var(--secondary); margin-bottom: 0; text-align: right; }
    .statement-index {
      background: var(--sheet);
      border-bottom: 1px solid var(--rule);
      overflow-x: auto;
      padding: 0 2rem;
      position: sticky;
      top: 0;
      z-index: 5;
    }
    .statement-index ol {
      display: flex;
      gap: 0;
      list-style: none;
      margin: 0;
      min-width: max-content;
      padding: 0;
    }
    .statement-index li { display: flex; }
    .statement-index a {
      align-items: center;
      border-bottom: 3px solid transparent;
      color: var(--ink);
      display: flex;
      gap: 0.65rem;
      min-height: 3.75rem;
      padding: 0.75rem 1.5rem;
      text-decoration: none;
    }
    .statement-index a:hover, .statement-index a:focus-visible {
      border-bottom-color: var(--teal);
      color: var(--teal);
    }
    .index-number { color: var(--teal); font-variant-numeric: tabular-nums; font-weight: 700; }
    .statement {
      display: grid;
      grid-template-columns: 10.5rem minmax(0, 1fr);
      scroll-margin-top: 4.75rem;
    }
    .statement + .statement { border-top: 1px solid var(--rule); }
    .statement-ordinal {
      background: var(--paper);
      border-right: 1px solid var(--rule);
      color: var(--secondary);
      font-size: 0.82rem;
      letter-spacing: 0.08em;
      margin-bottom: 0;
      padding: 2.75rem 1.5rem;
      text-transform: uppercase;
    }
    .statement-ordinal strong {
      color: var(--teal);
      display: block;
      font-size: 1.35rem;
      letter-spacing: 0;
      margin-top: 0.4rem;
      text-transform: none;
    }
    .statement-content { min-width: 0; padding: 2.5rem 3rem 3rem; }
    .table-caption {
      color: var(--secondary);
      font-size: 0.88rem;
      padding: 0 0 0.8rem;
      text-align: left;
    }
    .overflow-cue { color: var(--secondary); display: none; font-size: 0.85rem; margin-bottom: 0.6rem; }
    .table-scroll { max-width: 100%; overflow-x: auto; }
    .table-scroll:focus-visible { outline-offset: 2px; }
    table { border-collapse: collapse; min-width: 100%; scroll-margin-top: 4.75rem; }
    th, td {
      border-bottom: 1px solid var(--rule);
      padding: 0.62rem 0.75rem;
      text-align: right;
      vertical-align: top;
      white-space: nowrap;
    }
    th:first-child, td:first-child, .metadata { text-align: left; }
    thead th {
      border-bottom: 2px solid var(--teal);
      color: var(--teal);
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    tbody th {
      font-weight: 500;
      min-width: 14rem;
      white-space: normal;
    }
    tbody tr:last-child th, tbody tr:last-child td { border-bottom-color: var(--ink); }
    .value { font-variant-numeric: tabular-nums; }
    .metadata, .missing, .unavailable { color: var(--secondary); }
    .missing, .unavailable { font-style: italic; }
    .handoff {
      align-items: start;
      border-bottom: 1px solid var(--rule);
      border-top: 1px solid var(--rule);
      display: grid;
      gap: 0.75rem 1.5rem;
      grid-template-columns: auto minmax(11rem, 0.3fr) minmax(10rem, 1fr) auto;
      margin-top: 1.75rem;
      padding: 1rem 0;
    }
    .copy-button {
      background: var(--sheet);
      border: 1px solid var(--teal);
      border-radius: 0;
      color: var(--teal);
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      min-height: 44px;
      padding: 0.65rem 1rem;
    }
    .copy-button:hover { background: var(--teal-wash); }
    .copy-status { color: var(--teal); font-weight: 700; min-height: 4.5em; }
    .copy-status[data-state="failure"] { color: var(--error); }
    .copy-help { color: var(--secondary); margin-bottom: 0; }
    .native-table-link { align-items: center; display: inline-flex; min-height: 44px; white-space: nowrap; }
    .copy-source { display: none; }
    @media (max-width: 64rem) {
      .document { border-inline: 0; }
      .statement { grid-template-columns: minmax(0, 1fr); }
      .statement-ordinal {
        align-items: baseline;
        background: var(--sheet);
        border-bottom: 1px solid var(--rule);
        border-right: 0;
        display: flex;
        gap: 0.6rem;
        padding: 1rem 2rem;
      }
      .statement-ordinal strong { display: inline; font-size: inherit; margin-top: 0; }
    }
    @media (max-width: 44rem) {
      .masthead { align-items: flex-start; flex-direction: column; margin-inline: 1rem; }
      .scope { text-align: left; }
      .statement-index { padding-inline: 0.25rem; }
      .statement-index a { padding-inline: 0.8rem; }
      .statement-ordinal { padding-inline: 1rem; }
      .statement-content { padding: 1.75rem 1rem 2.25rem; }
      .overflow-cue { display: block; }
      .handoff { align-items: start; grid-template-columns: minmax(0, 1fr); }
      .copy-button { justify-self: start; }
      .copy-status { min-height: 3em; }
      .native-table-link { white-space: normal; }
    }
    @media print {
      :root { --paper: #fff; --sheet: #fff; --ink: #000; --secondary: #333; --rule: #777; --teal: #000; }
      body, .document { background: #fff; border: 0; }
      .skip-link, .statement-index, .statement-ordinal, .overflow-cue, .handoff, .copy-source { display: none !important; }
      .masthead { margin-inline: 0; }
      .statement { display: block; break-before: page; }
      .statement:first-child { break-before: auto; }
      .statement-content { padding: 1.5rem 0; }
      .table-scroll { overflow: visible; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; }
      a { color: #000; text-decoration: none; }
    }`

const behavior = html`  <script>
    (() => {
      "use strict";

      const fallbackCopy = (text, control) => {
        const temporary = document.createElement("textarea");
        temporary.value = text;
        temporary.readOnly = true;
        temporary.tabIndex = -1;
        temporary.setAttribute("aria-hidden", "true");
        temporary.style.position = "fixed";
        temporary.style.left = "-9999px";
        temporary.style.top = "0";
        let copied = false;
        try {
          document.body.append(temporary);
          temporary.focus();
          temporary.select();
          temporary.setSelectionRange(0, temporary.value.length);
          copied = document.execCommand("copy");
        } catch {
          copied = false;
        } finally {
          temporary.remove();
          control.focus();
        }
        return copied;
      };

      const copyText = async (text, control) => {
        try {
          if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
            await navigator.clipboard.writeText(text);
            return true;
          }
        } catch {
          return fallbackCopy(text, control);
        }
        return fallbackCopy(text, control);
      };

      for (const control of document.querySelectorAll("[data-copy-control]")) {
        const source = document.getElementById(control.dataset.copySource || "");
        const status = document.getElementById(control.dataset.copyStatus || "");
        const handoff = control.closest("[data-copy-handoff]");
        if (!(source instanceof HTMLTextAreaElement) || !(status instanceof HTMLElement) || !(handoff instanceof HTMLElement)) continue;

        let text;
        try {
          const parsed = JSON.parse(source.value);
          if (typeof parsed !== "string") continue;
          text = parsed;
        } catch {
          continue;
        }

        let attempt = 0;
        handoff.hidden = false;
        control.addEventListener("click", async () => {
          const currentAttempt = ++attempt;
          status.dataset.state = "pending";
          status.textContent = "Copying…";
          const copied = await copyText(text, control);
          window.setTimeout(() => {
            if (currentAttempt !== attempt) return;
            status.dataset.state = copied ? "success" : "failure";
            status.textContent = copied ? "Copied" : "Copy failed. Use the native table instead.";
          }, 0);
        });
      }
    })();
  </script>`

const formulaPrefix = /^[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*[=+\-@]/u

const periodLabel = (period: RenderPresentation["document"]["periods"][number]): string =>
  period.kind === "instant" ? period.date : `${period.start} – ${period.end}`

const unitText = (unit: Unit): string => `${unit.label} (${unit.measure}, scale ${unit.scale})`

const authorTsvText = (text: string): string => {
  const normalized = text.replace(/[\t\r\n]/gu, " ")
  return formulaPrefix.test(normalized) ? `'${normalized}` : normalized
}

const jsonStringFragment = (text: string): string => JSON.stringify(text).slice(1, -1)

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

const appendAuthorTsvCell = (sink: HtmlSink, value: string): void => {
  sink.write(html`${jsonStringFragment(authorTsvText(value))}`)
}

const appendTsvValue = (sink: HtmlSink, value: ValueCell): void => {
  if (value === null) {
    sink.write(html`${jsonStringFragment("Missing")}`)
  } else if (typeof value === "object") {
    sink.write(html`${jsonStringFragment("Unavailable")}`)
  } else {
    sink.write(html`${jsonStringFragment(value)}`)
  }
}

const appendTsvDelimiter = (sink: HtmlSink, value: "\t" | "\n"): void => {
  sink.write(html`${jsonStringFragment(value)}`)
}

const appendCopySource = (
  presentation: RenderPresentation,
  statementPresentation: StatementPresentation,
  sink: HtmlSink
): void => {
  const { statement, copySourceId } = statementPresentation
  sink.write(html`      <textarea class="copy-source" id="${copySourceId}" readonly hidden aria-hidden="true" tabindex="-1">"`)
  appendAuthorTsvCell(sink, "Item")
  appendTsvDelimiter(sink, "\t")
  appendAuthorTsvCell(sink, "Unit")
  for (const grouping of presentation.groupingColumns) {
    appendTsvDelimiter(sink, "\t")
    appendAuthorTsvCell(sink, grouping)
  }
  for (const periodId of statement.periods) {
    const period = presentation.periods.get(periodId)
    if (period === undefined) throw new Error("Validated statement lost its period")
    appendTsvDelimiter(sink, "\t")
    appendAuthorTsvCell(sink, periodLabel(period))
  }

  for (const item of statement.items) {
    appendTsvDelimiter(sink, "\n")
    appendAuthorTsvCell(sink, item.label)
    const unit = presentation.units.get(item.unit)
    if (unit === undefined) throw new Error("Validated item lost its unit")
    appendTsvDelimiter(sink, "\t")
    appendAuthorTsvCell(sink, unitText(unit))
    for (const grouping of presentation.groupingColumns) {
      const value = item.groupings[grouping]
      if (value === undefined) throw new Error("Validated item lost its grouping value")
      appendTsvDelimiter(sink, "\t")
      if (value !== null) appendAuthorTsvCell(sink, value)
    }
    for (const periodId of statement.periods) {
      const value = item.values[periodId]
      if (value === undefined) throw new Error("Validated item lost its period value")
      appendTsvDelimiter(sink, "\t")
      appendTsvValue(sink, value)
    }
    if (sink.exceeded) return
  }
  sink.writeLine(html`"</textarea>`)
}

const captionTemplate = ({ statement, commonUnit }: StatementPresentation): HtmlTemplate =>
  commonUnit === undefined
    ? html`${statement.label} — Units shown by item`
    : html`${statement.label} — Unit: ${unitText(commonUnit)}`

const appendStatement = (
  presentation: RenderPresentation,
  statementPresentation: StatementPresentation,
  sink: HtmlSink
): void => {
  const {
    statement,
    commonUnit,
    ordinal,
    anchorId,
    tableId,
    copySourceId,
    copyStatusId,
    copyHelpId
  } = statementPresentation
  sink.writeLine(html`    <section class="statement" id="${anchorId}">
      <p class="statement-ordinal">Statement <strong>${ordinal} of ${presentation.statements.length}</strong></p>
      <div class="statement-content">
        <h2>${statement.label}</h2>
        <p class="overflow-cue">Scroll horizontally to review all columns.</p>
        <div class="table-scroll" role="region" aria-label="${statement.label} table. Scroll horizontally to review all columns." tabindex="0">
          <table id="${tableId}">
            <caption class="table-caption">${captionTemplate(statementPresentation)}</caption>
            <thead>
              <tr>
                <th scope="col">Item</th>`)
  if (commonUnit === undefined) sink.writeLine(html`                <th scope="col">Unit</th>`)
  for (const grouping of presentation.groupingColumns) {
    sink.writeLine(html`                <th scope="col">${grouping}</th>`)
  }
  for (const periodId of statement.periods) {
    const period = presentation.periods.get(periodId)
    if (period === undefined) throw new Error("Validated statement lost its period")
    sink.writeLine(html`                <th scope="col">${periodLabel(period)}</th>`)
  }
  sink.writeLine(html`              </tr>
            </thead>
            <tbody>`)

  for (const item of statement.items) {
    sink.writeLine(html`              <tr>
                <th scope="row">${item.label}</th>`)
    if (commonUnit === undefined) {
      const unit = presentation.units.get(item.unit)
      if (unit === undefined) throw new Error("Validated item lost its unit")
      sink.writeLine(html`                <td class="metadata">${unitText(unit)}</td>`)
    }
    for (const grouping of presentation.groupingColumns) {
      sink.writeLine(html`                <td class="metadata">${groupingTemplate(item.groupings[grouping])}</td>`)
    }
    for (const period of statement.periods) {
      const value = item.values[period]
      if (value === undefined) throw new Error("Validated item lost its period value")
      appendValue(sink, value)
    }
    sink.writeLine(html`              </tr>`)
    if (sink.exceeded) return
  }

  sink.writeLine(html`            </tbody>
          </table>
        </div>`)
  appendCopySource(presentation, statementPresentation, sink)
  if (sink.exceeded) return
  sink.writeLine(html`        <div class="handoff" data-copy-handoff hidden>
          <button class="copy-button" type="button" data-copy-control data-copy-source="${copySourceId}" data-copy-status="${copyStatusId}" aria-describedby="${copyHelpId}" aria-label="Copy ${statement.label} for Excel">Copy for Excel</button>
          <span class="copy-status" id="${copyStatusId}" role="status" aria-live="polite" aria-atomic="true"></span>
          <p class="copy-help" id="${copyHelpId}">Copies this statement as tab-separated values for spreadsheet review.</p>
          <a class="native-table-link" href="#${tableId}">View native table</a>
        </div>
      </div>
    </section>`)
}

const appendNavigation = (presentation: RenderPresentation, sink: HtmlSink): void => {
  sink.writeLine(html`    <nav class="statement-index" aria-label="Statements">
      <ol>`)
  for (const { statement, ordinal, anchorId } of presentation.statements) {
    sink.writeLine(html`        <li><a href="#${anchorId}"><span class="index-number">${String(ordinal).padStart(2, "0")}</span><span>${statement.label}</span></a></li>`)
  }
  sink.writeLine(html`      </ol>
    </nav>`)
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
  <a class="skip-link" href="#statements">Skip to statements</a>
  <div class="document">
    <header class="masthead">
      <h1>${document.entity.name}</h1>
      <p class="scope">${document.scope.label}</p>
    </header>`)
  appendNavigation(presentation, sink)
  sink.writeLine(html`    <main id="statements">`)
  for (const statement of presentation.statements) {
    appendStatement(presentation, statement, sink)
    if (sink.exceeded) return
  }
  sink.writeLine(html`    </main>
${behavior}
  </div>
</body>
</html>`)
}

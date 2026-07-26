import type { ApplicationResult, Unit, ValueCell } from "../validation/model.js"
import { HtmlSink, html, type HtmlTemplate } from "./html.js"
import type {
  RenderPresentation,
  StatementCheck,
  StatementPresentation
} from "./presentation.js"

/*
 * Visual direction: "Charter" — a modernized institutional annual report.
 * Cool paper-gray canvas, white sheet, ink rules, system serif for identity
 * only, claret as the single interaction accent. Hierarchy comes from
 * typography, alignment, and accounting rules (single rule above subtotals,
 * double rule below rollup roots) rather than fills or containers.
 */
const stylesheet = html`    :root {
      color-scheme: light;
      font-synthesis: none;
      --bg: #eef0f1;
      --surface: #ffffff;
      --ink: #191b1e;
      --ink-2: #565b61;
      --hairline: #d8dadc;
      --rule-strong: #191b1e;
      --accent: #802636;
      --accent-wash: #f5e9ec;
      --ok: #216e3a;
      --fail: #a4232b;
      --warn: #7a5200;
      --control-border: #82888e;
      --hover-row: #f2f3f4;
      --tooltip-bg: #191b1e;
      --tooltip-ink: #ffffff;
      --serif: ui-serif, Georgia, "Times New Roman", serif;
      --sans: system-ui, -apple-system, "Segoe UI", sans-serif;
      --z-sticky: 3;
      --z-skip: 6;
      --z-tooltip: 9;
    }
    * { box-sizing: border-box; }
    body {
      background: var(--bg);
      color: var(--ink);
      font-family: var(--sans);
      font-size: 1rem;
      line-height: 1.45;
      margin: 0;
    }
    [hidden] { display: none !important; }
    a { color: var(--accent); text-underline-offset: 0.2em; }
    :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .skip-link {
      background: var(--ink);
      color: var(--surface);
      left: 1rem;
      padding: 0.75rem 1rem;
      position: fixed;
      top: 1rem;
      transform: translateY(-200%);
      z-index: var(--z-skip);
    }
    .skip-link:focus { transform: none; }
    .document {
      background: var(--surface);
      border: 1px solid var(--hairline);
      margin: 2.5rem auto;
      max-width: 90rem;
    }
    .masthead {
      align-items: baseline;
      border-bottom: 2px solid var(--rule-strong);
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 2.5rem;
      justify-content: space-between;
      margin-inline: 3rem;
      padding: 2rem 0 1.25rem;
    }
    h1, h2, p { margin-top: 0; }
    h1, h2, .scope { overflow-wrap: anywhere; }
    h1 {
      font-family: var(--serif);
      font-size: 1.75rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      margin-bottom: 0.25rem;
    }
    .scope { color: var(--ink-2); font-size: 0.875rem; margin-bottom: 0; }
    .doc-checks { color: var(--ink-2); font-size: 0.8125rem; margin-bottom: 0; text-align: right; }
    .check-glyph { font-weight: 700; }
    .check-glyph[data-status="satisfied"] { color: var(--ok); }
    .check-glyph[data-status="unsatisfied"] { color: var(--fail); }
    .check-glyph[data-status="error"] { color: var(--warn); }
    .statement-index {
      background: var(--surface);
      border-bottom: 1px solid var(--hairline);
      overflow-x: auto;
      padding: 0 3rem;
      position: sticky;
      top: 0;
      z-index: var(--z-sticky);
    }
    .statement-index ol {
      display: flex;
      gap: 1.75rem;
      list-style: none;
      margin: 0;
      min-width: max-content;
      padding: 0;
    }
    .statement-index a {
      align-items: baseline;
      border-bottom: 2px solid transparent;
      color: var(--ink-2);
      display: flex;
      font-size: 0.8125rem;
      font-weight: 500;
      gap: 0.5rem;
      padding: 0.9rem 0;
      text-decoration: none;
    }
    .statement-index a:hover { color: var(--ink); }
    .statement-index a:focus-visible { outline-offset: -3px; }
    .statement-index a[aria-current="location"] {
      border-bottom-color: var(--accent);
      color: var(--ink);
    }
    .index-number { font-variant-numeric: tabular-nums; }
    .statement { padding: 2.25rem 3rem 2.75rem; scroll-margin-top: 3.5rem; }
    .statement + .statement { border-top: 1px solid var(--hairline); }
    h2 {
      align-items: baseline;
      display: flex;
      font-family: var(--serif);
      font-size: 1.25rem;
      font-weight: 600;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .ordinal {
      color: var(--ink-2);
      font-family: var(--sans);
      font-size: 0.875rem;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }
    .table-tools {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .tools-label { color: var(--ink-2); font-size: 0.75rem; margin-right: 0.25rem; }
    .tools-spacer { flex: 1; }
    .tool-toggle, .tool-button {
      background: var(--surface);
      border: 1px solid var(--control-border);
      border-radius: 4px;
      color: var(--ink);
      cursor: pointer;
      font: 500 0.8125rem var(--sans);
      min-height: 2.25rem;
      padding: 0.3rem 0.7rem;
    }
    .tool-toggle:hover, .tool-button:hover { border-color: var(--ink); }
    .tool-toggle[aria-pressed="true"] {
      background: var(--accent-wash);
      border-color: var(--accent);
      color: var(--accent);
    }
    .tool-toggle[aria-pressed="true"]::before { content: "✓ "; }
    .tool-toggle[aria-pressed="false"] { color: var(--ink-2); }
    .tool-toggle[aria-pressed="false"]::before { content: "○ "; }
    .table-caption {
      caption-side: top;
      color: var(--ink-2);
      font-size: 0.75rem;
      padding: 0 0 0.6rem;
      text-align: left;
    }
    .caption-inner { display: inline-block; left: 0; position: sticky; }
    .overflow-cue { color: var(--ink-2); display: none; font-size: 0.75rem; margin-bottom: 0.5rem; }
    .table-scroll { max-width: 100%; overflow-x: auto; }
    .table-scroll:focus-visible { outline-offset: 2px; }
    table { border-collapse: separate; border-spacing: 0; scroll-margin-top: 3.5rem; }
    th, td {
      border-bottom: 1px solid var(--hairline);
      font-size: 0.8125rem;
      font-weight: 400;
      padding: 0.375rem 0.625rem;
      vertical-align: baseline;
      white-space: nowrap;
    }
    .col-text { text-align: left; }
    thead th {
      border-bottom: 2px solid var(--rule-strong);
      color: var(--ink);
      font-size: 0.75rem;
      font-weight: 600;
    }
    tbody tr:hover > th, tbody tr:hover > td { background: var(--hover-row); }
    tbody tr:last-child > th, tbody tr:last-child > td { border-bottom-color: var(--rule-strong); }
    tbody th {
      font-weight: 400;
      min-width: 14rem;
      text-align: left;
      white-space: normal;
    }
    thead th:first-child, tbody th {
      background: var(--surface);
      box-shadow: inset -1px 0 var(--hairline);
      left: 0;
      position: sticky;
      z-index: 1;
    }
    tbody tr:hover > th { background: var(--hover-row); }
    .item-cell {
      display: block;
      padding-left: calc(1.15rem + var(--depth, 0) * 1.25rem);
      position: relative;
    }
    .toggle-slot {
      left: calc(var(--depth, 0) * 1.25rem - 0.2rem);
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
    }
    .row-toggle {
      background: none;
      border: 0;
      border-radius: 2px;
      color: var(--ink-2);
      cursor: pointer;
      font: inherit;
      line-height: 1;
      padding: 0.35rem;
    }
    .row-toggle::before {
      content: "▾";
      display: inline-block;
      transition: transform 120ms ease-out;
    }
    .row-toggle:hover { color: var(--accent); }
    .row-toggle[aria-expanded="false"]::before { transform: rotate(-90deg); }
    .collapsed-count { color: var(--ink-2); font-size: 0.75rem; }
    .item-description {
      color: var(--ink-2);
      display: block;
      font-size: 0.75rem;
      font-weight: 400;
      margin-top: 0.1rem;
    }
    .row-parent > th, .row-parent > td { border-top: 1px solid var(--rule-strong); font-weight: 650; }
    .row-total > th, .row-total > td { border-bottom: 3px double var(--rule-strong); }
    tbody tr:first-child > th, tbody tr:first-child > td { border-top: 0; }
    tbody tr:has(+ .row-parent) > th, tbody tr:has(+ .row-parent) > td { border-bottom: 0; }
    th.col-num, td.col-num, .value { text-align: right; }
    th.col-num { min-width: 6.5rem; }
    td.col-num, .value { padding-left: 1.5rem; }
    .value { font-variant-numeric: tabular-nums; }
    .metadata, .missing, .unavailable { color: var(--ink-2); }
    .missing, .unavailable { font-style: italic; text-align: right; }
    .checks { border-bottom: 1px solid var(--hairline); margin-top: 1.25rem; }
    .checks summary {
      color: var(--ink-2);
      cursor: pointer;
      font-size: 0.8125rem;
      font-weight: 500;
      padding: 0.6rem 0;
    }
    .checks summary:hover { color: var(--ink); }
    .checks[open] summary { color: var(--ink); }
    .check-table { margin: 0.25rem 0 1rem; min-width: 0; }
    .check-table thead th { border-bottom-width: 1px; }
    .check-table tbody th { font-weight: 400; min-width: 0; }
    .check-status { white-space: nowrap; }
    .check-status[data-status="satisfied"] { color: var(--ok); }
    .check-status[data-status="unsatisfied"] { color: var(--fail); font-weight: 650; }
    .check-status[data-status="error"] { color: var(--warn); }
    .handoff {
      align-items: baseline;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
      margin-top: 1.25rem;
    }
    .copy-button {
      background: var(--surface);
      border: 1px solid var(--accent);
      border-radius: 4px;
      color: var(--accent);
      cursor: pointer;
      font: 600 0.875rem var(--sans);
      min-height: 44px;
      padding: 0.6rem 1rem;
    }
    .copy-button:hover { background: var(--accent-wash); }
    .copy-status { font-size: 0.8125rem; font-weight: 600; min-height: 1.25rem; min-width: 9rem; }
    .copy-status[data-state="failure"] { color: var(--fail); }
    .copy-status[data-state="success"] { color: var(--ok); }
    .copy-help { color: var(--ink-2); font-size: 0.75rem; margin-bottom: 0; }
    .native-table-link { align-items: center; display: inline-flex; font-size: 0.8125rem; margin-left: auto; min-height: 44px; white-space: nowrap; }
    .copy-source { display: none; }
    .tooltip {
      background: var(--tooltip-bg);
      border-radius: 4px;
      color: var(--tooltip-ink);
      font-size: 0.75rem;
      line-height: 1.5;
      max-width: 24rem;
      padding: 0.5rem 0.75rem;
      pointer-events: none;
      position: fixed;
      z-index: var(--z-tooltip);
    }
    .tooltip strong { font-weight: 600; }
    @media (max-width: 64rem) {
      .document { border: 0; margin: 0; }
      .masthead { margin-inline: 1.5rem; }
      .statement-index { padding-inline: 1.5rem; }
      .statement { padding-inline: 1.5rem; }
    }
    @media (max-width: 44rem) {
      .masthead { flex-direction: column; margin-inline: 1rem; padding-top: 1.25rem; }
      .doc-checks { text-align: left; }
      .statement-index { padding-inline: 1rem; }
      .statement { padding: 1.5rem 1rem 2rem; }
      .overflow-cue { display: block; }
      .handoff { align-items: flex-start; flex-direction: column; }
      .native-table-link { white-space: normal; }
    }
    @media (prefers-reduced-motion: reduce) {
      .row-toggle::before { transition: none; }
    }
    @media print {
      :root {
        --bg: #fff;
        --surface: #fff;
        --ink: #000;
        --ink-2: #333;
        --hairline: #999;
        --rule-strong: #000;
        --accent: #000;
        --hover-row: #fff;
      }
      body, .document { background: #fff; border: 0; margin: 0; }
      .skip-link, .statement-index, .table-tools, .overflow-cue, .handoff, .copy-source, .tooltip, .row-toggle, .collapsed-count { display: none !important; }
      tbody tr[hidden] { display: table-row !important; }
      th[data-col][hidden], td[data-col][hidden] { display: table-cell !important; }
      thead th:first-child, tbody th { box-shadow: none; position: static; }
      .masthead { margin-inline: 0; }
      .statement { break-before: page; padding-inline: 0; }
      .statement:first-child { break-before: auto; }
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

      for (const table of document.querySelectorAll("[data-statement-table]")) {
        const statement = table.closest(".statement");
        if (!(statement instanceof HTMLElement)) continue;
        const tools = statement.querySelector("[data-table-tools]");
        const body = table.tBodies[0];
        if (!(tools instanceof HTMLElement) || body === undefined) continue;
        tools.hidden = false;

        const setColumn = (toggle, shown) => {
          toggle.setAttribute("aria-pressed", shown ? "true" : "false");
          const key = toggle.dataset.colToggle || "";
          for (const cell of table.querySelectorAll("[data-col]")) {
            if (cell.dataset.col === key) cell.hidden = !shown;
          }
        };
        const narrowViewport = window.matchMedia("(max-width: 44em)").matches;
        for (const toggle of tools.querySelectorAll("[data-col-toggle]")) {
          toggle.addEventListener("click", () => {
            setColumn(toggle, toggle.getAttribute("aria-pressed") !== "true");
          });
          if (narrowViewport) setColumn(toggle, false);
        }

        const rows = Array.from(body.querySelectorAll("tr[data-row]"));
        const rowByIndex = new Map(rows.map((row) => [row.dataset.row, row]));
        const collapsed = new Set();

        const applyRowState = () => {
          for (const row of rows) {
            let ancestor = row.dataset.parentRow;
            let hidden = false;
            while (ancestor !== undefined && !hidden) {
              hidden = collapsed.has(ancestor);
              ancestor = rowByIndex.get(ancestor)?.dataset.parentRow;
            }
            row.hidden = hidden;
          }
          for (const button of body.querySelectorAll("[data-row-toggle]")) {
            const row = button.closest("tr");
            if (!(row instanceof HTMLTableRowElement)) continue;
            const expanded = !collapsed.has(row.dataset.row);
            button.setAttribute("aria-expanded", expanded ? "true" : "false");
            const label = row.querySelector(".item-label")?.textContent || "row";
            button.setAttribute(
              "aria-label",
              (expanded ? "Collapse " : "Expand ") + label + " detail rows"
            );
            const count = row.querySelector(".collapsed-count");
            if (count instanceof HTMLElement) count.hidden = expanded;
          }
        };

        for (const button of body.querySelectorAll("[data-row-toggle]")) {
          button.hidden = false;
          button.addEventListener("click", () => {
            const row = button.closest("tr");
            if (!(row instanceof HTMLTableRowElement) || row.dataset.row === undefined) return;
            if (collapsed.has(row.dataset.row)) collapsed.delete(row.dataset.row);
            else collapsed.add(row.dataset.row);
            applyRowState();
          });
        }

        tools.querySelector("[data-rows-collapse]")?.addEventListener("click", () => {
          for (const button of body.querySelectorAll("[data-row-toggle]")) {
            const row = button.closest("tr");
            if (row instanceof HTMLTableRowElement && row.dataset.row !== undefined) collapsed.add(row.dataset.row);
          }
          applyRowState();
        });
        tools.querySelector("[data-rows-expand]")?.addEventListener("click", () => {
          collapsed.clear();
          applyRowState();
        });
      }

      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.setAttribute("aria-hidden", "true");
      tooltip.hidden = true;
      document.body.append(tooltip);
      let tooltipTimer = 0;

      const tooltipLine = (label, value) => {
        const line = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = label + ": ";
        line.append(name, value);
        return line;
      };

      const hideTooltip = () => {
        window.clearTimeout(tooltipTimer);
        tooltip.hidden = true;
      };

      const showTooltip = (cell) => {
        const row = cell.closest("tr");
        const table = cell.closest("table");
        if (!(row instanceof HTMLTableRowElement) || !(table instanceof HTMLTableElement)) return;
        const headerRow = table.tHead?.rows[0];
        const header = headerRow?.cells[cell.cellIndex];
        if (header === undefined) return;

        tooltip.replaceChildren();
        const label = row.querySelector(".item-label");
        if (label !== null) tooltip.append(tooltipLine("Item", label.textContent || ""));
        tooltip.append(tooltipLine("Period", header.textContent || ""));
        const unitCell = row.querySelector('[data-col="unit"]');
        const unit = unitCell instanceof HTMLElement
          ? unitCell.dataset.unitFull || unitCell.textContent || ""
          : table.dataset.commonUnit || "";
        if (unit !== "") tooltip.append(tooltipLine("Unit", unit));
        if (headerRow !== undefined) {
          for (const groupingHeader of headerRow.cells) {
            const key = groupingHeader.dataset.col;
            if (key === undefined || !key.startsWith("g")) continue;
            const groupingCell = row.cells[groupingHeader.cellIndex];
            if (groupingCell !== undefined) {
              tooltip.append(tooltipLine(groupingHeader.textContent || "", groupingCell.textContent || ""));
            }
          }
        }
        tooltip.append(tooltipLine("Value", cell.textContent || ""));
        const description = row.dataset.description;
        if (description !== undefined) tooltip.append(tooltipLine("Description", description));

        tooltip.hidden = false;
        const anchor = cell.getBoundingClientRect();
        const size = tooltip.getBoundingClientRect();
        const left = Math.max(8, Math.min(anchor.right - size.width, window.innerWidth - size.width - 8));
        const top = anchor.bottom + 6 + size.height > window.innerHeight
          ? anchor.top - size.height - 6
          : anchor.bottom + 6;
        tooltip.style.left = left + "px";
        tooltip.style.top = Math.max(8, top) + "px";
      };

      document.addEventListener("mouseover", (event) => {
        if (!(event.target instanceof Element)) return;
        const cell = event.target.closest("[data-statement-table] td.value, [data-statement-table] td.missing, [data-statement-table] td.unavailable");
        window.clearTimeout(tooltipTimer);
        if (!(cell instanceof HTMLTableCellElement)) {
          tooltip.hidden = true;
          return;
        }
        tooltipTimer = window.setTimeout(() => showTooltip(cell), 400);
      });
      document.addEventListener("scroll", hideTooltip, true);
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") hideTooltip();
      });

      const indexLinks = new Map();
      for (const link of document.querySelectorAll(".statement-index a[href^='#']")) {
        indexLinks.set(link.getAttribute("href")?.slice(1), link);
      }
      if (indexLinks.size > 0 && typeof IntersectionObserver === "function") {
        const observer = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            const link = indexLinks.get(entry.target.id);
            if (link === undefined) continue;
            if (entry.isIntersecting) {
              for (const other of indexLinks.values()) other.removeAttribute("aria-current");
              link.setAttribute("aria-current", "location");
            }
          }
        }, { rootMargin: "-10% 0px -70% 0px" });
        for (const id of indexLinks.keys()) {
          const section = document.getElementById(id || "");
          if (section !== null) observer.observe(section);
        }
      }
    })();
  </script>`

const spreadsheetControlPrefix = /^[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*["=+\-@]/u

const periodLabel = (period: RenderPresentation["document"]["periods"][number]): string =>
  period.kind === "instant" ? period.date : `${period.start} – ${period.end}`

const unitText = (unit: Unit): string => `${unit.label} (${unit.measure}, scale ${unit.scale})`

/*
 * Display-only transformations. Copied TSV keeps declared identifiers and
 * exact decimal strings verbatim so spreadsheet handoff stays byte-exact.
 */
const groupingDisplayLabel = (identifier: string): string => {
  if (!/^[A-Za-z][A-Za-z0-9]*$/u.test(identifier)) return identifier
  const spaced = identifier
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/\b([A-Z])(?![A-Z])/gu, (_, letter: string) => letter.toLowerCase())
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const groupDigits = (integer: string): string => {
  const lead = integer.length % 3 || 3
  let grouped = integer.slice(0, lead)
  for (let index = lead; index < integer.length; index += 3) {
    grouped += `,${integer.slice(index, index + 3)}`
  }
  return grouped
}

const displayDecimal = (value: string): string => {
  // Validated documents cap decimals at 1,000 digits. Larger values only
  // reach render as byte-budget probes; passing them through untouched keeps
  // rendering from materializing new oversized strings before the sink
  // rejects them.
  if (value.length > 1_024) return value
  const match = /^(-?)(\d+)((?:\.\d+)?)$/u.exec(value)
  if (match === null) return value
  const [, sign, integer, fraction] = match
  if (sign === undefined || integer === undefined || fraction === undefined) return value
  return `${sign}${groupDigits(integer)}${fraction}`
}

const authorTsvText = (text: string): string => {
  const normalized = text.replace(/[\t\r\n]/gu, " ")
  return spreadsheetControlPrefix.test(normalized) ? `'${normalized}` : normalized
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
    sink.writeLine(html`              <td class="value">${displayDecimal(value)}</td>`)
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

const checkStatus = (application: ApplicationResult): HtmlTemplate => {
  switch (application.status) {
    case "satisfied":
      return html`<td class="check-status" data-status="satisfied">= Satisfied</td>`
    case "unsatisfied":
      return html`<td class="check-status" data-status="unsatisfied">≠ Not satisfied</td>`
    case "error":
      return html`<td class="check-status" data-status="error">! Not checked</td>`
  }
}

const checkFormula = (check: StatementCheck): string =>
  `${check.parent.label} = ${check.children.map(({ label }) => label).join(" + ")}`

const checkIssueSummary = (
  applications: ReadonlyArray<ApplicationResult>
): string | undefined => {
  const unsatisfied = applications.filter(({ status }) => status === "unsatisfied").length
  const notChecked = applications.filter(({ status }) => status === "error").length
  const issues = [
    ...(unsatisfied === 0 ? [] : [`${unsatisfied} not satisfied`]),
    ...(notChecked === 0 ? [] : [`${notChecked} not checked`])
  ]
  return issues.length === 0 ? undefined : issues.join(" · ")
}

const appendChecks = (
  statementPresentation: StatementPresentation,
  sink: HtmlSink
): void => {
  const { checks, statement } = statementPresentation
  if (checks.length === 0) return
  const issueSummary = checkIssueSummary(checks.map(({ application }) => application))
  const summary = issueSummary === undefined
    ? `${checks.length} · all satisfied`
    : `${checks.length} · ${issueSummary}`
  const itemsById = new Map(statement.items.map((item) => [item.id, item]))
  sink.writeLine(html`        <details class="checks">
          <summary>Rollup checks — ${summary}</summary>
          <div class="table-scroll" role="region" aria-label="${statement.label} rollup checks. Scroll horizontally to review all columns." tabindex="0">
            <table class="check-table">
              <thead>
                <tr>
                  <th scope="col" class="col-text">Check</th>
                  <th scope="col" class="col-text">Period</th>
                  <th scope="col" class="col-num">Actual</th>
                  <th scope="col" class="col-num">Expected</th>
                  <th scope="col" class="col-num">Difference</th>
                  <th scope="col" class="col-num">Tolerance</th>
                  <th scope="col" class="col-text">Result</th>
                </tr>
              </thead>
              <tbody>`)
  for (const check of checks) {
    const { application } = check
    sink.writeLine(html`                <tr>
                  <th scope="row">${checkFormula(check)}</th>
                  <td class="metadata">${periodLabel(check.period)}</td>`)
    if (application.status === "error") {
      const cell = itemsById.get(application.cell.item)
      const reason = application.reason === "missing-value" ? "missing" : "unavailable"
      sink.writeLine(html`                  <td class="metadata col-text" colspan="4">Value for ${cell?.label ?? application.cell.item} is ${reason}</td>`)
    } else {
      sink.writeLine(html`                  <td class="value">${application.actual}</td>
                  <td class="value">${application.expected}</td>
                  <td class="value">${application.difference}</td>
                  <td class="value">${application.tolerance}</td>`)
    }
    sink.writeLine(checkStatus(application))
    sink.writeLine(html`                </tr>`)
    if (sink.exceeded) return
  }
  sink.writeLine(html`              </tbody>
            </table>
          </div>
        </details>`)
}

const appendTableTools = (
  presentation: RenderPresentation,
  statementPresentation: StatementPresentation,
  sink: HtmlSink
): void => {
  const { commonUnit, items } = statementPresentation
  const hasParents = items.some(({ isParent }) => isParent)
  const hasColumnToggles = commonUnit === undefined || presentation.groupingColumns.length > 0
  if (!hasParents && !hasColumnToggles) return
  sink.writeLine(html`        <div class="table-tools" data-table-tools hidden>`)
  if (hasColumnToggles) {
    sink.writeLine(html`          <span class="tools-label">Columns</span>`)
    if (commonUnit === undefined) {
      sink.writeLine(html`          <button class="tool-toggle" type="button" data-col-toggle="unit" aria-pressed="true">Unit</button>`)
    }
    for (const [index, grouping] of presentation.groupingColumns.entries()) {
      sink.writeLine(html`          <button class="tool-toggle" type="button" data-col-toggle="g${index}" aria-pressed="true">${groupingDisplayLabel(grouping)}</button>`)
    }
  }
  if (hasParents) {
    sink.writeLine(html`          <span class="tools-spacer"></span>
          <button class="tool-button" type="button" data-rows-collapse>Collapse all</button>
          <button class="tool-button" type="button" data-rows-expand>Expand all</button>`)
  }
  sink.writeLine(html`        </div>`)
}

const rowOpening = (
  statementPresentation: StatementPresentation,
  index: number
): HtmlTemplate => {
  const { items } = statementPresentation
  const presentation = items[index]
  if (presentation === undefined) throw new Error("Validated statement lost its item presentation")
  const { item, depth, isParent, parentIndex } = presentation
  const classes = [
    ...(isParent ? ["row-parent"] : []),
    ...(isParent && depth === 0 ? ["row-total"] : [])
  ]
  const classAttribute = classes.length === 0 ? html`` : html` class="${classes.join(" ")}"`
  const parentAttribute = parentIndex === undefined ? html`` : html` data-parent-row="${parentIndex}"`
  const depthAttribute = depth === 0 ? html`` : html` style="--depth: ${depth}"`
  const descriptionAttribute = item.description === undefined
    ? html``
    : html` data-description="${item.description}"`
  return html`              <tr data-row="${index}"${parentAttribute}${classAttribute}${depthAttribute}${descriptionAttribute}>`
}

const itemDescription = (description: string | undefined): HtmlTemplate =>
  description === undefined
    ? html``
    : html`<span class="item-description">${description}</span>`

const itemCell = (
  statementPresentation: StatementPresentation,
  index: number
): HtmlTemplate => {
  const presentation = statementPresentation.items[index]
  if (presentation === undefined) throw new Error("Validated statement lost its item presentation")
  const { item, isParent, descendantCount } = presentation
  if (!isParent) {
    return html`                <th scope="row"><span class="item-cell"><span class="toggle-slot"></span><span class="item-label">${item.label}</span>${itemDescription(item.description)}</span></th>`
  }
  return html`                <th scope="row"><span class="item-cell"><span class="toggle-slot"><button class="row-toggle" type="button" hidden data-row-toggle aria-expanded="true" aria-label="Collapse ${item.label} detail rows"></button></span><span class="item-label">${item.label}</span> <span class="collapsed-count" hidden>· ${descendantCount} ${descendantCount === 1 ? "row" : "rows"}</span>${itemDescription(item.description)}</span></th>`
}

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
  const commonUnitAttribute = commonUnit === undefined
    ? html``
    : html` data-common-unit="${unitText(commonUnit)}"`
  sink.writeLine(html`    <section class="statement" id="${anchorId}">
      <h2><span class="ordinal">${String(ordinal).padStart(2, "0")}</span>${statement.label}</h2>`)
  appendTableTools(presentation, statementPresentation, sink)
  sink.writeLine(html`      <p class="overflow-cue">Scroll horizontally to review all columns.</p>
      <div class="table-scroll" role="region" aria-label="${statement.label} table. Scroll horizontally to review all columns." tabindex="0">
        <table id="${tableId}" data-statement-table${commonUnitAttribute}>
          <caption class="table-caption"><span class="caption-inner">${captionTemplate(statementPresentation)}</span></caption>
          <thead>
            <tr>
              <th scope="col" class="col-text">Item</th>`)
  if (commonUnit === undefined) sink.writeLine(html`              <th scope="col" class="col-text" data-col="unit">Unit</th>`)
  for (const [index, grouping] of presentation.groupingColumns.entries()) {
    sink.writeLine(html`              <th scope="col" class="col-text" data-col="g${index}">${groupingDisplayLabel(grouping)}</th>`)
  }
  for (const periodId of statement.periods) {
    const period = presentation.periods.get(periodId)
    if (period === undefined) throw new Error("Validated statement lost its period")
    sink.writeLine(html`              <th scope="col" class="col-num">${periodLabel(period)}</th>`)
  }
  sink.writeLine(html`            </tr>
          </thead>
          <tbody>`)

  for (const [index, itemPresentation] of statementPresentation.items.entries()) {
    const { item, unit } = itemPresentation
    sink.writeLine(rowOpening(statementPresentation, index))
    sink.writeLine(itemCell(statementPresentation, index))
    if (commonUnit === undefined) {
      sink.writeLine(html`                <td class="metadata col-text" data-col="unit" data-unit-full="${unitText(unit)}">${unit.label}</td>`)
    }
    for (const [groupingIndex, grouping] of presentation.groupingColumns.entries()) {
      sink.writeLine(html`                <td class="metadata col-text" data-col="g${groupingIndex}">${groupingTemplate(item.groupings[grouping])}</td>`)
    }
    for (const period of statement.periods) {
      const value = item.values[period]
      if (value === undefined) throw new Error("Validated item lost its period value")
      appendValue(sink, value)
    }
    sink.writeLine(html`              </tr>`)
    if (sink.exceeded) return
  }

  sink.writeLine(html`          </tbody>
        </table>
      </div>`)
  appendChecks(statementPresentation, sink)
  if (sink.exceeded) return
  appendCopySource(presentation, statementPresentation, sink)
  if (sink.exceeded) return
  sink.writeLine(html`      <div class="handoff" data-copy-handoff hidden>
        <button class="copy-button" type="button" data-copy-control data-copy-source="${copySourceId}" data-copy-status="${copyStatusId}" aria-describedby="${copyHelpId}" aria-label="Copy ${statement.label} for Excel">Copy for Excel</button>
        <span class="copy-status" id="${copyStatusId}" role="status" aria-live="polite" aria-atomic="true"></span>
        <p class="copy-help" id="${copyHelpId}">Copies this statement as tab-separated values for spreadsheet review.</p>
        <a class="native-table-link" href="#${tableId}">View native table</a>
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

const documentChecks = (presentation: RenderPresentation): HtmlTemplate => {
  const { calculations } = presentation
  if (calculations.status === "not-defined") {
    return html`<p class="doc-checks">No rollup checks defined</p>`
  }
  const total = calculations.applications.length
  const checksWord = total === 1 ? "check" : "checks"
  if (calculations.status === "consistent") {
    return html`<p class="doc-checks"><span class="check-glyph" data-status="satisfied">=</span> ${total} rollup ${checksWord} · all consistent</p>`
  }
  const issueSummary = checkIssueSummary(calculations.applications)
  if (issueSummary === undefined) throw new Error("Inconsistent calculations lost their issue")
  const status = calculations.applications.some(({ status }) => status === "unsatisfied")
    ? "unsatisfied"
    : "error"
  const glyph = status === "unsatisfied" ? "≠" : "!"
  return html`<p class="doc-checks"><span class="check-glyph" data-status="${status}">${glyph}</span> ${total} rollup ${checksWord} · ${issueSummary}</p>`
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
      <div>
        <h1>${document.entity.name}</h1>
        <p class="scope">${document.scope.label}</p>
      </div>
      ${documentChecks(presentation)}
    </header>`)
  appendNavigation(presentation, sink)
  sink.writeLine(html`    <main id="statements" tabindex="-1">`)
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

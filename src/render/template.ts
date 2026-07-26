import type { ApplicationResult, Unit, ValueCell } from "../validation/model.js"
import { HtmlSink, html, type HtmlTemplate } from "./html.js"
import type {
  RenderPresentation,
  StatementCheck,
  StatementPresentation
} from "./presentation.js"

/*
 * Visual direction: "Folio" — a bound financial report. A deep oxblood title
 * band anchors the document; statements fill one 72rem measure on white, like
 * filed statements spanning a page. System serif for identity only, claret as
 * the committed accent, and hierarchy from typography, alignment, and
 * accounting rules (single rule above subtotals, double rule below rollup
 * roots) rather than fills or containers.
 */
const stylesheet = html`    :root {
      color-scheme: light;
      font-synthesis: none;
      --surface: #ffffff;
      --band: #3a141d;
      --band-ink: #ffffff;
      --band-ink-2: #d9bcc3;
      --band-ok: #93d8a8;
      --band-fail: #f4abaf;
      --band-warn: #e8c481;
      --ink: #1a1c20;
      --ink-2: #54575d;
      --hairline: #dcdde0;
      --rule-strong: #1a1c20;
      --accent: #802636;
      --accent-hover: #6e2130;
      --accent-active: #5f1c29;
      --ok: #216e3a;
      --fail: #a4232b;
      --warn: #7a5200;
      --control-border: #c6c9ce;
      --hover-row: #f6f4f4;
      --footer-bg: #f4f4f5;
      --tooltip-bg: #1a1c20;
      --tooltip-ink: #ffffff;
      --serif: ui-serif, Georgia, "Times New Roman", serif;
      --sans: system-ui, -apple-system, "Segoe UI", sans-serif;
      --measure: 72rem;
      --gutter: 2.5rem;
      /* Center a 72rem measure inside every full-width band without wrappers. */
      --band-pad: max(var(--gutter), calc(50% - var(--measure) / 2));
      --z-sticky: 3;
      --z-skip: 6;
      --z-tooltip: 9;
    }
    * { box-sizing: border-box; }
    body {
      background: var(--surface);
      color: var(--ink);
      font-family: var(--sans);
      font-size: 1rem;
      line-height: 1.5;
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
    .masthead {
      align-items: baseline;
      background: var(--band);
      color: var(--band-ink);
      display: flex;
      flex-wrap: wrap;
      gap: 1rem 2.5rem;
      justify-content: space-between;
      padding: 3rem var(--band-pad) 2.25rem;
    }
    .masthead :focus-visible { outline-color: var(--band-ink); }
    h1, h2, p { margin-top: 0; }
    h1, h2, .scope { overflow-wrap: anywhere; }
    h1 {
      font-family: var(--serif);
      font-size: 2.5rem;
      font-weight: 600;
      letter-spacing: -0.015em;
      line-height: 1.15;
      margin-bottom: 0.4rem;
    }
    .scope { color: var(--band-ink-2); font-size: 1rem; margin-bottom: 0; }
    .doc-checks { color: var(--band-ink-2); font-size: 0.875rem; margin-bottom: 0; text-align: right; }
    .doc-checks-link { color: inherit; }
    .doc-checks-link:hover { color: var(--band-ink); }
    .masthead .check-glyph[data-status="satisfied"] { color: var(--band-ok); }
    .masthead .check-glyph[data-status="unsatisfied"] { color: var(--band-fail); }
    .masthead .check-glyph[data-status="error"] { color: var(--band-warn); }
    .visually-hidden {
      block-size: 1px;
      clip-path: inset(50%);
      inline-size: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      white-space: nowrap;
    }
    .check-glyph { font-weight: 700; }
    .check-glyph[data-status="satisfied"] { color: var(--ok); }
    .check-glyph[data-status="unsatisfied"] { color: var(--fail); }
    .check-glyph[data-status="error"] { color: var(--warn); }
    .statement-index {
      background: var(--surface);
      border-bottom: 1px solid var(--hairline);
      overflow-x: auto;
      padding: 0 var(--band-pad);
      position: sticky;
      top: 0;
      z-index: var(--z-sticky);
    }
    .statement-index ol {
      display: flex;
      gap: 2rem;
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
      font-size: 0.875rem;
      font-weight: 500;
      gap: 0.5rem;
      padding: 1rem 0;
      text-decoration: none;
    }
    .statement-index a:hover { color: var(--ink); }
    .statement-index a:focus-visible { outline-offset: -3px; }
    .statement-index a[aria-current="location"] {
      border-bottom-color: var(--accent);
      color: var(--ink);
    }
    .index-number { color: var(--accent); font-variant-numeric: tabular-nums; font-weight: 600; }
    .index-flag { font-size: 0.8125rem; }
    .statement { padding: 3rem var(--band-pad) 3.5rem; scroll-margin-top: 4rem; }
    .statement + .statement { border-top: 1px solid var(--hairline); }
    h2 {
      align-items: baseline;
      display: flex;
      font-family: var(--serif);
      font-size: 1.5rem;
      font-weight: 600;
      gap: 0.85rem;
      margin-bottom: 1.5rem;
    }
    .ordinal {
      color: var(--accent);
      flex: 0 0 auto;
      font-family: var(--sans);
      font-size: 0.9375rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .table-tools {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: flex-end;
      margin-bottom: 1rem;
    }
    .tools-spacer { display: none; }
    .tool-button, .col-menu summary {
      align-items: center;
      background: var(--surface);
      border: 1px solid var(--control-border);
      border-radius: 4px;
      color: var(--ink);
      cursor: pointer;
      display: inline-flex;
      font: 500 0.8125rem var(--sans);
      min-height: 2.25rem;
      padding: 0.4rem 0.9rem;
    }
    .tool-button:hover, .col-menu summary:hover { background: #f7f7f8; border-color: var(--ink-2); }
    .tool-button:active, .col-menu summary:active { background: var(--hover-row); }
    .col-menu { position: relative; }
    .col-menu summary { gap: 0.45rem; list-style: none; }
    .col-menu summary::-webkit-details-marker { display: none; }
    .col-menu summary::after { color: var(--ink-2); content: "▾"; font-size: 0.7rem; }
    .col-menu[open] summary { background: var(--hover-row); }
    .col-menu-panel {
      background: var(--surface);
      border: 1px solid var(--control-border);
      border-radius: 4px;
      display: grid;
      left: auto;
      min-width: 12rem;
      padding: 0.35rem;
      position: absolute;
      right: 0;
      top: calc(100% + 0.3rem);
      z-index: 2;
    }
    .col-menu-panel label {
      align-items: center;
      border-radius: 3px;
      cursor: pointer;
      display: flex;
      font-size: 0.875rem;
      gap: 0.6rem;
      min-height: 2.25rem;
      padding: 0.3rem 0.6rem;
      white-space: nowrap;
    }
    .col-menu-panel label:hover { background: var(--hover-row); }
    .col-menu-panel input { accent-color: var(--accent); height: 1rem; margin: 0; width: 1rem; }
    .table-caption {
      caption-side: top;
      color: var(--ink-2);
      font-size: 0.8125rem;
      padding: 0 0 0.75rem;
      text-align: left;
    }
    .caption-inner { display: inline-block; left: 0; position: sticky; }
    .overflow-cue { color: var(--ink-2); display: none; font-size: 0.8125rem; margin-bottom: 0.5rem; }
    .table-scroll { max-width: 100%; overflow-x: auto; }
    .table-scroll:focus-visible { outline-offset: 2px; }
    table { border-collapse: separate; border-spacing: 0; scroll-margin-top: 4rem; width: 100%; }
    th, td {
      border-bottom: 1px solid var(--hairline);
      font-size: 0.875rem;
      font-weight: 400;
      padding: 0.55rem 0.875rem;
      vertical-align: baseline;
      white-space: nowrap;
    }
    .col-text { text-align: left; }
    thead th {
      border-bottom: 2px solid var(--rule-strong);
      color: var(--ink);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    /* Filed statements span the page: the item column absorbs spare width so
       figures keep to the right edge of the measure. */
    [data-statement-table] thead th:first-child { width: 42%; }
    tbody tr:hover > th, tbody tr:hover > td { background: var(--hover-row); }
    tbody tr:last-child > th, tbody tr:last-child > td { border-bottom-color: var(--rule-strong); }
    tbody th {
      font-weight: 400;
      min-width: 16rem;
      text-align: left;
      white-space: normal;
    }
    thead th:first-child, tbody th {
      background: var(--surface);
      left: 0;
      position: sticky;
      z-index: 1;
    }
    [data-overflowing] thead th:first-child, [data-overflowing] tbody th {
      box-shadow: inset -1px 0 var(--hairline);
    }
    tbody tr:hover > th { background: var(--hover-row); }
    .item-cell {
      display: block;
      padding-left: calc(1.5rem + var(--depth, 0) * 1.5rem);
      position: relative;
    }
    .toggle-slot {
      left: calc(var(--depth, 0) * 1.5rem - 0.25rem);
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
    }
    .row-toggle {
      align-items: center;
      background: none;
      border: 0;
      border-radius: 2px;
      color: var(--ink-2);
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      justify-content: center;
      line-height: 1;
      /* WCAG 2.5.8: the disclosure glyph alone is ~13px; keep the target ≥ 24px. */
      min-block-size: 24px;
      min-inline-size: 24px;
      padding: 0.2rem;
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
    .row-heading > th { font-weight: 600; padding-top: 0.85rem; }
    .row-heading > th, .row-heading > td { border-bottom-color: transparent; }
    .row-parent > th, .row-parent > td { border-top: 1px solid var(--rule-strong); font-weight: 650; }
    .row-total > th, .row-total > td { border-bottom: 3px double var(--rule-strong); }
    tbody tr:first-child > th, tbody tr:first-child > td { border-top: 0; }
    tbody tr:has(+ .row-parent) > th, tbody tr:has(+ .row-parent) > td { border-bottom: 0; }
    th.col-num, td.col-num, .value { text-align: right; }
    th.col-num { min-width: 8rem; }
    td.col-num, .value { padding-left: 1.75rem; }
    .value { font-variant-numeric: tabular-nums; }
    .metadata, .missing, .unavailable { color: var(--ink-2); }
    .missing, .unavailable { font-style: italic; text-align: right; }
    .checks { margin-top: 1.75rem; scroll-margin-top: 4rem; }
    .checks summary {
      color: var(--ink-2);
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.75rem 0;
    }
    .checks summary:hover { color: var(--ink); }
    .checks[open] summary { color: var(--ink); }
    .check-table { margin: 0.5rem 0 1.25rem; min-width: 0; }
    .check-table thead th { border-bottom-width: 1px; }
    .check-table tbody th { font-weight: 400; min-width: 0; }
    .check-status { white-space: nowrap; }
    .check-status[data-status="satisfied"] { color: var(--ok); }
    .check-status[data-status="unsatisfied"] { color: var(--fail); font-weight: 650; }
    .check-status[data-status="error"] { color: var(--warn); }
    .handoff {
      align-items: center;
      border-top: 1px solid var(--hairline);
      display: grid;
      gap: 0.5rem 1.5rem;
      grid-template-columns: minmax(0, 1fr) auto;
      margin-top: 2rem;
      padding-top: 1.5rem;
    }
    .handoff-action { align-items: center; display: flex; gap: 1rem; }
    .copy-button {
      background: var(--accent);
      border: 1px solid var(--accent);
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      font: 600 0.875rem var(--sans);
      min-height: 44px;
      padding: 0.65rem 1.3rem;
    }
    .copy-button:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
    .copy-button:active { background: var(--accent-active); }
    .copy-status { font-size: 0.875rem; font-weight: 600; min-width: 8rem; }
    .copy-status[data-state="failure"] { color: var(--fail); }
    .copy-status[data-state="success"] { color: var(--ok); }
    .copy-help { color: var(--ink-2); font-size: 0.8125rem; grid-column: 1; margin-bottom: 0; }
    .native-table-link {
      align-items: center;
      display: inline-flex;
      font-size: 0.875rem;
      grid-column: 2;
      grid-row: 1;
      justify-self: end;
      min-height: 44px;
      white-space: nowrap;
    }
    .copy-source { display: none; }
    .colophon { background: var(--footer-bg); border-top: 1px solid var(--hairline); margin: 0; padding: 1.5rem var(--band-pad) 2rem; }
    .colophon p { color: var(--ink-2); font-size: 0.8125rem; margin: 0; max-width: 75ch; }
    .tooltip {
      background: var(--tooltip-bg);
      border-radius: 4px;
      color: var(--tooltip-ink);
      font-size: 0.8125rem;
      line-height: 1.5;
      max-width: 26rem;
      padding: 0.55rem 0.8rem;
      pointer-events: none;
      position: fixed;
      z-index: var(--z-tooltip);
    }
    .tooltip strong { font-weight: 600; }
    @media (max-width: 64rem) {
      :root { --gutter: 1.5rem; }
      .masthead { padding-block: 2rem 1.5rem; }
      h1 { font-size: 2rem; }
    }
    @media (max-width: 44rem) {
      :root { --gutter: 1rem; }
      .masthead { flex-direction: column; gap: 0.75rem; padding-block: 1.5rem 1.25rem; }
      h1 { font-size: 1.75rem; }
      .doc-checks { text-align: left; }
      .statement { padding-block: 2rem 2.5rem; }
      .overflow-cue { display: block; }
      .handoff { grid-template-columns: minmax(0, 1fr); }
      .native-table-link { grid-column: 1; grid-row: auto; justify-self: start; white-space: normal; }
    }
    @media (prefers-reduced-motion: reduce) {
      .row-toggle::before { transition: none; }
    }
    @media print {
      :root {
        --surface: #fff;
        --band: #fff;
        --band-ink: #000;
        --band-ink-2: #333;
        --band-ok: #000;
        --band-fail: #000;
        --band-warn: #000;
        --footer-bg: #fff;
        --ink: #000;
        --ink-2: #333;
        --hairline: #999;
        --rule-strong: #000;
        --accent: #000;
        --hover-row: #fff;
      }
      body { background: #fff; margin: 0; }
      .skip-link, .statement-index, .table-tools, .overflow-cue, .handoff, .copy-source, .tooltip, .row-toggle, .collapsed-count { display: none !important; }
      tbody tr[hidden] { display: table-row !important; }
      th[data-col][hidden], td[data-col][hidden] { display: table-cell !important; }
      thead th:first-child, tbody th { box-shadow: none; position: static; }
      .masthead { border-bottom: 2px solid #000; padding: 0 0 1rem; }
      .statement { break-before: page; padding-inline: 0; }
      .statement:first-child { break-before: auto; }
      .colophon { padding-inline: 0; }
      .table-scroll { overflow: visible; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; }
      a { color: #000; text-decoration: none; }
    }`

const behavior = html`  <script>
    (() => {
      "use strict";

      // Keyboard access to value cells is a roving tabindex per table; row
      // collapse can hide the current tab stop, so collapse wiring calls the
      // table's registered repair to move it back onto a visible cell.
      const rovingRepairs = new Map();

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
        const scroller = table.closest(".table-scroll");
        const updateOverflow = () => {
          if (!(scroller instanceof HTMLElement)) return;
          if (scroller.scrollWidth > scroller.clientWidth) scroller.dataset.overflowing = "true";
          else delete scroller.dataset.overflowing;
        };
        updateOverflow();
        window.addEventListener("resize", updateOverflow);

        const statement = table.closest(".statement");
        if (!(statement instanceof HTMLElement)) continue;
        const tools = statement.querySelector("[data-table-tools]");
        const body = table.tBodies[0];
        if (!(tools instanceof HTMLElement) || body === undefined) continue;
        tools.hidden = false;

        const setColumn = (key, shown) => {
          for (const cell of table.querySelectorAll("[data-col]")) {
            if (cell.dataset.col === key) cell.hidden = !shown;
          }
          updateOverflow();
        };
        // Viewport width supplies only the initial default. Resizing must not
        // discard the analyst's explicit checkbox choices.
        const narrowViewport = window.matchMedia("(max-width: 44em)").matches;
        for (const box of tools.querySelectorAll("input[data-col-toggle]")) {
          box.addEventListener("change", () => {
            setColumn(box.dataset.colToggle || "", box.checked);
          });
          if (narrowViewport) {
            box.checked = false;
            setColumn(box.dataset.colToggle || "", false);
          }
        }
        const menu = tools.querySelector("details[data-col-menu]");
        if (menu instanceof HTMLDetailsElement) {
          const menuSummary = menu.querySelector("summary");
          document.addEventListener("click", (event) => {
            if (event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
          });
          menu.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            menu.open = false;
            if (menuSummary instanceof HTMLElement) menuSummary.focus();
          });
        }

        const rows = Array.from(body.querySelectorAll("tr[data-row], tr.row-heading"));
        const rowByIndex = new Map(
          rows.filter((row) => row.dataset.row !== undefined).map((row) => [row.dataset.row, row])
        );
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
          updateOverflow();
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
          rovingRepairs.get(table)?.();
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
      // aria-hidden keeps the singleton out of the reading order; a focused
      // cell still exposes it through aria-describedby, which includes
      // referenced hidden content in the accessible description.
      tooltip.setAttribute("aria-hidden", "true");
      tooltip.id = "cell-context";
      tooltip.hidden = true;
      document.body.append(tooltip);
      let tooltipTimer = 0;
      let describedCell = null;

      const describeCell = (cell) => {
        if (describedCell === cell) return;
        describedCell?.removeAttribute("aria-describedby");
        describedCell = cell;
        cell?.setAttribute("aria-describedby", tooltip.id);
      };

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
        describeCell(null);
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
        // Keyboard focus owns the shared tooltip until focus leaves. Pointer
        // hover must not replace the accessible description with another
        // cell's context.
        if (describedCell !== null && document.activeElement === describedCell) return;
        if (!(cell instanceof HTMLTableCellElement)) {
          if (describedCell === null) tooltip.hidden = true;
          return;
        }
        tooltipTimer = window.setTimeout(() => {
          showTooltip(cell);
        }, 400);
      });
      document.addEventListener("scroll", () => {
        // Focusing a cell may scroll it into view; keep the focus tooltip
        // anchored instead of dismissing it under the analyst's focus. While
        // the cell itself is scrolled offscreen the tooltip hides rather than
        // floating detached at the viewport edge.
        if (describedCell !== null && document.activeElement === describedCell) {
          const anchor = describedCell.getBoundingClientRect();
          if (anchor.bottom < 0 || anchor.top > window.innerHeight) tooltip.hidden = true;
          else showTooltip(describedCell);
          return;
        }
        hideTooltip();
      }, true);
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") hideTooltip();
      });

      const valueCellSelector = "td.value, td.missing, td.unavailable";
      for (const table of document.querySelectorAll("[data-statement-table]")) {
        const body = table.tBodies[0];
        if (body === undefined) continue;
        const cells = Array.from(body.querySelectorAll(valueCellSelector));
        const firstCell = cells[0];
        if (firstCell === undefined) continue;
        for (const cell of cells) cell.tabIndex = -1;
        firstCell.tabIndex = 0;

        const setRovingCell = (cell) => {
          for (const other of cells) other.tabIndex = -1;
          cell.tabIndex = 0;
        };
        rovingRepairs.set(table, () => {
          const current = cells.find((cell) => cell.tabIndex === 0);
          if (current !== undefined && !current.closest("tr")?.hidden) return;
          const visible = cells.find((cell) => !cell.closest("tr")?.hidden);
          if (visible !== undefined) setRovingCell(visible);
        });

        const rowValueCells = (row) =>
          Array.from(row.cells).filter((cell) => cell.matches(valueCellSelector));
        table.addEventListener("focusin", (event) => {
          const cell = event.target;
          if (!(cell instanceof HTMLTableCellElement) || !cell.matches(valueCellSelector)) return;
          setRovingCell(cell);
          window.clearTimeout(tooltipTimer);
          showTooltip(cell);
          describeCell(cell);
        });
        table.addEventListener("focusout", (event) => {
          if (event.target === describedCell) hideTooltip();
        });
        table.addEventListener("keydown", (event) => {
          const cell = event.target;
          if (!(cell instanceof HTMLTableCellElement) || !cell.matches(valueCellSelector)) return;
          const row = cell.closest("tr");
          if (!(row instanceof HTMLTableRowElement)) return;
          let target;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            const siblings = rowValueCells(row);
            target = siblings[siblings.indexOf(cell) + (event.key === "ArrowLeft" ? -1 : 1)];
          } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            const rows = Array.from(body.rows).filter(
              (candidate) => !candidate.hidden && rowValueCells(candidate).length > 0
            );
            const nextRow = rows[rows.indexOf(row) + (event.key === "ArrowUp" ? -1 : 1)];
            const candidate = nextRow?.cells[cell.cellIndex];
            if (candidate !== undefined && candidate.matches(valueCellSelector)) target = candidate;
          }
          if (target === undefined) return;
          event.preventDefault();
          target.focus();
        });
      }

      const indexLinks = new Map();
      for (const link of document.querySelectorAll(".statement-index a[href^='#']")) {
        indexLinks.set(link.getAttribute("href")?.slice(1), link);
      }
      if (indexLinks.size > 0 && typeof IntersectionObserver === "function") {
        const links = Array.from(indexLinks.values());
        const lastLink = links[links.length - 1];
        const setCurrent = (link) => {
          for (const other of links) other.removeAttribute("aria-current");
          link.setAttribute("aria-current", "location");
        };
        // The observer band can never reach a final statement shorter than the
        // band offset, so the scrolled-to-end position marks the last
        // statement explicitly. A page that cannot scroll never qualifies.
        const atScrolledEnd = () => {
          const root = document.documentElement;
          return root.scrollHeight > window.innerHeight + 2 &&
            window.scrollY + window.innerHeight >= root.scrollHeight - 2;
        };
        const observer = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            const link = indexLinks.get(entry.target.id);
            if (link === undefined || !entry.isIntersecting) continue;
            setCurrent(atScrolledEnd() && lastLink !== undefined ? lastLink : link);
          }
        }, { rootMargin: "-10% 0px -70% 0px" });
        for (const id of indexLinks.keys()) {
          const section = document.getElementById(id || "");
          if (section !== null) observer.observe(section);
        }
        window.addEventListener("scroll", () => {
          if (atScrolledEnd() && lastLink !== undefined) setCurrent(lastLink);
        }, { passive: true });
      }
    })();
  </script>`

const spreadsheetControlPrefix = /^[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*["=+\-@]/u

const periodLabel = (period: RenderPresentation["document"]["periods"][number]): string =>
  period.kind === "instant" ? period.date : `${period.start} – ${period.end}`

const unitText = (unit: Unit): string => `${unit.label} (${unit.measure}, scale ${unit.scale})`

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

const checkIssueStatus = (
  applications: ReadonlyArray<ApplicationResult>
): "unsatisfied" | "error" | undefined => {
  if (applications.some(({ status }) => status === "unsatisfied")) return "unsatisfied"
  if (applications.some(({ status }) => status === "error")) return "error"
  return undefined
}

const appendChecks = (
  statementPresentation: StatementPresentation,
  sink: HtmlSink
): void => {
  const { checks, statement, checksId } = statementPresentation
  if (checks.length === 0) return
  const applications = checks.map(({ application }) => application)
  const issueSummary = checkIssueSummary(applications)
  const summary = issueSummary === undefined
    ? `${checks.length} · all satisfied`
    : `${checks.length} · ${issueSummary}`
  // A statement whose checks are not all satisfied opens its disclosure so
  // the document's most important signal is visible without hunting.
  const openAttribute = checkIssueStatus(applications) === undefined ? html`` : html` open`
  const itemsById = new Map(statement.items.map((item) => [item.id, item]))
  sink.writeLine(html`        <details class="checks" id="${checksId}"${openAttribute}>
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
  statementPresentation: StatementPresentation,
  sink: HtmlSink
): void => {
  const { commonUnit, items } = statementPresentation
  const hasParents = items.some(({ isParent }) => isParent)
  const hasColumnToggles = commonUnit === undefined
  if (!hasParents && !hasColumnToggles) return
  sink.writeLine(html`        <div class="table-tools" data-table-tools hidden>`)
  if (hasColumnToggles) {
    sink.writeLine(html`          <details class="col-menu" data-col-menu>
            <summary>Columns</summary>
            <div class="col-menu-panel">`)
    if (commonUnit === undefined) {
      sink.writeLine(html`              <label><input type="checkbox" checked data-col-toggle="unit"> Unit</label>`)
    }
    sink.writeLine(html`            </div>
          </details>`)
  }
  if (hasParents) {
    sink.writeLine(html`          <span class="tools-spacer"></span>
          <button class="tool-button" type="button" data-rows-collapse>Collapse all</button>
          <button class="tool-button" type="button" data-rows-expand>Expand all</button>`)
  }
  sink.writeLine(html`        </div>`)
}

/*
 * A group-heading row restates a rollup parent's label above its contiguous
 * subtree, classic-statement style. It is presentation-only: no values, no
 * TSV representation, hidden with the group when the parent collapses.
 */
const appendHeadingRow = (
  presentation: RenderPresentation,
  statementPresentation: StatementPresentation,
  parentIndex: number,
  sink: HtmlSink
): void => {
  const parent = statementPresentation.items[parentIndex]
  if (parent === undefined) throw new Error("Validated statement lost its heading parent")
  const depthAttribute = parent.depth === 0 ? html`` : html` style="--depth: ${parent.depth}"`
  sink.writeLine(html`              <tr class="row-heading" data-parent-row="${parentIndex}"${depthAttribute}>
                <th scope="row"><span class="item-cell"><span class="item-label">${parent.item.label}</span></span></th>`)
  if (statementPresentation.commonUnit === undefined) {
    sink.writeLine(html`                <td data-col="unit"></td>`)
  }
  for (const period of statementPresentation.statement.periods) {
    if (!presentation.periods.has(period)) throw new Error("Validated statement lost its period")
    sink.writeLine(html`                <td></td>`)
  }
  sink.writeLine(html`              </tr>`)
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
  appendTableTools(statementPresentation, sink)
  sink.writeLine(html`      <p class="overflow-cue">Scroll horizontally to review all columns.</p>
      <div class="table-scroll" role="region" aria-label="${statement.label} table. Scroll horizontally to review all columns." tabindex="0">
        <table id="${tableId}" data-statement-table${commonUnitAttribute}>
          <caption class="table-caption"><span class="caption-inner">${captionTemplate(statementPresentation)}</span></caption>
          <thead>
            <tr>
              <th scope="col" class="col-text">Item</th>`)
  if (commonUnit === undefined) sink.writeLine(html`              <th scope="col" class="col-text" data-col="unit">Unit</th>`)
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
    for (const headingParent of statementPresentation.headings.get(index) ?? []) {
      appendHeadingRow(presentation, statementPresentation, headingParent, sink)
      if (sink.exceeded) return
    }
    sink.writeLine(rowOpening(statementPresentation, index))
    sink.writeLine(itemCell(statementPresentation, index))
    if (commonUnit === undefined) {
      sink.writeLine(html`                <td class="metadata col-text" data-col="unit" data-unit-full="${unitText(unit)}">${unit.label}</td>`)
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
        <div class="handoff-action">
          <button class="copy-button" type="button" data-copy-control data-copy-source="${copySourceId}" data-copy-status="${copyStatusId}" aria-describedby="${copyHelpId}" aria-label="Copy ${statement.label} for Excel">Copy for Excel</button>
          <span class="copy-status" id="${copyStatusId}" role="status" aria-live="polite" aria-atomic="true"></span>
        </div>
        <a class="native-table-link" href="#${tableId}">View native table</a>
        <p class="copy-help" id="${copyHelpId}">Copies the complete statement as tab-separated values, including any rows or columns hidden in this view.</p>
      </div>
    </section>`)
}

const appendNavigation = (presentation: RenderPresentation, sink: HtmlSink): void => {
  sink.writeLine(html`    <nav class="statement-index" aria-label="Statements">
      <ol>`)
  for (const { statement, checks, ordinal, anchorId } of presentation.statements) {
    const issueStatus = checkIssueStatus(checks.map(({ application }) => application))
    const flag = issueStatus === undefined
      ? html``
      : issueStatus === "unsatisfied"
        ? html`<span class="check-glyph index-flag" data-status="unsatisfied">≠<span class="visually-hidden"> checks not satisfied</span></span>`
        : html`<span class="check-glyph index-flag" data-status="error">!<span class="visually-hidden"> checks not checked</span></span>`
    sink.writeLine(html`        <li><a href="#${anchorId}"><span class="index-number">${String(ordinal).padStart(2, "0")}</span><span>${statement.label}</span>${flag}</a></li>`)
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
  const status = checkIssueStatus(calculations.applications)
  if (status === undefined) throw new Error("Inconsistent calculations lost their status")
  const glyph = status === "unsatisfied" ? "≠" : "!"
  const summary = html`<span class="check-glyph" data-status="${status}">${glyph}</span> ${total} rollup ${checksWord} · ${issueSummary}`
  // The count links to the first statement whose expanded check disclosure
  // holds an issue, so the signal is one activation from proof.
  const failing = presentation.statements.find(
    ({ checks }) => checkIssueStatus(checks.map(({ application }) => application)) !== undefined
  )
  if (failing === undefined) return html`<p class="doc-checks">${summary}</p>`
  return html`<p class="doc-checks"><a class="doc-checks-link" href="#${failing.checksId}">${summary}</a></p>`
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
    <footer class="colophon">
      <p>Generated by the FS reference CLI from a validated FS ${document.formatVersion} document. The FS JSON document is authoritative; this page is a reading and transfer convenience and adds no accounting meaning.</p>
    </footer>
${behavior}
  </div>
</body>
</html>`)
}

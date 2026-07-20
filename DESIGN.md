# Analyst HTML Design System

Status: Approved for the active analyst-friendly HTML rendering milestone.

This document owns the visual and interaction direction of the standalone HTML
convenience view. The [semantic specification](docs/semantic-spec.md) remains
authoritative for financial meaning, and the
[CLI acceptance contract](docs/cli/acceptance.md) owns observable rendering
behavior.

## Approved Direction

The selected direction is the review-index concept: a compact archival working
paper with a slim statement rail, a horizontal statement index, a disciplined
numeric grid, and one handoff action local to each statement. It should feel
closer to an annual-report review copy than a dashboard or spreadsheet clone.

The HTML is a generated reading and transfer surface. It must never imply that
review progress, hierarchy, totals, exceptions, or accounting meaning were
added beyond the FS document.

## Visual System

Use the system font stack so the document remains self-contained. Headings and
labels use the platform's neutral sans serif; financial values use tabular
figures. Hierarchy comes from type size, weight, whitespace, alignment, and
hairline rules before background fills or containers.

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#f6f2e9` | Screen canvas |
| Sheet | `#fffdf8` | Statement reading surface |
| Ink | `#171a1c` | Primary text and strong rules |
| Secondary ink | `#606a6e` | Metadata and supporting copy |
| Rule | `#c8c2b7` | Hairlines and table rhythm |
| Analyst teal | `#1f6f78` | Links, active location, and focus |
| Teal wash | `#ddecef` | Restrained interaction feedback |
| Exception red | `#9f3f3a` | Copy failure only |

Teal is an interaction and location signal, not a financial classification.
Red must not color negative values, inconsistencies, or authored content.

## Document Topology

- A compact masthead identifies the entity and scope.
- A horizontal index links to every statement in document order and remains
  sticky while analysts review long statements.
- At wide widths, a slim rail repeats statement location as an ordinal such as
  `Statement 3 of 4`; it does not claim completion or review status.
- Each statement remains one native table and one statement-local handoff area.
- Statement and navigation anchors use renderer-owned ordinal identifiers.
  Author identifiers never become executable code or raw HTML attributes.

The approved mock's secondary cash-flow section index is not generalized.
FS does not encode statement sections, and deriving them from labels,
groupings, or rollups would add financial interpretation. Grouping columns
remain ordinary columns, and rollups do not create indentation or total styles.

## Statement Presentation

- Keep the item label column visually dominant and numeric columns aligned to
  a shared right edge with tabular figures.
- Preserve statement, item, grouping, and period order exactly.
- Use a visible table caption that names the statement and its unit context.
- Keep heterogeneous units in row cells. Show a homogeneous unit once above
  the visible table while retaining an explicit Unit column in copied data.
- Use whitespace and rules consistently; do not add cards, shadows, gradients,
  pill tabs, charts, dashboard metrics, or spreadsheet chrome.
- Missing and unavailable cells remain explicit text states. Negative numbers
  remain ordinary ink and receive no inferred exception styling.

## Excel Handoff

Each statement has one visible `Copy for Excel` button after its native table.
Its accessible name includes the statement label. The handoff area explains
that the action copies tab-separated values and that the native table remains
available when clipboard access is unavailable.

The status region reserves space so `Copied` or failure feedback does not move
the table or control. Success uses ink or teal; failure alone may use Exception
red. Focus is a square, high-contrast teal outline. No interaction depends on
hover or color alone.

The button is progressive enhancement: it is absent when the fixed renderer
script does not run. Its inert source stores the TSV as JSON string text so
schema-valid control characters survive HTML parsing before the fixed script
decodes them. The semantic table is always present and usable, so the no-script
path has no dead control or alternate data representation.

## Responsive and Print Behavior

- Wide screens use the slim rail and broad statement canvas.
- Medium screens drop the rail and retain the horizontal statement index.
- Narrow screens recompose metadata and handoff content into one column. The
  native table scrolls horizontally inside a keyboard-focusable region with a
  textual overflow cue; the document never scales the table into illegibility.
- Interactive targets remain at least 44 CSS pixels in their constrained
  dimension, and focus never becomes clipped by an overflow region.
- Print removes navigation, clipboard controls, status regions, overflow cues,
  and the warm outer canvas. It repeats table headers, avoids splitting rows
  where practical, uses black ink, and does not rely on sticky positioning.

## Implementation Fidelity

Build the interface as semantic HTML and CSS with a small fixed progressive-
enhancement script. The approved mock is a north star, not a bitmap to trace.
Do not literalize its sample amounts, completion checks, decorative icons, or
fixed desktop proportions. Do preserve its statement index, ordinal location,
full-width ledger rhythm, per-statement handoff, and restrained material tone.

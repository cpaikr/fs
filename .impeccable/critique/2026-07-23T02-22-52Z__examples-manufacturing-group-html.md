---
target: examples/manufacturing-group.html (r6, statement 2)
total_score: 35
p0_count: 0
p1_count: 0
timestamp: 2026-07-23T02-22-52Z
slug: examples-manufacturing-group-html
---
# Critique: examples/manufacturing-group.html (r6, #statement-2)

Method: dual-agent (A: design-review sub-agent · B: detector sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3.5 | Scroll-spy, live copy status, collapsed-row counts; index never marks the last statement current at page bottom |
| 2 | Match System / Real World | 3.5 | Correct accounting conventions; ISO period headers and unexplained "scale 6" are machine-flavored |
| 3 | User Control and Freedom | 3.5 | Collapse/expand all, Escape closes menu and tooltip; no one-step column reset |
| 4 | Consistency and Standards | 4 | All five statements share identical scaffolding; deviations are data-driven and declared |
| 5 | Error Prevention | 3.5 | Copy source JSON-validated before wiring; explicit "Unavailable" cells; tolerance column in checks |
| 6 | Recognition Rather Than Recall | 3.5 | Tooltip restores full context; finding the one failing check requires exhaustive search |
| 7 | Flexibility and Efficiency | 3 | No path from masthead failure count to the failing row; no copy shortcut; tooltip hover-only |
| 8 | Aesthetic and Minimalist Design | 4 | Hierarchy purely from typography, rules, indentation; only noise is the all-dash Valuation columns |
| 9 | Error Recovery | 4 | Copy failure names a concrete alternative; clipboard fallback to execCommand |
| 10 | Help and Documentation | 3 | Good microcopy and aria-labels; nothing explains "scale 6", tolerance, or JSON authority |
| **Total** | | **35/40** | **Good — solid foundation, address weak areas** |

## Anti-Patterns Verdict

Does not look AI-generated. LLM assessment: passes the product slop test — earned familiarity. Correct accountant rule vocabulary (hairline / strong rule above subtotals / double rule under rollup roots), serif reserved for identity, tabular figures on a shared right edge, single claret accent for interaction only. No banned patterns (no side-stripes, gradients, glassmorphism, hero metrics, card grids, eyebrows). The 01–05 ordinals are annual-report convention binding the index to sections, not reflex scaffolding.

Deterministic scan: 2 CLI findings, both false positives in this register — `em-dash-overuse` (23 em-dashes; they are placeholder cells and label separators, standard financial typography) and `numbered-section-markers` (statement ordinals, a legitimate document convention). Browser scan: 5 hits of `gpt-thin-border-wide-shadow`, all the same component — the Columns dropdown panel (1px border + 20px shadow blur), a conventional popover treatment; at most one shadow value to soften. Convergence worth noting: much of the em-dash count comes from the all-"—" Valuation columns in statements 03/05 — the one slop-adjacent artifact the design review independently flagged as a real generation-time issue.

## Overall Impression

Professional — genuinely. An analyst fluent in filed financials would trust this page on first scan; the places practitioners subconsciously check (subtotal rules, figure alignment, units, explicit missing-value states) are all correct. The gaps are "last 5%" trust features, not styling: the unsatisfied-check signal isn't wired to its destination, and the document ends without provenance.

## What's Working

1. Accountant rule grammar carries the whole hierarchy — hairline / strong-rule / double-rule executed precisely, so subtotal structure parses pre-attentively with zero boxes, zebra, or color.
2. The Excel handoff is engineered, not decorated — validated TSV source, clipboard fallback, live status region, failure copy that names the recovery path, full unit context traveling per row.
3. Progressive enhancement and print discipline — all interactive chrome hidden until JS wires it; print force-expands rows, restores headers, strips chrome, kills the accent.

## Priority Issues

1. **[P2] Failing check announced but not navigable** — masthead says "16 rollup checks · 1 not satisfied" and abandons you; the red row hides in a collapsed details in statement 02. The document's most important signal requires exhaustive search. Fix: link the masthead count to the first unsatisfied check (auto-opening its disclosure) and/or mark "02" in the index with the ≠ glyph. Command: /impeccable clarify or polish.
2. **[P2] Value-context tooltip is pointer-only** — fires on mouseover only; cells aren't focusable, so keyboard users never reach the Description field or assembled context. Fix: focusable value cells triggering on focusin, or expose Description as a toggleable column. Command: /impeccable harden.
3. **[P3] Row-collapse toggles under WCAG 2.5.8 target size** — ~21–23px, below the 24px minimum, on the primary structural control. Fix: bump padding. Command: /impeccable audit.
4. **[P3] Copy exports full dataset regardless of view state, silently** — right behavior, undocumented; an analyst who hid columns may distrust the paste. Fix: one clause in the help line. Command: /impeccable clarify.
5. **[P3] Weak document ending** — scroll-spy never marks 05 current; no colophon/provenance (generated-when, source JSON, "JSON is authoritative"); statements 03/05 render an all-"—" Valuation column that should be omitted at generation time. Command: /impeccable polish.

## Persona Red Flags

**Alex (power user)**: masthead failure count is dead text — he greps the page by eye. Deep link `#statement-2` lands perfectly. Copy button placement means scrolling past checks; no keyboard shortcut. Latent: ISO period headers get very wide with many periods.

**Sam (keyboard/screen reader)**: fails on tooltip reachability and toggle target size. Passes verified: skip link, claret focus rings, aria-expanded with accessible names, real-text row counts, polite live region for copy status, glyph+word status colors, all contrast spot-checks clear AA (6.2:1–7.3:1 text, 3.3:1 UI borders).

## Minor Observations

- Columns panel overlaps the table caption when open (closes on Escape/outside click); its 20px shadow blur is the one detector hit worth softening.
- Narrow-viewport column auto-hide runs on load but not on resize.
- "Copied" status never times out (arguably fine).
- Statement 02's Gross profit row shows Valuation "EBITDA" — data oddity faithfully surfaced, not a rendering flaw.

## Questions to Consider

1. If the JSON is authoritative, why does the page carry zero provenance — source filename, generation timestamp, checksum — an analyst could cite when numbers are questioned?
2. Should Description (currently tooltip-only) travel in the copied TSV, or is the tooltip quietly holding data the handoff drops?
3. Is a hover-gated 400 ms tooltip the right primitive for an audit tool, versus a pinned inspector that keyboard and touch users can also reach?

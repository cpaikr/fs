# Phase 4: Rendering

This phase renders ordered statement items directly from nested values and
closes the atomic runtime cutover. The
[plan index](../statement-item-row-refactor.md) owns live state.

## Contract First

Use the exact mixed-unit and grouping-column behavior fixed in Phase 0. If
[ADR 0002](../../adr/0002-bound-render-output.md) is accepted or revised,
incorporate its preflight budgets, error precedence, and no-partial-output
contract before implementation. Otherwise keep that operational decision
explicitly deferred; do not silently choose different limits in code.

Replace the shared files under `fixtures/cli/expected/render/` with the target
exact HTML before implementing the renderer. Unit tests and later CLI acceptance
must consume those same files rather than maintain parallel expectations.

## Implementation

- Rewrite `src/render.ts` to iterate statement order, item order, and period
  order directly.
- Read each cell from `item.values[period]`; render exact decimals, missing,
  and unavailable states distinctly.
- Resolve each row's unit and follow the deterministic homogeneous versus
  mixed-unit presentation contract.
- Remove dimension indexes, Cartesian axis expansion, global fact lookup,
  presentation headings, and per-entry label overrides.
- Keep author-controlled text escaped and preserve deterministic standalone
  HTML without scripts or external resources.
- If output budgets are accepted, use checked arithmetic before allocation and
  a bounded final-byte sink. Arithmetic overflow counts as over-limit.

## Tests

- Exact bytes for homogeneous and mixed-unit statements.
- Exact preservation of statement and item array order and each statement's
  period-reference order, independent of document-level unit and period
  definition order.
- Decimal, missing, unavailable, and escaped author text.
- The Phase-0 grouping visibility decision, including proof that grouping
  values do not create arithmetic or hierarchy.
- No dimension expansion or fact-coordinate lookup path.
- Every accepted structural and byte budget boundary and CLI error precedence,
  if ADR 0002 becomes accepted.

## Gate

- Render unit tests and exact HTML fixtures pass.
- `pnpm typecheck` and strict Effect diagnostics pass after all direct
  `Document` consumers have migrated.
- No current runtime module imports a dimension, member, fact, coordinate,
  presentation-entry, or general calculation-rule type.

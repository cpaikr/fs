# Phase 1: Schemas and Contract Evidence

This phase makes the Phase-0 contract machine-readable. It replaces artifacts
as one coordinated set; it does not preserve old fixtures or add adapters. The
[plan index](../statement-item-row-refactor.md) owns live state.

## Schemas

- Replace `schema/fs-document.schema.json` with the closed statement-row shape.
  Remove top-level item, fact, dimension, member, presentation-entry, and
  calculation-rule definitions.
- Add item `values` and `groupings` objects with strict cell types and reject
  unknown fixed item fields. Leave declaration-to-map exactness to semantic
  validation where JSON Schema cannot express document-local key equality.
- Replace application keys, results, statuses, and error payloads in
  `schema/validation-result.schema.json` and
  `schema/snapshot-diff.schema.json`.
- Keep unit and period definitions only because they carry measurement and
  calendar semantics, not as database normalization.

## Examples and Fixtures

- Rewrite `examples/minimal.json` to prove the smallest complete row model.
- Replace `examples/manufacturing-group.json` with ordinary multi-statement
  evidence. Retain its public name only if its contents still justify that
  name; otherwise change discovery and documentation deliberately.
- Preserve the representative statement-type coverage required by the product
  scope. Flatten the equity case only when doing so retains its material
  meaning; otherwise update the owning product decision rather than silently
  dropping the evidence.
- Replace valid, invalid, calculation-result, snapshot-diff, and manifest
  fixtures as one matrix.
- Replace the exact record-validation expected documents with schema-valid
  row-model outputs alongside that matrix. Phase 3 must produce and verify these
  same bytes rather than create separate unit-test expectations.
- Delete evidence with no target analogue: dimensional axes, unresolved
  members, duplicate fact coordinates, assertions, roll-forwards, skipped
  applications, and missing boundary periods.
- Add evidence for exact `values` keys, exact `groupings` keys, wrong nested
  cell types, duplicate statement-local items, unresolved/self/cyclic
  `rollupTo`, mixed-unit rollup edges, nested subtotals, and missing or
  unavailable rollup cells.
- Add a conforming document that reuses the same item identifier in two
  statements, with local rollup references, to prove item identity is not
  accidentally retained as document-global.
- Rewrite `raw-input/noncanonical-valid.json` to target semantics while
  preserving its leading whitespace and compact exact-copy shape. Preserve raw
  malformed JSON, trailing content, and duplicate JSON-object member coverage.
  Here “member” is JSON terminology, not the removed financial dimension
  concept.
- Rewrite `examples/README.md`, `fixtures/README.md`, and the artifact-sensitive
  parts of `fixtures/cli/README.md` with the resulting inventory.
- Align artifact-sensitive CLI descriptor file references, JSON Pointer and
  member-set assertions, and manifest entries with the replaced artifacts.
  This phase owns their static integrity; later phases make the cases executable
  against the replacement runtime.

## Integrity Scripts

- Update `scripts/check-docs.sh` for the chosen format version, fixture set,
  calculation statuses, application identities, and generated artifacts.
- Update `fixtures/manifest.json` and `fixtures/cli/manifest.json` in lexical
  order; do not weaken coverage or make scripts ignore stale files.
- Keep generic JSON and CLI fixture harnesses unless the new contract exposes a
  concrete missing assertion.

## Gate

- All examples and valid fixtures pass the new document schema.
- Every schema-invalid fixture fails for its intended reason; every
  semantic-invalid fixture first passes JSON Schema.
- All expected results and snapshots pass their schemas and use unique stable
  application keys.
- Record-validation expected documents pass the replacement document schema,
  and every CLI descriptor reference and asserted JSON Pointer resolves.
- `./scripts/check-docs.sh` and `git diff --check` pass.
- Runtime failures caused by the deliberate contract-first cutover are listed
  in the plan index and are not hidden by compatibility code.

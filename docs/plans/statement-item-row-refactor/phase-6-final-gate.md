# Phase 6: Legacy Removal and Final Gate

This phase proves that the replacement is complete and that no accidental
second contract remains. The [plan index](../statement-item-row-refactor.md)
owns live state and closure.

## Removal Audit

- Remove legacy domain types, schema definitions, diagnostics, fixture paths,
  expected outputs, authoring instructions, and active-contract prose for
  dimensions, dimensional members, standalone facts, coordinates, shared
  presentations, general calculation rules, skipped applications, and
  presentation-only headings.
- Do not rewrite completed historical plans. They are delivery evidence for
  the contract that existed at that milestone.
- Preserve uses of “member” that mean a JSON object member, including parser
  diagnostics, duplicate-member raw-input coverage, and generic CLI JSON
  matchers.
- Preserve Decimal arithmetic, JSON parsing, logging, Effect CLI grammar,
  process envelopes, and atomic writer modules unless the refactor produced a
  demonstrated regression there.
- Confirm the documentation index clearly distinguishes accepted/current
  contracts from historical plans and future release work.

## Cross-Contract Audit

- Trace one minimal document and one multi-statement rollup document through
  schema discovery, parsing, structural validation, calculation, snapshot
  recording and comparison, rendering, exact creation, and packed installation.
- Confirm every public diagnostic path targets the nested shape.
- Confirm examples, fixtures, schemas, TypeScript types, generated guidance,
  CLI prose, and exact outputs agree on version literals and status enums.
- Confirm no grouping name triggers arithmetic, presentation hierarchy, or
  taxonomy behavior.

## Required Validation

Run all of the following from a clean build:

```sh
pnpm verify
./scripts/check-docs.sh
git diff --check
```

Then run the required `$code-review` pass. Use a fresh subagent reviewer because
the change replaces shared behavior, cross-module contracts, user-facing
flows, and persisted data. Resolve every safe finding and every material
decision before closure.

## Exit

- Every full gate passes with no unexplained skip or weakened assertion.
- No compatibility reader, dual schema, migration alias, or stale current
  fixture remains.
- The plan index records final validation and has no blocker or next action.
- Roadmap step 10 is complete; Roadmap step 11 remains unstarted.

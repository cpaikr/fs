# Phases 4–5: Discovery, Bundled Content, and Atomic Creation

Status: in progress; creation remains blocked on Phase 3 validation.

This plan completes the first implementation milestone after validation. It
owns discovery and exact bundled content commands, the shared atomic writer,
and `fs create`. It excludes Agent Skill generation, `record-validation`,
`render`, and release-readiness work.

## Phase 4: Discovery and Bundled Content

- [x] Implement deterministic no-argument discovery without directory scans.
- [x] Implement exact top-level and per-command help and installed-CLI
  authoring guidance.
- [x] Add one atomic no-replace writer shared by every output command.
- [x] Implement all schema and example lookups with exact-byte output.
- [x] Reject unknown names, versions, arguments, flags, and unresolved unnamed
  output behavior exactly as accepted.
- [ ] Verify maintained guidance and packaged assets are current in CI without
  generating the Phase 6 Agent Skill.
- [ ] Add platform fault tests for the shared writer.

Phase 4 gate: discovery, help, guide, schema, and example cases pass offline
against the packed executable, including write refusal and fault tests.

## Phase 5: Atomic Creation

- [ ] Buffer candidate bytes once, fully validate them, and write those exact
  bytes only when structurally conforming.
- [ ] Check an existing destination before candidate validation and enforce
  no-overwrite again at the atomic commit boundary.
- [ ] Reuse the shared writer for path and standard-input cases.
- [ ] Permit structurally conforming candidates with inconsistent
  calculations without weakening validation output.
- [ ] Test structural refusal, malformed input, identical and different
  existing files, races, interrupted writes, and error precedence.

Phase 5 gate: all `create` acceptance and fault-injection tests pass on every
supported platform without overwrite or observable partial output.

## Shared Invariants

- Direct content output and created files preserve authoritative exact bytes.
- Output parents are never created, and existing destinations are never
  replaced.
- The process adapter alone emits accepted standard output; diagnostics remain
  deterministic bounded JSON Lines on standard error when explicitly enabled.

## Validation Evidence

The packed executable passes all 37 discovery, exact help/guide, schema, and
example cases. One package-root asset boundary owns exact reads, and the shared
temporary-file plus atomic-link writer prevents ordinary overwrites. Packaged
guidance freshness in CI, writer fault/platform tests, validation, and all
Phase 5 creation work remain open.

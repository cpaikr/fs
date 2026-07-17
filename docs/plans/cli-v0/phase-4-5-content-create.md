# Phases 4–5: Discovery, Bundled Content, and Atomic Creation

Status: complete.

This plan completes the first implementation milestone after validation. It
owns discovery and exact bundled content commands, the shared atomic writer,
and `fs create`. It excludes Agent Skill generation, `record-validation`,
`render`, and release-readiness work.

This is the completed pre-migration delivery baseline. Phase 6 supersedes its
exact custom-help and command-adapter decisions while retaining the guide,
bundled-content, validation, exact-copy, and atomic-write guarantees.

## Phase 4: Discovery and Bundled Content

- [x] Implement deterministic no-argument discovery without directory scans.
- [x] Implement exact top-level and per-command help and installed-CLI
  authoring guidance.
- [x] Add one atomic no-replace writer shared by every output command.
- [x] Implement all schema and example lookups with exact-byte output.
- [x] Reject unknown names, versions, arguments, flags, and unresolved unnamed
  output behavior exactly as accepted.
- [x] Verify maintained guidance and packaged assets are current in CI without
  generating the Phase 7 Agent Skill.
- [x] Add platform fault tests for the shared writer.

Phase 4 gate: discovery, help, guide, schema, and example cases pass offline
against the packed executable, including write refusal and fault tests.

## Phase 5: Atomic Creation

- [x] Buffer candidate bytes once, fully validate them, and write those exact
  bytes only when structurally conforming.
- [x] Check an existing destination before candidate validation and enforce
  no-overwrite again at the atomic commit boundary.
- [x] Reuse the shared writer for path and standard-input cases.
- [x] Permit structurally conforming candidates with inconsistent
  calculations without weakening validation output.
- [x] Test structural refusal, malformed input, identical and different
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

The packed executable passes all discovery, exact help/guide, schema, example,
and 14 creation cases. One package-root asset boundary owns exact reads. The
shared writer uses exclusive temporary creation, exact write, file sync, and
an atomic hard-link commit so races cannot replace a destination. Directory
entries, including dangling symlinks, are checked before candidate reads and
again at commit.

Retained fault tests cover missing and inaccessible parents, open, write,
sync, close, non-race commit, transient and persistent cleanup, and
competing-destination failures. After commit, persistent temp unlink failure
retains success and may leave only a private-mode complete hard link; it never
retracts or partially exposes the synced destination. The suite also proves
exact bytes, no ordinary overwrite, single reads, and stable read-before-write
ordering across logging settings. A real child-process integration harness
crashes after open, write, sync, close, and link to verify the commit boundary,
then races 16 writers to prove exactly one complete winner and ordinary temp
cleanup. `pnpm verify` passes on macOS and isolated Linux Node 22.17.0 and
24.15.0; CI runs the same gate on Linux, macOS, and Windows.

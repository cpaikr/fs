# Phase 0a: Contract Alignment

Status: in progress.

This plan closes the remaining machine-readable and discovery contract gaps
before CLI acceptance fixtures or production code are added. The
[semantic specification](../../semantic-spec.md), published schemas, and
language-neutral fixtures own artifact meaning; the
[CLI design](../../cli/design.md) and
[acceptance contract](../../cli/acceptance.md) own CLI discovery and process
behavior.

## Scope

- [x] Settle invalid-snapshot, example-output, portable-guide, help,
  duplicate-member, and numeric-scale decisions in the normative documents.
- [x] Add `not-comparable` with reason `invalid-snapshot` to the snapshot-diff
  schema.
- [x] Add the expected invalid-snapshot diff and associate it with
  `fixtures/invalid/duplicate-snapshot-application-key.json`.
- [x] Update the fixture guide for the invalid-snapshot result.
- [x] Enforce inclusive safe-integer bounds on `unit.scale` in the document
  schema.
- [x] Add valid boundary and invalid out-of-range language-neutral fixtures.
- [ ] Define one portable authoring source and byte-stable installed-CLI and
  pinned-`npx` generation targets without generating the Phase 6 Agent Skill.
- [ ] Define exact top-level and per-command help Markdown.
- [x] Add malformed, trailing-content, and duplicate-member raw inputs outside
  the document manifest, with explicit integrity checks.

## Decisions

- A present but invalid embedded snapshot produces snapshot-diff status
  `not-comparable` with reason `invalid-snapshot`; it is never treated as an
  absent snapshot.
- `unit.scale` is an integer in the inclusive JavaScript safe-integer range,
  as already required by the semantic specification.
- Malformed JSON, trailing content, and duplicate object members fail before
  JSON Schema validation and therefore do not belong in the document fixture
  manifest.
- Static Agent Skill guidance and `fs guide authoring` will share one
  maintained portable source. Phase 0 fixes the source and render contracts;
  installed-CLI commands render as `fs`, future Skill commands render with the
  pinned `npx -y @cpai/fs@<version>` prefix, and Phase 6 generation remains
  outside this milestone.
- Help is maintained as exact Markdown content and exposed through the CLI
  adapter without accepting framework-provided version or completion commands.

## Gate

Every V0 artifact result is representable by aligned schemas and fixtures, and
every discovery/help byte sequence needed by Phase 1 has an authoritative
source.

## Validation Evidence

`./scripts/check-docs.sh` passes with both safe-integer scale endpoints, both
adjacent schema failures, the invalid-snapshot diff, and all three raw-input
classes. `git diff --check` also passes. Generated guide and help freshness
checks remain unavailable until those assets are defined.

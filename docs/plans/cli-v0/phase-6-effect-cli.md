# Phase 6: Effect-Native CLI Contract and Migration

This plan owns the deliberate post-`fs create` reset of framework-shaped CLI
contracts and the migration from the Node-core argument adapter to
`effect/unstable/cli`. Artifact semantics, structured operation results,
exact bundled content, and filesystem safety remain unchanged.

## Decision

Use `effect/unstable/cli` as the default command grammar and runner behind one
private command module. Import only its public barrel, keep Effect packages
coordinated at the exact pinned release, and re-audit the seam on every
upgrade.

At the pinned `effect@4.0.0-beta.98`, `effect/unstable/cli` is the Effect v4
CLI surface. “Unstable” describes its API-stability namespace; it is not a
separate pre-v4 CLI generation.

The `effect-solutions` CLI guide supports the command-tree, compositional
argument, handler, service, and testing architecture. It currently targets an
older Effect beta, so the installed beta.98 declarations, source, upstream
tests, and direct process probes remain authoritative for exact behavior.

## Retained Contracts

- File-first, non-interactive commands.
- Validation semantics and structured domain results.
- Exact guide, schema, example, and created-document bytes.
- Grammar failure before application I/O when no native action short-circuits.
- Duplicate value flags and extra operands fail closed.
- Atomic non-overwriting writes and existing-destination precedence.
- Silent default logging and bounded JSON Lines when enabled.
- Structured, redacted operational errors and outer defect containment.

## Accepted Contract Reset

- Generate help from the Effect command tree; test semantic content rather
  than independent Markdown bytes.
- Accept Effect's help, version, completions, and log-level built-ins.
- Use native usage help and diagnostics instead of project JSON usage-error
  envelopes; retain usage exit status `2` through the smallest public adapter.
- Remove `schema --version` while artifact version `0.1` is the only choice.
- Remove `validate --format` while JSON is the only result encoding.
- Document flags before operands as canonical without promising every
  alternate placement.
- Do not guarantee subcommand operands following `--` until the pinned public
  Effect CLI supports them correctly.
- Permit native action flags to short-circuit ordinary command validation;
  do not stabilize precedence among combined actions or valueless
  completions behavior.

## Pinned-Release Constraints

Direct beta.98 probes show that a scalar argument can ignore extra operands,
a scalar value flag can accept duplicates, and subcommand operands after `--`
are lost. The implementation will consume the full operand tail and refine its
cardinality, and apply `Flag.atMost(1)` to single-valued command-local flags,
using public combinators only. The contract deliberately excludes the broken
delimiter path and framework-owned duplicate-global-flag behavior.

Because beta.98 marks every consume-all argument as variadic, native usage may
render an exact-one operand as `<name...>`. Its argument description must begin
with `Exactly one`, and semantic help cases must assert that literal
clarification. The ellipsis is treated as native formatter detail; it does not
weaken runtime cardinality or justify custom help reconstruction. Completion
metadata inherits the same upstream limitation and never expands the accepted
grammar. Re-audit both behaviors on upgrade.

`Command.runWith` selects the native built-ins in beta.98. The public scoped
built-in configuration found on unreleased Effect main is not a dependency of
this plan because the revised contract accepts those built-ins.

## Work

- [x] Revise the owning CLI design and acceptance contracts.
- [x] Replace affected process fixtures and integrity assertions while
  retaining unchanged domain and filesystem cases.
- [ ] Define one private Effect command tree using public APIs.
- [ ] Enforce exact operand cardinality and duplicate command-local flag
  rejection with Effect argument and flag refinements.
- [ ] Describe exact-one operands explicitly and cover the beta.98 native-help
  cardinality clarification in semantic fixtures.
- [ ] Dispatch parsed commands into the existing typed application boundary.
- [ ] Replace the custom parser, help assets, and compatibility-only tests.
- [ ] Preserve logging, native streams, and exit-code invariants through
  Effect services and the process entry point.
- [ ] Prove generated help remains ANSI-free with both disabled-color fixtures
  and a color-capable terminal test.
- [ ] Verify the packed executable on the supported Node and platform matrix.

## Gate

The packed CLI is driven by `effect/unstable/cli` through public APIs, every
revised process fixture passes, retained semantic, content, logging, and write
guarantees remain unchanged, no custom grammar or native-help reconstruction
remains, and `pnpm verify`, `./scripts/check-docs.sh`, and
`git diff --check` pass.

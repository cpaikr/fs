# CLI Acceptance Fixtures

These fixtures provide executable evidence for the published `0.1`
statement-row process. The target behavior is defined by the
[CLI acceptance contract](../../docs/cli/acceptance.md), and the
[active 0.2 refactor plan](../../docs/plans/remove-user-defined-groupings.md)
owns the temporary drift. Until that work is complete, the descriptors and
manifest remain `0.1` implementation evidence rather than proof of the target
contract.

Artifact inputs and expected results are referenced from their owning trees so
the CLI suite exercises the same statement rows, rollups, snapshots, schemas,
examples, and generated guidance as the language-neutral contract evidence.

## Layout

- [`case.schema.json`](case.schema.json) defines one closed case descriptor.
- [`manifest.json`](manifest.json) lists every case path in lexical order.
- `cases/` groups descriptors by command or cross-cutting behavior.
- `expected/` contains only CLI-owned exact values or logs. Artifact results,
  schemas, examples, and guide content remain in their owning trees and are
  referenced rather than copied.

Every `file` reference is resolved relative to this directory, even when a
case descriptor is nested. References may leave this directory but must remain
inside the repository and resolve to regular files.

## Target Protocol

The harness invokes `command` with the exact `arguments` array and no shell.
It creates a fresh workspace and fixed empty home, copies or deterministically
generates `workspace` entries, supplies optional exact or generated
standard-input bytes, and fixes locale, timezone, non-interactive terminal
state, and disabled color. A case may replace `process.cwd` with a throwing
boundary before importing the installed executable to prove behavior when the
current directory is unavailable consistently across supported platforms.

Standard output supports three comparisons:

- `json` compares complete member sets, arrays, JSON Pointer equalities, and
  nonempty strings without depending on member order or whitespace;
- `bytes` compares exact bundled or created content; and
- native CLI text asserts semantic command and flag inventory, relevant
  tokens, and absence of ANSI sequences without copying formatter layout.

Ordinary application standard error is exact bytes, normally empty. Usage
failures use semantic native-text assertions. Logging cases name exact JSON
Lines or require structural records with an explicit additional-record
policy. Log records require stable `level`, `event`, and `operation` fields,
allow only bounded scalar context, and reject the diagnostic fields forbidden
by the acceptance contract.

Filesystem expectations are exhaustive for both workspace and home. Staged
files are `unchanged`, newly written regular files are `created` with exact
bytes, and paths that must not exist are `absent`. The harness rejects every
unlisted creation, deletion, content change, or file-type change after
excluding only the staged executable.

## Integrity

The target fixture checker must verify schema conformance, manifest coverage
and lexical ordering, unique identifiers, safe workspace paths, disjoint
filesystem states, staged-file expectations, repository-contained regular-file
references, JSON Pointer syntax and targets, unique selector matches, and the
closed native-text matcher shape.

Black-box descriptors cannot prove injected I/O order, commit races, crash
atomicity, platform permission faults, or global log redaction. Retained
integration tests own those guarantees.

## Maintained Coverage

The suite keeps these domain and operational boundaries:

- validation by path and standard input, every calculation aggregate,
  snapshot match and mismatch, structural failures, invalid snapshots,
  malformed input, trailing content, duplicate members, unsafe scale, and
  missing input;
- bounded file and standard-input reads, iterative JSON nesting and value
  limits, bounded diagnostic fanout and bytes, stable redacted limit results,
  and existing-output precedence over oversized candidate input;
- current-directory-independent native help, discovery, bundled schema access,
  and standard-input validation, plus the stable relative-path failure when the
  current directory is unavailable;
- deterministic discovery and exact installed guide, schema, example, and
  created-document bytes, including generated validation snapshots that
  revalidate as snapshot matches, plus deterministic standalone HTML from the
  statement-row presentation model;
- silent and enabled logging, thresholds, bounded failure context, and I/O
  invariance; and
- atomic no-overwrite behavior, missing parents, write failures, existing
  destinations, commit races, and invalid-input/existing-output precedence.

Grammar and native-presentation coverage includes:

- semantic top-level and per-command help, representative `-h` aliases, exact
  installed version identity, and nonempty completions for every documented
  shell;
- exact-one operand descriptions containing `Exactly one` to clarify the pinned
  CLI's native variadic ellipsis without weakening runtime cardinality;
- native help on standard output, a native diagnostic on standard error, and
  exit code `2` for missing or extra operands, unknown commands, unknown flags,
  unknown command values, and invalid log levels;
- duplicate `--output` rejection for schema, named example, create,
  snapshot recording, and rendering;
- canonical local-flag-before-operand invocations without acceptance promises
  for alternate placement or subcommand operands after `--`; and
- native action short-circuiting without application I/O, without fixing
  precedence among combined action flags or valueless completions behavior.

The manifest is the exact case inventory. This guide describes responsibilities
and matcher behavior without duplicating that volatile list.

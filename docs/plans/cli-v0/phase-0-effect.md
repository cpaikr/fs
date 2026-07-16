# Phase 0b: Runtime and Command Integration

Status: complete.

This plan proves that the selected maintained Effect stack and command runner
can implement the accepted CLI process contract entirely through public APIs.
The production adapter and retained tests belong to
[Phase 2](phase-2-package.md).

## Scope

- [x] Select exact coordinated versions for Effect, Node.js platform/runtime,
  logging, language service, and test packages.
- [x] Inspect package source, declarations, exports, and relevant upstream
  tests at those exact versions.
- [x] Inspect `Command.runWith`, `CliOutput`, `CliError`, console services,
  logger replacement, and Node runtime behavior as adapter candidates.
- [x] Establish a public seam for command grammar, built-in gating, exact
  help, usage-error translation, buffered stream ownership, runtime-error
  suppression, and logger replacement.
- [x] Record source references, constraints, rejected approaches, and retained
  production tests for source-opaque or unstable claims.
- [x] Revise the runner because the published Effect CLI cannot satisfy the
  accepted built-in contract through public APIs.

## Selected Package Set

- `effect@4.0.0-beta.98`, source tag commit
  `3e4abbcb0d0e9a5e82b6b88c7ef7ab69900105ec`.
- `@effect/platform-node@4.0.0-beta.98` with the lockfile pinning its
  `@effect/platform-node-shared@4.0.0-beta.98` dependency exactly.
- `@effect/vitest@4.0.0-beta.98` with `vitest@4.1.10`.
- `@effect/language-service@0.87.0`, source tag commit
  `f0c65e47825de3e4c0dedcdff5e0193fa861e203`.
- `typescript@5.9.3` with strict checking and `skipLibCheck: false`.

Effect logging is part of `effect`; no separate logger package is needed. Pin
the coordinated Effect packages together and repeat this inspection on every
upgrade.

## Source Findings

The published `effect/unstable/cli` barrel is public, but its internal parser
and implementation subpaths are explicitly blocked by package exports.
At beta.98, `Command.runWith` always uses `GlobalFlag.BuiltIns`, whose public
value contains Help, Version, Completions, and LogLevel. Upstream tests prove
that version wins even in subcommand positions and help snapshots expose
version and completion surfaces. A formatter can hide those entries but cannot
stop the forbidden flags from parsing and executing.

Effect main commit `8ce4795ccbaebca4292757db568c005a992546a4`
adds the needed public scoped `CliConfig` for selecting built-ins, but that
change is newer than beta.98 and absent from every coordinated published
release inspected on 2026-07-16. The npm `snapshot` tag is a stale Effect 3
snapshot and is not a substitute for a coordinated release.

Other inspected public seams are viable:

- `NodeServices.layer` supplies filesystem, path, stdio, terminal, child
  process, and crypto services.
- `NodeRuntime.runMain` accepts `disableErrorReporting`, and Effect runtime
  exit codes can represent `0`, `1`, and `2`.
- `Console.Console` can be replaced with a buffered implementation, but the
  production command adapter will own accepted output directly.
- `Logger.make` and `Logger.layer` can replace the default loggers. The stock
  JSON logger is rejected because it includes timestamps, fiber identifiers,
  causes, spans, and annotations outside the accepted diagnostic shape.
- `@effect/vitest` publicly supplies Effect-aware tests on top of Vitest.

The published beta also contains unstable behavior that must not leak into the
FS contract: `UnknownSubcommand` has runtime tag `UnknownSubcomand`, extra
positionals are accepted, default logging is not silent, and framework help
and error paths write through Console before re-failing.

## Runner Revision

Use Node.js `util.parseArgs` for lexical argument parsing and keep Effect for
the application runtime, platform services, logging, typed outcomes, and test
integration. Node 22.17 documentation and direct probes on Node 22.17 and
24.15 establish this public seam:

- strict mode rejects unconfigured options;
- `allowPositionals` supports explicit command operands;
- `tokens: true` preserves every option occurrence, its raw spelling and
  index, positionals, inline values, and the `--` terminator; and
- duplicate options remain visible in the token stream even though the
  convenience value map keeps only the last value.

The adapter declares only the union of milestone options, identifies the
command from positional tokens, then enforces command-local option ownership,
cardinality, position, operands, and precedence from the returned token stream.
Thus `schema --version` remains local, global `--version`, `-v`, and
`--completions` are never built-ins, unknown input fails loudly, and the
adapter does not recreate option lexing.

The adapter also owns exact help assets, structured stdout, empty ordinary
stderr, bounded error translation, and the decision to enter application I/O
only after grammar validation. Effect receives a typed command request rather
than raw arguments.

## Rejected Approaches

- Published beta.98 `Command.runWith`: accepts forbidden global version and
  completion commands.
- Formatter-only hiding: changes presentation but leaves forbidden behavior.
- Mutating `GlobalFlag.BuiltIns`: unsupported global state and unsafe across
  concurrent runs.
- Pre-scanning only selected forbidden strings: recreates context-sensitive
  lexing and can break command-local `schema --version`, option values, and
  `--` handling.
- Importing Effect CLI internals or pairing the public command model with an
  independent parser: blocked exports or duplicated parsing.
- Pinning unreleased Effect main or the stale npm snapshot: not a coordinated
  published package set.
- Waiting for a future beta: unnecessary because the Node-core public runner
  meets the contract without weakening the Effect application architecture.

## Retained Phase 2 Tests

- Exact dependency and public-export smoke, including rejection of Effect
  internal subpaths.
- Accepted built-ins at every supported position; rejection of `--version`,
  `-v`, and completions; command-local `schema --version` behavior.
- Duplicate flags, extra operands, operands after `--`, flag/operand ordering,
  and usage precedence before any I/O.
- Exact help bytes, buffered structured output, empty ordinary stderr, and no
  raw runtime or dependency output.
- Exact exit codes with default defect reporting disabled and interrupt
  behavior retained.
- Omitted/`none` logging silence, every threshold and `warning` alias,
  canonical JSON Lines, bounded context, and result/I/O invariance.
- Node 22 and 24 behavior on Linux, macOS, and Windows.
- TypeScript, language-service diagnostics, and `@effect/vitest` against the
  exact lockfile.

## Gate

Passed. The documented Node-core command seam and public Effect runtime,
platform, logging, and test seams can implement the complete accepted grammar,
output, logging, and failure contract without internal imports or duplicated
lexing.

## Validation Evidence

An exact temporary install of the selected package set passed strict TypeScript
checking with the language-service plugin enabled; its diagnostics command
also produced the expected Effect diagnostic. Published-package probes
confirmed Console replacement, root-handler behavior, extra-operand behavior,
the `CliError` tag mismatch, and public exports. `util.parseArgs` token probes
produced the same duplicate-option, positional, and terminator structure on
Node 22.17 and Node 24.15. Repository production tests remain assigned to
Phase 2 rather than treating temporary inspection as durable evidence.

# V0 CLI Delivery Plan

Status: TypeScript, Effect 4, `effect/unstable/cli`, Effect logging, Node, npm
distribution, and pnpm development are the confirmed implementation direction;
the six CLI contract decisions and `@cpai/fs` package identity are confirmed.
No CLI source, build, package, or executable exists. Contract-artifact
alignment and exact candidate Effect integration source inspection are next,
followed by acceptance fixtures and production implementation with retained
tests.

This is the detailed delivery plan for the reference `fs` CLI. The root
[roadmap](../../ROADMAP.md) remains the strategic product sequence. The
[CLI design](../cli.md) owns command intent, and the
[CLI acceptance contract](../cli-acceptance.md) owns observable process
behavior.

## Objective

Deliver a deterministic, non-interactive reference CLI that:

- discovers the FS contract through no-argument output, help, guidance,
  schemas, and examples;
- fully validates FS documents from a path or standard input;
- reports conformance, calculations, and snapshot comparison separately; and
- atomically creates an exact-byte copy of a structurally conforming candidate
  without overwriting an existing path.

The first implementation milestone ends with `fs create`. Agent Skill
generation, snapshot recording, rendering, and public release follow as
separate gated phases.

## Current State

Completed foundations:

- [x] V0 semantic specification and document schemas.
- [x] Valid, invalid, calculation-result, and snapshot-diff fixtures.
- [x] Authoring guidance and CLI command scenarios.
- [x] Deterministic CLI fixture protocol and shared output invariants.
- [x] Detailed implementation plan.
- [x] TypeScript/Node implementation direction, npm/npx distribution, and pnpm
  development tooling selected.
- [x] Effect 4 runtime, `effect/unstable/cli`, and Effect logging selected.
- [x] Six remaining CLI contract decisions and the public `@cpai/fs` package
  identity confirmed.

Missing implementation foundations:

- [ ] Confirmed snapshot, example, guide, help, duplicate-member, and numeric
  scale decisions applied to schemas, fixtures, and exact generated assets.
- [ ] Exact candidate coordinated Effect package source and public API seam
  inspected, with source-opaque behavior allocated to retained production
  tests.
- [ ] Deterministic CLI fixture schema, manifest, cases, and runner contract.
- [ ] Proven Effect CLI process adapter, deterministic logging layer, package
  execution, TypeScript source tree, dependency lock, build, and packed-package
  verification.
- [ ] CLI executable and every command implementation.
- [ ] Continuous integration and npm release packaging.

There is currently nothing to install or invoke as `fs`.

## Confirmed Direction

The contract, implementation, and distribution direction below is confirmed.
The contract decisions still require Phase 0 schema, fixture, and generated
asset work.

### Contract decisions

1. Extend snapshot-diff results with status `not-comparable` and reason
   `invalid-snapshot` when a present snapshot is structurally unusable.
2. Reject `fs example --output <path>` as usage error `2`; support only
   `fs example` and `fs example <name> [--output <path>]`.
3. Maintain one portable authoring source and generate two byte-stable targets.
   `fs guide authoring` uses installed `fs` commands; the Agent Skill uses a
   pinned `npx -y @cpai/fs@<version>` prefix. Replace repository-relative
   routes with complete commands in both targets.
4. Support `fs --help` and `--help` on every subcommand. Help is concise
   Markdown on standard output, exits `0`, leaves standard error empty, lists
   required arguments and flags with defaults, and includes two or three
   non-interactive examples. Acceptance fixtures compare it exactly.
5. Reject duplicate JSON object member names as `invalid-json` before JSON
   Schema validation. Accepting the last value would make results depend on
   parser behavior rather than the FS contract.
6. Constrain `unit.scale` to JavaScript's inclusive safe-integer range,
   `-9007199254740991` through `9007199254740991`, in the schema and semantic
   specification. This preserves the integer exactly in Node and common JSON
   consumers without imposing a financial scale policy.

### Implementation and distribution

1. Implement the reference CLI in strict TypeScript emitted as ESM JavaScript
   for supported Node.js LTS lines beginning with Node 22.
2. Use Effect 4 as the application runtime, `effect/unstable/cli` for command
   definitions and dispatch, and `@effect/platform-node` for Node services.
   Pin coordinated Effect packages exactly while V4 remains prerelease; do not
   use the Effect 3 `@effect/cli` package or mix Effect family versions.
3. Publish one standard npm package, `@cpai/fs`, with one executable named
   `fs`. The zero-global-install path is `npx -y @cpai/fs@<version>`, while
   `npm install --global @cpai/fs` remains optional. The `cpai` npm organization
   is controlled by the project owner.
4. Use pnpm for repository development only. Pin its exact version in the
   `packageManager` field and commit `pnpm-lock.yaml`; users invoking the npm
   package do not need pnpm.
5. Use strict `tsc` checking and select a bundled or unbundled ESM build during
   production scaffolding from retained package-size, cold local `npx`, and
   warm-startup tests. Ship schemas, examples, and generated guidance as exact
   package files from one owned asset boundary.
6. Use the compatible Effect language service and `@effect/vitest` as
   development-only tooling. They must not add install scripts or runtime
   dependencies to the published package.
7. Support Linux, macOS, and Windows on maintained Node.js LTS majors beginning
   with Node 22. Enumerate supported majors in `engines` and CI instead of
   claiming every Node major greater than or equal to 22.
8. Do not require Bun. Smoke-test `bunx` compatibility when inexpensive, and
   evaluate Bun standalone executables only as a future additive distribution
   option.

This is an installation decision as much as a language decision. A standard
npm package gives supported Node/npm users a pinned, one-command invocation
without a global install, and TypeScript fits the JSON- and schema-heavy
contract. pnpm improves repository dependency management but is intentionally
absent from user commands. The tradeoff is that Node remains a prerequisite;
standalone executables should be added only if release evidence shows that the
runtime prerequisite materially limits adoption. Any such executable must wrap
the same built CLI and pass the same acceptance fixtures, not become a second
implementation.

Keep the runtime dependency boundary narrow:

- define arguments, flags, subcommands, and descriptions once with Effect
  `Command`, `Argument`, and `Flag` APIs;
- expose only the accepted help and log-level built-ins; gate the version and
  completions built into the current `Command.runWith` runner without blocking
  the command-local schema `--version` flag, and exclude wizard and interactive
  behavior;
- inspect `Command.runWith`, `CliOutput`, `CliError`, and Effect console
  services as the public-runner candidate; the production adapter buffers
  framework output, translates usage failures, and emits one final process
  result without importing Effect internals or duplicating its parser;
- model expected operational failures as tagged Effect errors, convert all
  command effects and unexpected defects into a handled process outcome before
  `NodeRuntime.runMain({ disableErrorReporting: true })`, and never permit raw
  causes or runtime error reporting to reach the streams;
- use Effect services and layers at real I/O boundaries such as filesystem and
  packaged assets, while keeping semantic validation and calculation stages as
  ordinary pure TypeScript functions;
- instrument effectful decision points with `Effect.log*`, `Effect.fn`, and
  `Effect.annotateLogs`; provide a custom Effect logger that is silent by
  default and emits deterministic JSON Lines to standard error only when
  `--log-level` explicitly enables it;
- prohibit direct global `console` logging in application modules; final result
  output belongs to the process adapter and diagnostic output belongs to the
  custom Effect logger sink;
- use Ajv's Draft 2020-12 implementation only after it passes every
  schema-layer fixture, resolves bundled relative references offline, and
  exposes diagnostics that can be normalized to stable JSON Pointer paths;
- use `lossless-json` only after it proves duplicate-member rejection, exact
  number preservation, strict syntax handling, and a clean conversion boundary
  into schema and typed validation;
- prefer Effect `BigDecimal` for exact arithmetic only if it reproduces every
  parsing, calculation, comparison, and output fixture; otherwise keep a
  private native-`BigInt` decimal type behind the same narrow boundary;
- use Effect Schema for internal command outcomes and tagged errors only where
  it removes duplication; the existing JSON Schemas remain the sole document
  contract and continue to be validated by Ajv;
- translate all dependency errors at the CLI boundary; and
- pin Node, pnpm, TypeScript, Effect, the Effect language service, test tools,
  and all runtime dependency versions when the package is created.

Compile with `NodeNext` module semantics. Use `tsc` for type checking and the
Phase 2-selected build path for the published ESM entry point; publish source
maps, type declarations where useful, and the exact content assets. Effect CLI
owns parsing and dispatch, while the FS adapter remains authoritative for help,
structured stdout, diagnostic stderr, exit codes, and result ordering.

Effect logging is part of the implementation, not an alternate result channel.
Omitting `--log-level` is equivalent to `none` and leaves standard error empty.
Enabled logs contain level, event, operation, and bounded context fields, but
no wall-clock time, fiber identifiers, spans, document contents, dependency
messages, causes, or stack traces. The record schema, thresholds, and redaction
rules are stable; the broader event catalog remains internal. Logging must not
change command behavior.

The npm package is the installation and execution unit. The Agent Skill does
not assume a global binary: generated examples pin the released package version
and use `npx -y`. CLI-emitted help and guidance use `fs` because the current
process is already installed. Both forms come from one maintained command
model.

## Recommended Delivery Roadmap

| Phase | Outcome | Completion gate |
| --- | --- | --- |
| 0 | Close contracts and inspect Effect | Contracts and public seam recorded |
| 1 | Fix all CLI acceptance cases | Fixture data validates without a binary |
| 2 | Scaffold TypeScript | Packed npm CLI runs; thin validation fails closed |
| 3 | Complete full validation | All semantic and `validate` cases pass |
| 4 | Add discovery | No-args through example cases pass |
| 5 | Add atomic `create` | Write, refusal, overwrite, and fault tests pass |
| 6 | Generate agent guidance | CLI guide and Agent Skill cannot drift |
| 7 | Add remaining commands | Contract-first record and render cases pass |
| 8 | Release V0 | Cross-platform npm install and public identifiers pass |

Implementation begins only after Phases 0 and 1. Phases 2 and 3 are development
milestones, not separately releasable validators.

## Phase 0: Close Contracts and Inspect the Effect Boundary

- [x] Confirm the six contract decisions above.
- [ ] Add `not-comparable` and `invalid-snapshot` to the snapshot-diff schema.
- [ ] Add the matching language-neutral expected result and pairing for
  `duplicate-snapshot-application-key.json`.
- [x] Update the semantic specification for invalid snapshots and the numeric
  scale bound.
- [ ] Update the fixture guide for the invalid-snapshot result.
- [x] Split `fs example` documentation into list and named-example forms.
- [ ] Define the portable guide source, target-specific command rendering, and
  the exact CLI-guide and Agent Skill assets.
- [ ] Define exact top-level and per-command help output.
- [ ] Define duplicate JSON members as a parsing failure and add raw-input
  coverage outside the document fixture manifest.
- [ ] Add the safe-integer `unit.scale` bounds to the schema, plus boundary and
  out-of-range fixtures.
- [x] Confirm ownership and public use of `@cpai/fs`; replace the provisional
  package name everywhere before fixtures.
- [ ] Identify exact candidate versions for the coordinated Effect
  CLI/runtime/logging packages. Inspect source, declarations, package exports,
  and relevant upstream tests corresponding to those versions, not an unpinned
  development branch.
- [ ] Establish from that evidence whether public Effect APIs expose a viable
  seam for command grammar, runner-added built-in gating, help ownership,
  `CliError` translation, stream control, runtime error suppression, and logger
  replacement without internal imports or parser duplication.
- [ ] Record the inspected Effect versions, source references, public APIs,
  constraints, rejected approaches, and the Phase 2 retained tests assigned to
  every source-opaque Effect claim. Repeat this inspection whenever an exact
  coordinated Effect version changes.
- [ ] Revise the dependency or runner choice before production implementation
  if satisfying the accepted contract would require internal imports or parser
  recreation. Do not write a throwaway CLI or treat source inspection as
  runtime proof.
- [x] Record the resolved items as confirmed acceptance-contract decisions.

Gate: the semantic specification, schemas, fixture indexes, CLI design, and
acceptance contract describe every required V0 result without an undefined
state. Exact candidate Effect source inspection records a viable public
integration seam and assigns every source-opaque Effect claim to a retained
production test. No production package, executable, or throwaway implementation
is required.

## Phase 1: Build the Acceptance Suite

### Fixture foundation

- [ ] Create `fixtures/cli/case.schema.json` and `fixtures/cli/manifest.json`.
- [ ] Keep case descriptors language-neutral and shell-free: command, argument
  array, staged workspace, optional stdin bytes, stdout matcher, stderr matcher,
  exit code, and exhaustive filesystem state.
- [ ] Support exact stderr bytes for ordinary cases and generic structured JSON
  Lines assertions for diagnostic cases; keep one exact logging transcript as a
  canonical smoke case rather than freezing every internal event sequence.
- [ ] Support only general JSON assertions: exact member sets, subtree equality,
  JSON Pointer value equality, and nonempty-string checks.
- [ ] Support exact byte equality for JSON artifacts and generated Markdown.
- [ ] Validate every path reference and reject duplicate case identifiers.
- [ ] Add a fixture-integrity command that does not require the CLI executable.

### `fs validate` cases

- [ ] Add valid path and standard-input cases with no rules.
- [ ] Add calculation inconsistency, snapshot match, and snapshot mismatch.
- [ ] Add JSON Schema and semantic structural failures.
- [ ] Add invalid embedded snapshot, malformed syntax, duplicate JSON member,
  and out-of-range `unit.scale` input.
- [ ] Add missing path, missing and extra arguments, unknown flags, and
  unsupported format.
- [ ] Assert exact exit codes, empty stderr, and a completely unchanged
  workspace and fixed home.

### Global help and logging cases

- [ ] Add exact top-level and per-command help cases and assert that unsupported
  Effect CLI built-ins are absent and rejected; cover representative `-h`
  aliases as equivalent to `--help`.
- [ ] Add rejection cases for global version spellings and completions, a
  success case for the command-local schema `--version`, and at least one
  documented positional-then-flag invocation.
- [ ] Prove omitted `--log-level` and explicit `--log-level none` have identical
  stdout, exit codes, and filesystem effects, with empty stderr.
- [ ] Add an exact canonical JSON Lines case for `--log-level debug`, including
  stable event ordering and bounded context.
- [ ] Add threshold-filtering cases, the `warning` alias, and invalid log-level
  usage with exit code `2` and an unchanged workspace.
- [ ] Prove operational failures may emit only the accepted bounded log entries
  and that help and usage errors never emit diagnostic logs.
- [ ] Reserve dependency-read and write-order claims for Phase 2 instrumented
  boundary tests; process postconditions alone cannot prove call order.

### Remaining command cases

- [ ] Add no-argument discovery and unknown-command cases.
- [ ] Add exact portable `guide authoring` content and usage errors.
- [ ] Add schema lookup, version, output, missing-parent, and overwrite cases.
- [ ] Add example list, named lookup, output, usage, and overwrite cases.
- [ ] Add `create` path/stdin success, calculation inconsistency, structural
  refusal, malformed input, usage, missing parent, overwrite, and precedence.

Gate: all fixture descriptors and referenced expected data validate; every
command-visible field, error, exit code, and filesystem effect is fixed before
the implementation language influences it.

## Phase 2: Scaffold and Thin Validation

### Foundation

- [ ] Create `package.json` after the Phase 1 fixture gate. Set `type`, `bin`,
  `engines`, `packageManager`, and published `files` explicitly.
- [ ] Commit `pnpm-lock.yaml` and strict TypeScript configuration using ESM and
  `NodeNext`; pin the toolchain and coordinated Effect family packages to the
  exact inspected candidate versions. Repeat source inspection before using a
  different Effect version.
- [ ] Configure the compatible Effect language service and `@effect/vitest` as
  development-only tooling without package install scripts or published
  runtime baggage.
- [ ] Add focused source modules for the Effect command model, the public CLI
  process adapter, deterministic Effect logger, strict document decoding,
  validation, result encoding, exact decimals, and the single owned asset
  boundary.
- [ ] Add retained adapter tests for accepted positional and flag grammar,
  rejected built-ins, wizard and prompt paths, unsupported input, exact help,
  `CliError` translation, expected failures, unexpected defects, default
  runtime cause suppression, standard streams, and exit codes.
- [ ] Add retained logging tests for the silent default, level thresholds,
  canonical JSON Lines, bounded context, and invariance of results and I/O.
- [ ] Package schemas, examples, and generated guidance from their canonical
  sources or checked generated staging; do not create a second hand-edited
  asset tree.
- [ ] Add type-check, candidate ESM builds, unit-test, and acceptance-runner
  commands; wire the existing Phase 1 fixture-integrity command into package
  scripts and CI.
- [ ] Pack the npm tarball and run its `fs` binary through npm/npx in tests so
  source-tree resolution cannot mask missing published files. Assert exact
  asset bytes, executable mapping, and packed inventory.
- [ ] Compare bundled and unbundled production layouts using retained packed
  install-size, cold local `npx`, and warm-startup measurements; select and
  retain one build path.
- [ ] Start the Linux, macOS, and Windows CI matrix with documentation, fixture
  integrity, build, unit, and packed-package checks; expand it with each later
  phase's gate.

### Thin `validate` path

- [ ] Define the command tree once with Effect CLI and validate the command,
  arguments, global flags, and command flags before running the handler or
  reading dependencies.
- [ ] Convert command handlers to handled Effect outcomes with tagged expected
  errors; keep raw Effect causes and runtime failure reporting outside the
  process contract.
- [ ] Catch unexpected defects only at the outermost adapter, translate them to
  bounded `internal-error` outcomes, and run Node with
  `disableErrorReporting: true` so default pretty causes cannot reach stderr.
- [ ] Provide filesystem, standard-input, packaged-asset, clock-free logging,
  and process-output boundaries as narrow Effect services and layers. Keep
  parsing decisions and validation calculations as pure TypeScript.
- [ ] Read the exact candidate bytes once from a path or standard input.
- [ ] Distinguish missing/unreadable input from malformed JSON.
- [ ] Decode UTF-8 fatally and reject malformed syntax, trailing content, and
  duplicate object members before JSON Schema validation.
- [ ] Retain unit and process cases that distinguish fatal UTF-8, malformed
  syntax, trailing content, duplicate members, and unsafe numeric lexemes.
- [ ] Preserve JSON numeric lexemes until the safe `unit.scale` boundary is
  enforced; do not silently round through JavaScript `number`.
- [ ] Validate JSON shape with bundled Draft 2020-12 schemas and translate
  diagnostics to stable code and JSON Pointer paths.
- [ ] Retain Ajv tests that resolve all bundled schemas offline and normalize
  every schema-layer fixture from stable diagnostic inputs.
- [ ] Produce final structured usage, operational, and schema-failure output.
- [ ] Instrument bounded decision points through Effect logging and prove that
  the silent default and every enabled threshold preserve command behavior.
- [ ] Use instrumented Effect boundary services to compare input-read and
  write-call traces with logging omitted, disabled, and enabled, and to prove
  usage errors do not invoke I/O.
- [ ] Keep schema-valid input internal or fail it closed until semantic
  validation is complete; never report partial validation as conforming.

Gate: CLI adapter, logging, argument, input, parsing, and schema-failure cases
pass against the packed executable. Retained adapter, logging, npm/npx, asset,
and build-layout tests also pass. No distributable artifact is published, and
schema-valid input cannot receive a false success.

## Phase 3: Complete Validation

Implement semantic checks as pure deterministic stages over a typed document:

- [ ] definition identifiers, uniqueness, and references;
- [ ] dates, duration ordering, and period-definition uniqueness;
- [ ] fact coordinates, dimensions, units, and duplicate detection;
- [ ] statement axes and presentation references;
- [ ] rule scopes, assertion coordinates, roll-forward constraints, and units;
- [ ] validation snapshot structure and application-key uniqueness;
- [ ] exact base-ten arithmetic without binary floating point;
- [ ] deterministic rule binding, skips, errors, tolerances, and result order;
- [ ] snapshot match, mismatch, addition, change, removal, and not-comparable;
  and
- [ ] complete validation envelope and contextual help.

Test Effect `BigDecimal` against every required parse, arithmetic, comparison,
and output fixture in the retained Phase 3 suite. Use it only if every case
passes; otherwise implement an exact private decimal value backed by a native
`BigInt` coefficient and an explicit base-ten scale. In either case, keep
parsing, arithmetic, comparison, and normalized formatting behind one boundary
so callers cannot accidentally use floating point or expose an implementation
type to JSON serialization.

Gate:

- every `fixtures/valid/` and example document conforms;
- every `fixtures/invalid/` document fails with its stable layer, code, and
  path;
- every calculation-result and snapshot-diff pairing is semantically equal;
  and
- every `fs validate` acceptance case passes for path and standard input.

Only this gate makes `fs validate` a real conformance command.

## Phase 4: Discovery and Bundled Content

- [ ] Implement deterministic no-argument discovery without directory scans.
- [ ] Implement exact top-level and per-command help.
- [ ] Implement the installed-CLI guidance generator and `guide authoring` from
  its generated Markdown asset.
- [ ] Build one atomic no-replace output module for every command that writes.
- [ ] Write temporary files in the destination directory with safe permissions,
  flush them, install without replacement, and clean up ordinary failures.
- [ ] Add controlled fault points and platform tests for the shared writer.
- [ ] Implement all three schema names and exact-byte output writes.
- [ ] Implement example listing, named lookup, and exact-byte output writes.
- [ ] Reject unknown names, versions, arguments, flags, and unnamed output.
- [ ] Verify generated guidance and packaged assets are current in CI.

Gate: all no-argument, help, guide, schema, and example acceptance cases pass
without network access or ambient repository files. Schema and example output
writes also pass no-overwrite and fault tests on every supported platform.

## Phase 5: Atomic Creation

- [ ] Buffer candidate bytes once, run the complete validator, and write those
  same bytes only when structurally conforming.
- [ ] Preflight an existing destination before candidate validation.
- [ ] Reuse the Phase 4 output module and enforce no-overwrite again at commit
  time to close the preflight race.
- [ ] Test path/stdin equality, calculation-inconsistent creation, structural
  refusal, existing identical/different files, races, and interrupted writes.

Do not add a second write path for `create`. The same platform-specific atomic
installation module must own schema, example, create, record, and render output.

Gate: all `create` acceptance cases and fault-injection tests pass on Linux,
macOS, and Windows, with no overwrite or observable partial destination.

## Phase 6: Agent Guidance

- [ ] Extend the Phase 4 guidance generator to produce the installable Agent
  Skill from the same maintained source as `fs guide authoring`.
- [ ] Strip repository-only and live-state content from the generated skill.
- [ ] Render every Skill command with the pinned
  `npx -y @cpai/fs@<version>` prefix while the CLI guide uses `fs`.
- [ ] Add a check that fails when either generated artifact is stale.

Gate: generation is reproducible and byte-stable, and CLI guidance cannot drift
from the Agent Skill.

## Phase 7: Remaining Commands

Repeat contract-first fixture work before implementation:

- [ ] Define and implement `record-validation`, including deterministic
  serialization, snapshot replacement, structural refusal, and no-overwrite.
- [ ] Define and implement `render`, including exact output ownership and
  presentation-only behavior.

Gate: each command has deterministic fixtures before code and passes its full
process, output, and filesystem suite.

## Phase 8: Release Readiness

- [ ] Replace placeholder schema identifiers with immutable public URLs.
- [ ] Decide whether V0 permits the optional constant `$schema` pointer.
- [ ] Confirm the public product, npm package, executable, and release names
  remain compatible with the confirmed `@cpai/fs` identity.
- [ ] Run unit, conformance, acceptance, fault, and generated-file checks in CI.
- [ ] Test the packed package on Linux, macOS, and Windows using every maintained
  Node.js LTS major supported by the package.
- [ ] Publish the npm package with provenance and smoke-test both pinned `npx`
  invocation and global installation.
- [ ] Publish concise installation and non-interactive usage documentation.

Gate: a clean checkout can reproduce every generated asset, test, and release
package, and a locally installed packed CLI passes smoke acceptance cases
without repository files or network access. Registry installation is verified
separately with network access.

## Validation Strategy

- **Documentation:** Markdown lint, local-link resolution, and JSON example
  parsing.
- **Source inspection:** exact candidate coordinated Effect package source,
  declarations, exports, and relevant upstream tests, with the public seam and
  source-opaque Effect claims recorded before production implementation.
- **Fixture integrity:** descriptor-schema validation, reference resolution,
  unique identifiers, and complete expected-output coverage.
- **Unit:** exact decimals, dates, coordinates, rule binding, diagnostics, and
  snapshot identity/diff behavior.
- **Effect CLI adapter:** command grammar, accepted global flags, exact help,
  buffered framework output, tagged-error mapping, and suppression of raw
  causes, dependency messages, and stack traces.
- **Logging:** silent default, one exact canonical JSON Lines smoke transcript,
  structural event checks, level thresholds, bounded context, and invariance of
  stdout, exit codes, and filesystem state.
- **Boundary traces:** instrumented Effect services proving input-read and
  write-call ordering, usage-error precedence, and logging invariance.
- **Conformance:** every existing language-neutral document/result pairing.
- **Package:** packed-file inventory, executable mapping, exact bundled assets,
  local npm/npx installation, packed install size, cold local `npx` execution,
  warm process startup, and explicit separation of package-manager cache effects
  from child-process filesystem assertions.
- **Process acceptance:** real executable, captured stdout/stderr, exit code,
  fixed environment, path/stdin, and exhaustive filesystem comparison.
- **Fault injection:** atomic output lifecycle and cleanup at each failure
  boundary.
- **Cross-platform:** Linux, macOS, and Windows on supported Node LTS lines for
  path, stdin, encoding, package execution, and no-overwrite behavior.

After every reviewable slice, run the repository code-review workflow. Use an
independent reviewer for shared result contracts, semantic validation,
calculation logic, snapshot behavior, cross-platform writes, and generated
agent guidance.

## Progress Rules

Keep this file as the implementation handoff:

- update `Current State` and checkboxes in place;
- record only current validation, blockers, and the next action;
- do not append session transcripts or raw command output; and
- do not mark a phase complete until its gate passes.

## Current Validation

As of 2026-07-16, the changed planning and specification documents pass
targeted Markdown lint; all local links resolve; all embedded JSON examples
parse; and the working diff has no whitespace errors. Full-repository Markdown
lint still reports 15 pre-existing line-length violations in
`examples/README.md` and `fixtures/README.md`. A prior minimal
`effect@4.0.0-beta.98` API probe confirmed documented positional-then-flag
parsing and command-local schema `--version` precedence; it also showed that
the candidate runner exposes global version, completions, log-level, `--help`,
and `-h` behavior that the adapter must own. This preliminary evidence guides
exact-version Effect source inspection but does not replace it or retained
production tests. Implementation, conformance, acceptance, and build checks
remain unavailable because no CLI source or fixture runner exists. The six
fixture-blocking contract decisions are confirmed, and the project owner
confirmed `@cpai/fs` under the controlled `cpai` npm organization as the public
package identity.

## Next Action

Finish Phase 0 in two lanes: inspect exact candidate coordinated Effect package
source and public exports, and apply the confirmed decisions to the remaining
schemas, fixtures, help, and generated guidance. Record the viable public seam
and assign every source-opaque Effect claim to its retained Phase 2 test. Then
build the Phase 1 acceptance suite. Begin production implementation only after
Phase 1; every executable proof written from that point remains in the
repository.

# V0 CLI Delivery Record

Status: Complete.

This record summarizes the completed reference-CLI milestone through
`fs create` and its subsequent Effect-native command migration. The
[CLI design](../cli/design.md) owns current command intent, the
[CLI acceptance contract](../cli/acceptance.md) owns observable process
behavior, and the [roadmap](../../ROADMAP.md) owns strategic sequence.

## Milestone

The milestone delivered the packed `@cpai/fs` executable with contract
discovery, bundled guidance and examples, complete document validation,
snapshot comparison, and atomic exact-byte document creation. It then replaced
the initial Node-core grammar adapter and maintained help assets with a command
tree and runner built from the public `effect/unstable/cli` API.

The package was renamed after this milestone. The
[active release plan](v0-release-candidate.md) owns the current npm identity.

Agent Skill generation, validation-snapshot recording, rendering, and release
preparation were delivered by later roadmap milestones.

## Stable delivery decisions

- The CLI is file-first and non-interactive. It validates a complete candidate
  rather than exposing field-by-field document mutation.
- JSON remains the artifact and structured-result encoding. Bundled schemas,
  examples, and guidance retain their maintained encodings and exact bytes.
- Full conformance combines the bundled JSON Schema with every semantic
  invariant. Intermediate implementations failed closed rather than reporting
  false conformance.
- Parsing rejects malformed syntax, trailing content, duplicate JSON object
  members, and unsafe numeric lexemes before schema validation.
- Exact decimal arithmetic is isolated from binary floating point.
- Operational failures use bounded tagged outcomes, and the outer process
  boundary translates unexpected defects without exposing dependency output,
  causes, or stacks.
- Logging is silent by default. Explicit logging uses deterministic bounded
  JSON Lines without changing results, I/O order, or filesystem effects.
- Every output operation uses one shared atomic no-overwrite writer. It does
  not create parent directories, preserves exact source bytes where required,
  and enforces non-replacement both before work and at commit.
- The production package remains unbundled ESM. Measurements at the milestone
  found it smaller and at least as fast as the evaluated externalized bundle,
  while keeping the installed output easier to audit.

## Effect-native command boundary

The final command grammar uses `effect/unstable/cli` through its public barrel
and keeps the command tree behind one private module. The pinned Effect release
provides native help, version, completions, and log-level actions; FS accepts
those surfaces and tests their semantic inventory rather than maintaining a
second help document.

The pinned CLI release required public refinements around two upstream
behaviors:

- consume-all operands are refined to the required cardinality, and exact-one
  operand descriptions explicitly state that rule even when native usage
  displays a variadic ellipsis; and
- single-valued command-local flags are restricted to one occurrence.

Subcommand operands following `--`, alternate flag placement, combined action
flags, valueless completions, and repeated framework-owned global flags were
left outside the supported workflow instead of reconstructing a custom parser.
The seam must be re-audited whenever the coordinated Effect packages change.

## Delivered capabilities

The implementation sequence established:

1. aligned artifact, guide, snapshot-diff, raw-input, and process contracts;
2. a strict TypeScript package, exact lockfile, offline packaged-asset boundary,
   schema validator, deterministic logger, and packed-process harness;
3. complete semantic validation, calculation results, and snapshot comparison;
4. deterministic discovery plus exact guide, schema, and example content;
5. the shared crash-safe writer and exact-byte `fs create`; and
6. the Effect-native grammar, native actions, and usage presentation described
   above.

The implementation kept semantic and arithmetic modules pure and introduced
services only at process, filesystem, logging, and packaged-asset boundaries.

## Validation evidence

At closure, the full repository gate passed strict TypeScript and Effect
diagnostics, unit and boundary tests, packed-process acceptance, writer fault
and contention integration, and installed-tarball npm/npx smoke. The same gate
passed on the declared Node.js lines across Linux, macOS, and Windows, together
with documentation and whitespace checks.

Tests retained the source-opaque guarantees that black-box fixtures cannot
prove: application I/O is not entered after grammar failure or native-action
short-circuiting; input is read once; logging preserves boundary ordering;
writers survive injected crash points without exposing partial output; and
concurrent writers produce one complete winner without overwriting.

## Subsequent work

Roadmap step 9 added generated Agent guidance, `record-validation`, and
`render`; its [completed plan](agent-guidance-snapshots-rendering.md) owns that
evidence. Roadmap step 10 later replaced the artifact's dimensional model with
statement-owned item rows while retaining this CLI's process, logging,
packaging, and writer guarantees; its
[completed plan](statement-item-row-refactor.md) owns that cutover.

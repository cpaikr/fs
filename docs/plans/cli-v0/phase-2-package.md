# Phase 2: Package and Fail-Closed Validation

Status: in progress.

This plan creates the package, production entry point, test harnesses, and a
thin validator that cannot report false conformance. It implements the
Node-core command and public Effect integration seams selected in
[Phase 0b](phase-0-effect.md) against the complete fixture protocol fixed in
[Phase 1](phase-1-acceptance.md).

## Package Foundation

- [x] Add `package.json`, an exact pnpm lock, strict TypeScript configuration,
  and explicit `type`, `bin`, `engines`, `packageManager`, and published files.
- [ ] Pin the inspected Effect stack, TypeScript, Ajv, parser, test tools,
  Effect language service, and `@effect/vitest` without install scripts.
- [ ] Separate command model, process adapter, logger, decoding, validation,
  result encoding, exact decimals, and packaged assets into focused modules.
- [x] Use `util.parseArgs` tokens behind one command adapter that rejects
  duplicates, misplaced command-local flags, extra operands, and unsupported
  built-ins before application I/O.
- [ ] Add type-check, build, unit, fixture-integrity, acceptance, pack, and
  local npm/npx smoke commands.
- [ ] Compare bundled and unbundled ESM with retained package-size, cold local
  `npx`, and warm-startup measurements; retain one production layout.
- [ ] Add Linux, macOS, and Windows CI across declared maintained Node.js LTS
  majors beginning with Node 22.

## Thin Validation Path

- [x] Validate command grammar before reading input or touching output paths.
- [x] Translate expected failures to tagged outcomes and unexpected defects to
  bounded `internal-error` output before running Node with default defect
  reporting disabled.
- [ ] Read exact path or standard-input bytes once and decode UTF-8 fatally.
- [ ] Reject malformed syntax, trailing content, duplicate members, and unsafe
  numeric lexemes before JSON Schema validation.
- [ ] Evaluate `lossless-json` only if it preserves numeric lexemes, rejects
  duplicate members, and exposes a narrow typed conversion boundary.
- [ ] Resolve bundled Draft 2020-12 schemas offline with Ajv and normalize
  diagnostics to stable codes and JSON Pointer paths.
- [ ] Retain adapter, logger, parsing, schema, package, asset, and I/O-order
  tests against the production entry point.
- [x] Keep schema-valid input internal or fail it closed until Phase 3.

## Delivery Constraints

- Publish `@cpai/fs` with executable `fs`; pnpm is repository tooling only,
  and Bun is not required.
- Package schemas, examples, help, and guide assets behind one owned boundary
  and verify their exact packed bytes.
- Keep semantic validation and arithmetic pure; introduce services only at I/O
  and packaged-asset boundaries.
- Effect Schema may remove internal duplication, but published JSON Schemas
  remain the sole artifact shape contract.

## Gate

Packed-process usage, parsing, schema-failure, adapter, logging, package, and
asset tests pass. No input can receive a false conformance success.

## Validation Evidence

The exact lock, strict configs, Effect entry point, token grammar, bounded
process adapter, unit tests, unbundled build, installed-tarball smoke, exact
asset verification, and packed acceptance harness exist. Thirty-seven
read-only content cases pass from the installed tarball. Input decoding, JSON
and schema validation, acceptance-script wiring, runtime measurements, and CI
remain open.

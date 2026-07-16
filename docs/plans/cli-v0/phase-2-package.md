# Phase 2: Package and Fail-Closed Validation

Status: complete.

This plan creates the package, production entry point, test harnesses, and a
thin validator that cannot report false conformance. It implements the
Node-core command and public Effect integration seams selected in
[Phase 0b](phase-0-effect.md) against the complete fixture protocol fixed in
[Phase 1](phase-1-acceptance.md).

## Package Foundation

- [x] Add `package.json`, an exact pnpm lock, strict TypeScript configuration,
  and explicit `type`, `bin`, `engines`, `packageManager`, and published files.
- [x] Pin the inspected Effect stack, TypeScript, Ajv, test tools,
  Effect language service, and `@effect/vitest` without install scripts.
- [x] Separate command model, process adapter, logger, decoding, validation,
  result encoding, exact decimals, and packaged assets into focused modules.
- [x] Use `util.parseArgs` tokens behind one command adapter that rejects
  duplicates, misplaced command-local flags, extra operands, and unsupported
  built-ins before application I/O.
- [x] Add type-check, build, unit, fixture-integrity, acceptance, pack, and
  local npm/npx smoke commands.
- [x] Compare bundled and unbundled ESM with retained package-size, cold local
  `npx`, and warm-startup measurements; retain one production layout.
- [x] Add Linux, macOS, and Windows CI across declared maintained Node.js LTS
  majors beginning with Node 22.

## Thin Validation Path

- [x] Validate command grammar before reading input or touching output paths.
- [x] Translate expected failures to tagged outcomes and unexpected defects to
  bounded `internal-error` output before running Node with default defect
  reporting disabled.
- [x] Read exact path or standard-input bytes once and decode UTF-8 fatally.
- [x] Reject malformed syntax, trailing content, duplicate members, and unsafe
  numeric lexemes before JSON Schema validation.
- [x] Retain the smaller private scanner after proving it preserves the
  required numeric boundary and rejects duplicate members before `JSON.parse`.
- [x] Resolve bundled Draft 2020-12 schemas offline with Ajv and normalize
  diagnostics to stable codes and JSON Pointer paths.
- [x] Retain adapter, logger, parsing, schema, package, asset, and I/O-order
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
process adapter, installed-tarball smoke, exact assets, and packed harness
pass. Fatal decoding, the duplicate-aware scanner, offline Ajv, normalized
schema errors, semantic validation, deterministic logging, and all validation
and logging cases pass. Retained tests cover every log threshold, aliases,
single-read behavior, grammar-before-I/O, output-preflight precedence, and
logging-invariant read/write order.

The retained unbundled ESM layout is 110,393 bytes with source maps versus
137,892 bytes for an esbuild bundle with npm packages external. In a 15-run
macOS Node 24.15.0 sample, unbundled first/median process startup was
201.11/195.23 ms versus 213.21/205.55 ms bundled. The packed package is 32,233
bytes compressed and 158,379 bytes unpacked across 46 files; local cold and
warm `npx` samples were 941.09 ms and 403.15 ms median. The smaller,
equally-fast, easier-to-audit unbundled layout remains production.

`pnpm verify` passes on macOS and in isolated Linux Node 22.17.0 and 24.15.0
environments. The repository CI matrix applies the same gate to both versions
on Linux, macOS, and Windows, with a separate documentation-contract job.

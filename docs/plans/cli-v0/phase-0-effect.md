# Phase 0b: Effect Integration

Status: not started.

This plan proves that the selected maintained Effect stack can implement the
accepted CLI process contract entirely through public APIs. It owns dependency
inspection decisions; the production adapter and retained tests belong to
[Phase 2](phase-2-package.md).

## Scope

- [ ] Select exact coordinated versions for Effect, the unstable CLI,
  Node.js platform/runtime, logging, language service, and test packages.
- [ ] Inspect package source, declarations, exports, and relevant upstream
  tests at those exact versions.
- [ ] Inspect `Command.runWith`, `CliOutput`, `CliError`, console services,
  logger replacement, and Node runtime behavior as adapter candidates.
- [ ] Establish a public seam for command grammar, built-in gating, exact help,
  usage-error translation, buffered stream ownership, runtime-error
  suppression, and logger replacement.
- [ ] Record source references, constraints, rejected approaches, and a
  retained production test for every source-opaque claim.
- [ ] Revise the dependency or runner choice if the accepted contract would
  otherwise require internal imports or duplicated parsing.

## Selected Constraints

- Use strict TypeScript with ESM and `NodeNext` semantics on maintained
  Node.js LTS majors beginning with Node 22.
- Use Effect 4, `effect/unstable/cli`, and `@effect/platform-node`. Pin the
  coordinated prerelease packages exactly and upgrade them as one tested set.
- Put a narrow public-API adapter around the command framework. It owns exact
  help, accepted built-ins, buffered output, tagged-error translation, and
  suppression of raw causes and stack traces.
- Use Effect logging for structured decision events. Logging is silent by
  default and, when enabled, emits deterministic bounded JSON Lines only on
  standard error.
- Application modules do not use the global console. The process adapter owns
  accepted output, and the custom logger owns diagnostics.

## Inspection Record

Exact versions, source references, viability findings, rejected approaches,
and required retained tests are pending source inspection.

## Gate

A documented public Effect integration seam is viable for the complete
accepted grammar, output, logging, and failure contract. No throwaway
executable is required.

## Validation Evidence

No Effect packages are installed and no source inspection has been recorded.

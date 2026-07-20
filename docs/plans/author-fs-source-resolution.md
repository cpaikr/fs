# Author FS Source-Resolution Plan

Status: Complete. PR `#23` contains the reviewed implementation, and full CI
run `29679555660` passed at implementation head `000e37d`.

This focused plan owns delivery status for delegated source resolution in the
repository-distributed `author-fs` Skill. The [authoring policy](../authoring.md)
owns the financial-decision boundary, the
[portable workflow](../../content/guide/authoring.md.template) owns encoding and
repair, and the [CLI design](../cli/design.md) owns the CLI boundary.

## Objective

Make the Skill handle ordinary source-material requests, including vague
requests to organize supplied statements, while preserving FS as a resolved
artifact contract rather than an extraction or conversion engine.

## Decisions

- Route invocations explicitly among source material, an already-resolved
  model, and existing FS JSON.
- Treat a user-delegated agent as the authoring actor for evidence-supported
  source resolution. Escalate only ambiguity that lacks a defensible source
  basis and would materially change financial meaning.
- Require an explicit source-fidelity gate before FS validation. Structural
  conformance does not prove that labels, periods, scales, signs, or values
  match the supplied statements.
- Preserve the existing repair invariant: validate an unchanged candidate
  first and never reinterpret its supplied financial choices during structural
  repair.
- Keep source records, assumptions, and limitations outside FS JSON. The
  semantic specification, schemas, and CLI commands remain unchanged.
- Run documentation validation for every CI change. Let a fail-closed,
  workflow-local path classifier skip the expensive gates only for the
  explicitly safe guidance surface.

## Validation

- `pnpm check` passed generated-artifact parity, documentation and contract
  checks, type and strict Effect diagnostics, unit and process acceptance,
  writer integration, and packed-package validation.
- `pnpm audit:prod` reported no known production vulnerabilities.
- The official Skill structure validator passed in an isolated PyYAML
  environment.
- A blind vague-invocation test selected the source-material route, resolved
  the supplied statement model, and preserved the pinned package boundary. It
  exposed an over-inferred rollup; after the guide was tightened, a fresh blind
  test left that unsupported relationship unencoded.
- The CI classifier parsed successfully and selected lightweight CI for the
  original guidance-only change, full CI for an unavailable comparison, full
  CI for a source change, and full CI for the workflow-changing implementation
  head. Remote run `29679555660` passed the complete gate.
- Independent implementation, design, and complexity review found no narrow
  safe fixes. Mixed source material plus existing FS JSON remains a separate
  authority decision between reconciliation and structural repair.

## Blockers

None.

## Follow-up Boundary

No source-resolution delivery action remains. Mixed source material and an
existing FS document were recorded as future scope rather than decided by this
completed milestone; any later work must establish which input is authoritative
before combining reconciliation with structural repair.

# Author FS Source-Resolution Plan

Status: In Progress.

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

Pending generated-artifact parity, documentation checks, Skill structure
validation, vague-invocation forward testing, complete repository checks, and
independent review.

## Blockers

None.

## Next Action

Complete validation and independent review, address safe findings, then push
the reviewed follow-up to PR `#23`.

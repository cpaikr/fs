# Repository Instructions

## Repository state

- Read [the completed step-9 plan](docs/plans/agent-guidance-snapshots-rendering.md)
  before assuming any package, executable, build, validator, or command is
  available.
- Start with [the documentation index](docs/README.md) and use its authority
  map instead of inferring behavior from summaries.
- Treat CLI contract prose as intended behavior, not evidence that the behavior
  is implemented.

## Change discipline

- Update a decision in its owning document, then link to it from summaries.
  Keep completed step-9 delivery evidence in
  [its plan](docs/plans/agent-guidance-snapshots-rendering.md). For later
  roadmap work, do not copy live status or a next action outside the
  applicable active plan.
- Keep contract changes aligned across the semantic specification, schemas,
  fixtures, and affected CLI contracts. Record known temporary drift in the
  applicable active plan when later roadmap work is explicitly started.
- Update progress, validation, blockers, and the next action in place. Do not
  append session logs.
- Do not edit examples or expected-result fixtures merely to make a prose
  summary appear current; resolve the underlying contract deliberately.

<!-- effect-solutions:start -->

## Effect

Before writing Effect code, run `effect-solutions list`, then
`effect-solutions show <topic>` for the relevant guide. Do not guess Effect
patterns.

<!-- effect-solutions:end -->

## Verification

- Run `./scripts/check-docs.sh` after changing documentation, schemas,
  examples, or fixtures.
- Run `git diff --check` before handing off a change.

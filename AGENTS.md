# Repository Instructions

## Repository state

- Read [the active CLI plan](docs/plans/cli-v0.md) before assuming any package,
  executable, build, validator, or command is available.
- Start with [the documentation index](docs/README.md) and use its authority
  map instead of inferring behavior from summaries.
- Treat CLI contract prose as intended behavior, not evidence that the behavior
  is implemented.

## Change discipline

- Update a decision in its owning document, then link to it from summaries.
  Do not copy live status or a next action outside
  [the active CLI plan](docs/plans/cli-v0.md).
- Keep contract changes aligned across the semantic specification, schemas,
  fixtures, and affected CLI contracts. Record known temporary drift in the
  active plan.
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

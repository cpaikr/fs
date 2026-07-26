# Repository Instructions

## Repository state

- Start with [the documentation index](docs/README.md) and use its authority
  map instead of inferring behavior from summaries.
- Use the [documentation index](docs/README.md) to find the active plan for
  live status and the next action. Completed milestone plans are historical
  delivery evidence, not current-state summaries.
- Verify implementation availability in source, configuration, tests, or the
  built package. Treat CLI contract prose as intended behavior, not evidence
  that the behavior is implemented.
- Use the [development guide](docs/development.md) for supported repository
  commands instead of recovering workflows from completed plans.

## Change discipline

- Update a decision in its owning document, then link to it from summaries.
  Keep milestone delivery evidence in its completed plan, and keep live status
  and the next action only in the applicable active plan.
- Keep contract changes aligned across the semantic specification, schemas,
  fixtures, and affected CLI contracts. Record known temporary drift in the
  applicable active plan when later roadmap work is explicitly started.
- Update progress, validation, blockers, and the next action in place. Do not
  append session logs.
- Do not edit examples or expected-result fixtures merely to make a prose
  summary appear current; resolve the underlying contract deliberately.

## Release ownership

- Release Please owns package version bumps, `.release-please-manifest.json`,
  `CHANGELOG.md`, release tags, and GitHub releases. Change release inputs or
  configuration instead of editing those generated artifacts manually.
- A push to `main` may create or update a release PR but does not tag a
  release. Dispatch the Release Please workflow manually only after the exact
  package version has been published and verified.

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

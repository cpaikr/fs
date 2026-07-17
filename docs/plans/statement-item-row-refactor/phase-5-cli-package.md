# Phase 5: CLI, Guidance, and Package Integration

This phase updates every user-facing projection of the new contract without
changing unrelated command grammar or filesystem guarantees. The
[plan index](../statement-item-row-refactor.md) owns live state.

## Authoring and Discovery

- Rewrite the authoritative `content/guide/authoring.md.template` around
  statement items, nested maps, grouping columns, and confirmed rollups.
- Regenerate `assets/guide/authoring.md` and `skills/author-fs/SKILL.md`; never
  hand-edit generated copies to hide source drift.
- Update `src/assets.ts` and discovery descriptions only if example names or
  inventories change.
- Update root and scoped README routing after the new contract becomes current.

## CLI Evidence

- Complete and execute the artifact-consuming cases under
  `fixtures/cli/cases/{validate,create,record-validation,render}/` whose static
  artifact assertions were aligned in Phase 1.
- Reuse Phase-1 validation and recorded-document outputs and Phase-4 HTML
  fixtures. Fix a shared expectation in its owning phase instead of copying or
  silently redefining it here.
- Update the remaining process-owned schema, example, guide, discovery, help,
  logging, and filesystem assertions and exact outputs.
- Preserve command grammar, exit-code classes, logging invariants, exact-byte
  copying, atomic no-overwrite writes, missing-parent behavior, contention,
  and error precedence unless Phase 0 identified a direct contract change.
- Keep generic fixture and writer harnesses. Their “member” terminology refers
  to JSON object members and must not be removed during a domain-term sweep.

## Package Integration

- Rebuild and validate the packed `@cpai/fs` tarball with every supported schema,
  selected examples, generated guide, validator, snapshot recording, and
  renderer.
- Do not add a dependency merely to translate between the removed and accepted
  models.
- Do not publish, replace placeholder schema URLs, or claim cross-platform
  release readiness; those remain Roadmap step 11.

## Gate

- Generated guidance matches its source exactly.
- All CLI acceptance descriptors and expected outputs pass.
- Installed-tarball discovery, validation, creation, snapshot recording, and
  rendering smoke passes.
- `pnpm verify`, `./scripts/check-docs.sh`, and `git diff --check` pass.

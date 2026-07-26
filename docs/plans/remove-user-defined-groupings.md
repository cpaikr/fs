# Remove User-Defined Groupings in FS 0.2

Status: Active. The target contract is documented; implementation is pending.

## Outcome

FS `formatVersion: "0.2"` represents statement-owned financial items, exact
period values, units, order, descriptions, and explicit additive rollups. It
does not contain user-defined grouping columns or item grouping maps. Projects
own any classification or mapping data outside FS.

The change is a clean break from `0.1`: the `0.2` schema and reference CLI do
not accept, convert, normalize, or otherwise support `0.1` documents.

## Current state

`@sjunepark/fs@0.1.0` is published with optional top-level
`groupingColumns`, required item `groupings` maps, and dependent validation,
rendering, examples, fixtures, and authoring guidance. The product-boundary
decision to remove those fields is confirmed; the repository still implements
and packages the `0.1` contract.

The target product, semantic, authoring, CLI, rendering, glossary, and decision
documents now define `0.2`. The JSON Schemas, source, examples, fixtures,
generated guidance, and packaged assets still implement `0.1`. This plan is the
sole owner of that intentional drift until the refactor closes it.

## Fixed decisions

- Remove both `groupingColumns` and item `groupings`; add no replacement field,
  FS-owned sidecar, mapping convention, or fixed classification vocabulary.
- A source category needed to distinguish financial meaning becomes part of
  the item identity or human-readable item text. An additive category is an
  explicit item and `rollupTo` relationship. Other classification, filtering,
  mapping, and styling data stays outside FS.
- Change document, validation-result, and snapshot-diff `formatVersion` values
  and published schema identifiers from `0.1` to `0.2` together.
- Reject `0.1` inputs. Do not add a compatibility reader, migration command,
  normalizer, alias, feature flag, or parallel runtime model.
- Keep `manufacturing-group` as the representative example name: `group`
  identifies its reporting entity, not the removed schema feature.
- Heterogeneous rendered statements retain the `Columns` menu for their
  conditional Unit column. Homogeneous statements expose no column menu.
- Release Please owns the package-version and generated release-artifact
  changes for the breaking pre-1.0 release.

## Refactor sequence

1. [x] Record the accepted boundary decision and align every current product,
   semantic, authoring, CLI, rendering, glossary, and routing document with
   the target `0.2` contract. Preserve completed milestone plans as historical
   `0.1` delivery evidence.
2. [ ] Replace the closed grammar and version constants across
   `schema/*.schema.json` and `src/validation/`. Remove grouping-specific model,
   schema-normalization, semantic-validation, and diagnostic paths. Update
   validation results, snapshot diffs, and pathless discovery to report only
   `0.2`.
3. [ ] Rebuild `examples/` and the language-neutral `fixtures/` corpus for
   `0.2`. Replace obsolete grouping-cell failures with explicit cases proving
   rejection of legacy `formatVersion`, the old `$schema` URL,
   `groupingColumns`, and item `groupings`. Recalibrate exact diagnostic-budget
   evidence deliberately rather than mechanically changing its count.
4. [ ] Simplify `src/render.ts` and `src/render/` presentation and template
   code, then update focused renderer tests, exact HTML, and tracked previews.
   Remove grouping headers, cells, TSV fields, tooltip context, toggles, and
   width accounting while preserving escaping, spreadsheet-control protection,
   delimiter normalization, and Unit-column behavior through surviving fields.
   Prove that heterogeneous statements expose exactly one Unit toggle and
   homogeneous statements expose no `Columns` menu.
5. [ ] Align CLI process descriptors, discovery results, snapshot-recording
   outputs, scripts, and package inventory checks with `0.2`. Ensure every old
   artifact fails closed and no command or selector exposes migration behavior.
6. [ ] Update `content/guide/authoring.md.template`, regenerate the installed
   guide and Agent Skill, update the source-resolution guide and package-facing
   documentation, and prepare immutable public `/spec/0.2/` and `/schema/0.2/`
   publication inputs. Do not modify the existing public `0.1` resources.
7. [ ] Run the complete repository and package gates, perform final review,
   and leave package-version, changelog, manifest, tag, and release generation
   to Release Please.

## Risks and guards

- Do not globally replace `0.1`; completed plans, ADR history, published
  examples, and release evidence must continue to describe the shipped version.
- Grouping fields currently carry much of the renderer's hostile-text and TSV
  test coverage. Move that evidence to item labels, descriptions, units, and
  other surviving author text before deleting the old tests.
- Exact diagnostic-fanout fixtures depend on the old required item shape and
  first error path. Re-measure them under the new grammar while preserving the
  operational budget, not the historical count.
- Regenerate both tracked HTML previews. The development guide currently names
  only the multi-statement preview command, so add a supported regeneration
  path for the minimal preview rather than editing generated HTML by hand.
- Update manually owned `0.2` publishing inputs and package metadata such as
  the homepage, but do not edit Release Please-owned versions or generated
  release artifacts.

## Validation

During implementation, use targeted schema, semantic-validation, rendering,
process, and guide-generation tests for each slice. Before completion, run:

```sh
pnpm typecheck
pnpm test
pnpm check
pnpm pack:check
git diff --check
```

Also run `pnpm release:check` only when the refactor is an authorized release
candidate.

Documentation-slice evidence: `./scripts/check-docs.sh` and
`git diff --check` pass with the target documents and the intentional `0.1`
implementation drift described above. Independent contract review has no
unresolved findings.

## Next action

Replace the shared document grammar and version constants in the three JSON
Schemas and `src/validation/`, including focused tests that reject legacy
versions and both removed properties. Keep the active drift explicit until all
dependent artifact and runtime surfaces move to `0.2`.

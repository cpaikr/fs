# Documentation

Use this index to load only the material needed for a task. Each document has
one primary responsibility.

## Start by task

- Understand the product boundary: [Product scope](product-scope.md)
- Use the canonical vocabulary: [Domain glossary](glossary.md)
- Encode a document: [Authoring guide](authoring.md)
- Implement or assess artifact behavior:
  [Semantic specification](semantic-spec.md)
- Understand the command surface: [CLI design](cli/design.md)
- Implement or test process behavior:
  [CLI acceptance contract](cli/acceptance.md)
- Review the accepted replacement model:
  [statement item rows](adr/0001-replace-dimensional-members-with-item-grouping.md)
- Continue Roadmap step 10:
  [Statement item row refactor](plans/statement-item-row-refactor.md)
- Review the independent proposed rendering policy:
  [Finite rendering limits](adr/0002-bound-render-output.md)
- See strategic milestones: [Roadmap](../ROADMAP.md)
- Inspect completed Roadmap step 9:
  [Agent guidance, snapshots, and rendering plan](plans/agent-guidance-snapshots-rendering.md)
- Inspect the completed Effect-native CLI milestone:
  [V0 CLI plan](plans/cli-v0.md)

The scoped [example guide](../examples/README.md) and
[fixture guide](../fixtures/README.md) explain their local evidence.

## Authority

When documents overlap, use this order:

1. The semantic specification defines artifact meaning. JSON Schemas enforce
   its JSON shape, and fixtures provide machine-readable conformance evidence.
   A schema or fixture mismatch is contract drift, not a second definition.
2. The CLI design defines command intent and boundaries. The CLI acceptance
   contract defines observable arguments, streams, results, exit codes, and
   filesystem effects.
3. The roadmap owns strategic sequence. The completed step-9 plan records its
   delivery decisions, gates, and validation; it is not a normative product
   contract.

The product scope and glossary explain intent and terminology but do not
override the semantic specification.

ADR 0001 fixes the accepted replacement target but does not override the
current semantic, schema, fixture, or CLI contracts until Roadmap step 10
incorporates it into those owning documents. Its active plan owns transition
state and temporary drift. Proposed ADRs have no contract authority until
accepted and incorporated.

## Maintenance

- Change the owning document and link to it from summaries instead of
  repeating decisions.
- Keep live status and the next action only in the applicable active plan when
  later roadmap work is explicitly started.
- Run `./scripts/check-docs.sh` after changing documentation or contract
  artifacts.

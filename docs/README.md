# Documentation

Use this index to load only the material needed for a task. Each document has
one primary responsibility.

## Start by task

- Continue the active rendering work:
  [Analyst-friendly HTML rendering](plans/analyst-friendly-html-rendering.md)
- Implement or review its approved visual system:
  [Analyst HTML design system](../DESIGN.md)
- Inspect the completed V0 release:
  [V0 release candidate](plans/v0-release-candidate.md)
- Set up, run, test, or package the repository:
  [Development guide](development.md)
- Understand the product boundary: [Product scope](product-scope.md)
- Use the canonical vocabulary: [Domain glossary](glossary.md)
- Understand the authoring decision boundary: [Authoring policy](authoring.md)
- Encode or repair a document:
  [Portable authoring workflow](../content/guide/authoring.md.template)
- Implement or assess artifact behavior:
  [Semantic specification](semantic-spec.md)
- Understand the command surface: [CLI design](cli/design.md)
- Implement or test process behavior:
  [CLI acceptance contract](cli/acceptance.md)
- Review the accepted replacement model:
  [statement item rows](adr/0001-replace-dimensional-members-with-item-grouping.md)
- Review the accepted independent rendering policy:
  [Finite rendering limits](adr/0002-bound-render-output.md)
- See strategic milestones: [Roadmap](../ROADMAP.md)
- Inspect the completed statement-item-row refactor:
  [Statement item row refactor](plans/statement-item-row-refactor.md)
- Inspect the completed agent-guidance, snapshot, and rendering milestone:
  [Agent guidance, snapshots, and rendering plan](plans/agent-guidance-snapshots-rendering.md)
- Inspect the completed delegated source-resolution work for the author-fs Skill:
  [Author FS source-resolution plan](plans/author-fs-source-resolution.md)
- Inspect the completed Effect-native CLI milestone:
  [V0 CLI plan](plans/cli-v0.md)

The scoped [example guide](../examples/README.md) and
[fixture guide](../fixtures/README.md) explain their local evidence.

## Authority

When documents overlap, use this order:

1. The semantic specification defines artifact meaning. JSON Schemas enforce
   its JSON shape, and fixtures provide machine-readable conformance evidence.
   A schema or fixture mismatch is contract drift, not a second definition.
   The authoring policy owns the financial-decision boundary; the portable
   workflow owns the exact create-and-repair procedure.
2. The CLI design defines command intent and boundaries. The CLI acceptance
   contract defines observable arguments, streams, results, exit codes, and
   filesystem effects.
3. The roadmap owns strategic sequence. Completed milestone plans record their
   delivery decisions, gates, and validation; they are not normative product
   contracts.

Source, configuration, tests, and built artifacts provide implementation
evidence. Contract prose defines required behavior but does not prove that a
particular checkout or package implements it.

The product scope and glossary explain intent and terminology but do not
override the semantic specification. `DESIGN.md` owns the approved visual and
interaction direction for rendered HTML; it does not override semantic or CLI
behavior.

Accepted ADRs record durable decisions and rationale incorporated into their
owning contracts. Completed plans record delivery evidence. Proposed ADRs have
no contract authority until accepted and incorporated.

## Maintenance

- Change the owning document and link to it from summaries instead of
  repeating decisions.
- Keep live status and the next action only in the applicable active plan when
  roadmap work is active.
- Run `./scripts/check-docs.sh` after changing documentation or contract
  artifacts.

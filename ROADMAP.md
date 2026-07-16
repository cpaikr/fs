# Roadmap

Status: V0 artifact contract and document-encoding guidance complete,
2026-07-16.

This file records confirmed design decisions, their evidence, and the remaining
implementation sequence. The [project proposal](docs/project-proposal.md)
defines the product boundary.

The current next slice is CLI acceptance fixtures for discovery, validation,
and atomic creation. The reference implementation begins only after those
user-visible scenarios fix the command contract.

## V0: Standalone Financial-Statement Document

V0 defines a standalone, agent-readable financial-statement artifact and its
validation rules. It standardizes structure, not extraction, accounting
taxonomy, or financial policy.

Confirmed direction:

- JSON is the canonical serialization.
- One document represents exactly one reporting entity and scope, such as a
  consolidated group or a separate legal entity.
- A document may contain multiple statements and multiple instant or duration
  periods.
- Items, calculation rules, and statement presentations use document-local,
  user-defined vocabulary.
- Facts are independent of presentation. A statement orders and presents facts
  but does not own them.
- Authors may present one fact in multiple statements or define distinct facts
  and validate a reconciliation between them. The specification does not
  choose financial identity on the author's behalf.
- Every value is stored in the document. Calculation rules validate stored
  values; they do not create, replace, or materialize facts.
- Calculation rules are optional. A document with no calculation rules is a
  conforming document, not an unchecked error case.
- Presentation order is represented by array order rather than a separate
  ordering field.
- Periods are semantic fact coordinates, not columns. A default renderer may
  present items as rows and periods as columns, but those table positions are
  not part of fact identity.
- Statements have no indentation or nesting semantics in V0. Their only
  non-item entry is a flat, label-only heading.
- Source and provenance metadata are outside the specification.
- Calculation rules must support relationships within a period and across
  periods.
  Because statements are views over shared facts, the same validation model
  also applies to facts displayed in different statements.
- A calculation rule is applied only where its declared scope applies. The
  absence of a predecessor for the first available period is therefore not a
  failure. Once a rule applies, a missing or explicitly unavailable required
  fact causes it to fail rather than silently skipping the check.
- Automatic temporal rule applications occur only where consecutive periods
  can be identified unambiguously. Gaps and ambiguous overlapping periods are
  skipped. Authors may add explicit assertions for irregular periods.
- Reusable cross-period rules focus on roll-forwards over a duration's opening,
  movements, and closing facts. Other temporal relationships may use explicit
  assertions rather than expanding V0 into a general period language.
- Calculation inconsistency does not make a document structurally invalid.
  Validation results report document conformance and calculation consistency
  separately so arithmetically inconsistent but structurally usable financial
  data remains consumable.
- Calculation status is derived validator output, not a persisted document
  field. If calculation rules are defined but every application is skipped,
  the derived status is `not-evaluated` rather than `consistent`.
- A document may contain a recorded validation-result snapshot. This does not
  create a distinct document type or filename convention; it remains an
  ordinary `fs` document. Filenames have no semantic meaning, and tools do not
  discover snapshots in neighboring files. Current status is always recomputed
  rather than read from the snapshot.
- Absolute tolerance is optional. Its implicit default is zero; a document may
  declare defaults by unit, and an individual calculation rule may override the
  applicable unit default.

The single-entity boundary keeps the scope of items, calculation rules, units,
and presentations unambiguous and avoids repeating an entity coordinate on
every fact.

## Evidence and Semantic Model

The normative [semantic specification](docs/semantic-spec.md), canonical
[examples](examples/), draft 2020-12 [JSON Schemas](schema/), and
language-neutral [fixtures](fixtures/) complete this phase.

Evidence coverage:

- `examples/manufacturing-group.json` covers multi-period income, balance
  sheet, cash flow, equity, and manufacturing presentations; passing and
  failing subtotals; fact reuse and explicit reconciliation; roll-forwards;
  first, consecutive, gapped, annual, quarterly, and YTD durations; exact
  decimals, scales, units, zero, missing and unavailable facts; and a
  non-period equity axis.
- `examples/minimal.json` proves optional document/entity/scope identity and a
  conforming document with no calculation rules.
- `fixtures/valid/` covers stored snapshots, all-skipped automatic rules,
  calculation evaluation errors, and snapshot drift.
- `fixtures/invalid/` separates JSON Schema failures from referential,
  uniqueness, coordinate, calendar, and unit semantic failures.
- `fixtures/calculation-results/` and `fixtures/snapshot-diffs/` fix exact
  arithmetic, application order and identity, aggregate statuses, tolerances,
  skip/error reasons, and deterministic comparison.

Resolved semantic decisions:

- `formatVersion` is `"0.1"`; the entity and scope have required human labels
  and optional author identities; `documentId` is optional.
- Canonical JSON stores individual facts. Compact series remain future work.
- Periods are explicitly discriminated as instant or inclusive duration
  definitions and referenced by local identifier.
- Named dimensions add complete unordered maps to fact coordinates and
  explicit ordered axes to presentations.
- Exact values are normalized decimal strings. Units contain author-defined
  measures and base-ten scales. Missing means absent; unavailable is an
  explicit fact state; zero is `"0"`.
- V0 has no classification mechanism, hierarchy, default dimension member,
  unit conversion, or inferred arithmetic.
- Same-period rules reuse an item relationship over explicit periods and
  dimension coordinates. Assertions bind exact coordinates. Roll-forwards are
  the sole automatic temporal rule and bind only a unique immediately
  preceding duration; first periods, gaps, and ambiguity have distinct skips.
- Snapshots contain only historical conformance/calculation statuses and
  ordered application results. Structured `(rule, period, dimensions)` keys
  identify applications; current results are always recomputed.
- Snapshot diffs compare status pairs and classify complete application
  objects as unchanged, changed, added, or removed in deterministic order.
- Statement periods, dimension members, and entries use array order. Flat item
  references and label-only headings are the complete V0 presentation entry
  set.

## Authoring Experience

The [authoring guide](docs/authoring.md) is the human and agent entry point. It
projects the normative artifact contract into a document-encoding workflow for
an already-resolved financial model. It does not define how financial data is
acquired, interpreted, mapped, or normalized.

Confirmed direction:

- Encoding begins only after the author supplies the entity, scope, item
  meanings, units, periods, dimensions, fact values, presentations, and any
  calculation rules. Missing or contradictory inputs must be returned to the
  author; guidance supplies no financial defaults.
- Authoring is file-first. A person or agent produces a complete candidate JSON
  document; reference tooling validates the whole document before a requested
  write.
- Reviewable authoring output includes the FS document and its structured
  validation result. FS defines no source ledger, provenance sidecar, or
  conversion record.
- Examples demonstrate artifact behavior rather than prescribe statement
  contents. `minimal.json` is the smallest complete example, not a partially
  filled template; `manufacturing-group.json` is deliberately calculation-
  inconsistent.
- The semantic specification remains the normative authority. A full reference
  validator, not JSON Schema alone, is the operational conformance check because
  schema validation cannot enforce every reference, uniqueness, calendar,
  coordinate, unit, or calculation invariant.
- Agent guidance is a first-class V0 deliverable. An installable Agent Skill
  and `fs guide authoring` share maintained guidance and invoke the same
  validator.
- The CLI does not expose field-by-field `add-account`, `add-row`, `set-cell`,
  `add-item`, or `add-fact` mutations. It also does not auto-repair, normalize,
  infer, or materialize financial values.
- `fs init` does not create a blank FS document because the canonical contract
  requires meaningful nonempty content.
- The current document contract does not permit a top-level `$schema`
  property. Before public release, the project must publish immutable schema
  identifiers and then decide whether an optional constant `$schema` pointer
  materially improves standalone discovery without implying full semantic
  validation.

## Reference Tooling

The [CLI design](docs/cli.md) fixes command scenarios and safety properties
upfront. Schema-dependent result fields, application identities, snapshot
contents, and presentation semantics are now fixed by the artifact contract.
Implementation should proceed as a thin vertical slice.

Release sequence:

1. [x] Publish JSON Schemas for documents and language-neutral results.
2. [x] Publish language-neutral valid, invalid, calculation-result, and
   snapshot-diff fixtures.
3. [x] Publish concise guidance for encoding an author-resolved model, including
   refusal to infer missing financial decisions.
4. Fix CLI acceptance scenarios for no-argument discovery, `guide`, `schema`,
   `example`, `validate`, and `create`, including standard input, output safety,
   structured errors, exit codes, and result encodings.
5. Provide `fs validate` with structured conformance and calculation results,
   including differences between stored and expected fact values. When its
   input contains a recorded snapshot, recompute and diff against it; otherwise
   report that no snapshot is recorded.
6. Provide read-only contract discovery through concise no-argument output,
   `fs guide authoring`, `fs schema`, and `fs example`.
7. Provide `fs create <candidate|-> --output <document>` as an atomic validated
   write. It accepts only complete candidates, never overwrites, writes only
   structurally conforming documents, and never changes financial meaning.
8. Ship an installable Agent Skill generated or checked from the maintained
   authoring guidance and non-interactive CLI examples.
9. Provide `fs record-validation <document|-> --output <new-document>` to
   write a new ordinary `fs` document containing the current snapshot at the
   exact path requested by the author. The command never modifies its input
   and fails if the output path already exists.
10. Provide `fs render` for a simple standalone HTML presentation.
11. Replace placeholder schema identifiers with immutable public versioned
    URLs and resolve whether V0 permits an optional top-level `$schema` pointer.

A compact result encoding such as TOON may be provided for agent-facing CLI
output after its specification version and acceptance fixtures are pinned. A
lossless JSON result form remains required, and FS artifacts, schemas, and
examples remain JSON.

## Future: Agent Evaluations (Undecided)

The project has not decided whether to build agent evaluations. V0 does not
depend on them.

If later adopted, evaluations must remain non-normative and separate from the
artifact examples and conformance fixtures. They may test whether an agent:

- encodes a fully specified, author-resolved financial model as FS JSON;
- identifies missing prerequisite decisions without supplying them; or
- repairs structural encoding errors from validator diagnostics when no
  financial judgment is required.

Evaluations must not define or score extraction, OCR, source mapping, taxonomy
alignment, aggregation policy, sign interpretation, or other accounting
judgment. Adding those concerns would expand the product boundary rather than
test the FS contract.

## Future: Multi-Entity Datasets

A later dataset layer may represent multiple reporting entities under shared,
user-supplied items, units, calculation rules, and presentation definitions.
This can support intentionally aligned and comparable company data.

`fs` will provide the representation mechanics but will not provide the shared
taxonomy or perform alignment. Dataset authors are responsible for defining
the common vocabulary and mapping each entity to it.

This future capability does not require multiple entities in a V0 document.
The single-entity document remains the atomic artifact. A dataset can later
reference or contain those artifacts and add shared definitions where useful.
The dataset design must be earned with real multi-entity examples before its
container, override, and validation semantics are specified.

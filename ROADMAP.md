# Roadmap

Status: V0 artifact contract in progress, 2026-07-16.

This file records confirmed design decisions and the unresolved work needed to
prove them. The [project proposal](docs/project-proposal.md) defines the product
boundary; this roadmap defines the current design and implementation sequence.

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
- Statements have no indentation or nesting semantics in V0. The examples must
  still determine whether a flat, label-only heading entry is necessary.
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

Current state: the normative [semantic specification](docs/semantic-spec.md),
canonical [examples](examples/), and draft 2020-12 [JSON Schemas](schema/) now
fix the artifact shape and resolve the decisions below. Language-neutral
[conformance fixtures](fixtures/) now distinguish schema failures from
semantic-invariant failures. Calculation-result and snapshot-diff fixtures
remain to complete this phase before CLI implementation.

Before fixing the JSON schema, build reviewed examples that exercise:

- multi-period income, balance-sheet, cash-flow, equity, and manufacturing
  statements;
- supplied subtotals that reconcile and fail to reconcile;
- the same fact presented in more than one statement;
- explicit cross-statement checks when two distinct facts are expected to
  agree;
- opening balance, movements, and closing balance across periods;
- a period series with no predecessor, consecutive periods, and an internal
  gap;
- overlapping annual, quarterly, and year-to-date periods for which automatic
  temporal binding is both unambiguous and ambiguous;
- exact decimals, scales, units, missing facts, zero, and unavailable values;
  and
- an equity statement whose presentation has a non-period axis.

Use the examples to decide:

- how the format version, reporting entity, reporting scope, and any optional
  document identity are represented;
- whether canonical JSON encodes individual facts or groups them into compact
  fact series by item and period;
- how instant and duration periods are identified;
- how named dimensions extend fact coordinates and statement presentation;
- how exact decimals, units, scales, missing facts, and unavailable facts map
  into JSON;
- whether a general classification mechanism is needed in V0 or should remain
  outside the core until real examples earn it;
- how calculation rules select facts at the same or different coordinates;
- the narrow temporal selectors needed for automatic consecutive-period rules
  without introducing a general temporal expression language;
- whether reusable calculation rules and explicit reconciliation assertions
  are distinct concepts;
- the minimum snapshot fields needed to identify rule applications and produce
  a deterministic diff without turning recorded results into current status;
  and
- the minimum flat presentation entries needed beyond item references, such as
  label-only headings and explicit period ordering.

## Reference Tooling

The [CLI design](docs/cli.md) fixes command scenarios and safety properties
upfront while leaving schema-dependent result fields to the evidence phase.
Implementation should proceed as a thin vertical slice rather than waiting for
the entire schema or building the complete CLI in the abstract.

After the relevant semantic model and JSON mapping are proven:

1. Publish a JSON Schema for structural validation.
2. Publish language-neutral valid and invalid fixtures.
3. Provide `fs validate` with structured conformance and calculation results,
   including differences between stored and expected fact values. When its
   input contains a recorded snapshot, recompute and diff against it; otherwise
   report that no snapshot is recorded.
4. Provide `fs record-validation <document> --output <new-document>` to write a
   new ordinary `fs` document containing the current snapshot at the exact path
   requested by the author. The command never modifies its input and fails if
   the output path already exists.
5. Provide `fs render` for a simple standalone HTML presentation.
6. Consider an optional Agent Skill that teaches agents to author the format
   and invokes the same validator.

A compact serialization such as TOON may be evaluated later as a lossless
mapping. JSON remains normative unless evidence shows that its repetition is a
material problem.

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

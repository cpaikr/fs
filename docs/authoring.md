# Authoring FS Documents

Status: current V0 authoring guidance; reference CLI commands are not yet
implemented.

This guide is the entry point for a person or agent turning already-acquired
financial data into an FS document. The
[semantic specification](semantic-spec.md) remains normative. The
[JSON Schema](../schema/fs-document.schema.json) checks the JSON shape but does
not enforce every reference, uniqueness, calendar, coordinate, or calculation
invariant.

FS is a file-first interchange format, not an extraction system, accounting
taxonomy, or mutable financial database. An author decides what the source
means; FS makes that decision explicit and consumable.

## Authoring Contract

An authoring task needs both:

1. source data, such as an extracted table, spreadsheet, filing, or manual
   transcription; and
2. an authoring policy for the financial decisions the format deliberately
   does not make.

Before authoring, establish:

- the reporting entity and exact reporting scope;
- the statements, periods, and detail to retain;
- units, scales, rounding, and sign interpretation;
- when source line items share one meaning and when they remain distinct;
- any non-period dimensions and their members;
- what blanks, dashes, zero, and unavailable values mean; and
- which supplied relationships should become calculation rules, including any
  tolerance.

When the author supplies no mapping policy, use conservative, source-faithful
defaults: preserve source meanings, labels, granularity, values, units, and
periods; do not aggregate, invent a taxonomy, infer arithmetic from layout, or
silently resolve an ambiguity. Record unresolved decisions outside the FS
document.

## Workflow

### 1. Fix the artifact boundary

Create one document for exactly one entity and reporting scope. Mixed entities
or scopes require separate V0 documents. Choose stable local identifiers, but
do not imply that they belong to a universal taxonomy.

### 2. Define the coordinate vocabulary

Define items, units, periods, and any dimensions before referencing them.
Items describe financial meanings rather than source rows or ledger accounts.
Periods describe instants or inclusive durations rather than display columns.
Units make the measure and base-ten display scale explicit.

### 3. Store facts independently

Store every supplied value as an individual fact at its complete item, period,
unit, and dimension coordinate. In particular:

- values are normalized exact decimal strings;
- zero is `"0"`;
- a missing fact is an absent coordinate;
- an explicitly unavailable fact uses `"unavailable": true`; and
- omitted dimensions and an empty dimensions object identify the same
  dimensionless coordinate and must not be duplicated.

Do not calculate a missing value into existence or alter a supplied value to
make a relationship pass.

### 4. Add presentations

Statements are ordered views over shared facts. They choose a unit, displayed
periods, optional dimension axes, and flat heading or item entries. They do not
own facts, define fact identity, imply indentation, or imply calculations. One
fact may appear in multiple statements.

### 5. Add only confirmed checks

Calculation rules are optional. Use same-period rules for reusable item
relationships, roll-forwards for unambiguous consecutive duration series, and
explicit assertions for exact reconciliations or irregular relationships.
Rules check stored values; they never supply them.

### 6. Validate and deliver

Full validation must check JSON shape plus all semantic invariants and must
report structural conformance, calculation consistency, and snapshot
comparison separately. The planned `fs validate <document|-> --format json`
command will be the reference operational conformance check once implemented;
the semantic specification remains normative.

Until then, the AJV commands in the [fixture guide](../fixtures/README.md)
provide shape validation only. Passing JSON Schema is not sufficient evidence
of FS conformance.

A reviewable authoring result should include:

1. the FS JSON document;
2. its complete structured validation result when the reference validator is
   available; and
3. a separate decision or source ledger recording provenance, interpretations,
   omissions, and unresolved questions.

The ledger is an authoring-workflow artifact, not part of the FS document or
its conformance contract. Source and provenance properties inside FS JSON are
nonconforming in V0.

## Schema and Version Discovery

Every V0 document declares `"formatVersion": "0.1"`. Do not add a top-level
`$schema` property: the current closed document schema does not permit it. Use
the bundled schema directly, and later use `fs schema document --version 0.1`
when the reference CLI is available.

Before public release, the project will replace the schema's placeholder `$id`
with an immutable versioned URL and decide whether to permit an optional
constant `$schema` pointer. Such a pointer would aid discovery only; full
semantic validation would still require the reference validator.

## Working With the Examples

Use [`minimal.json`](../examples/minimal.json) to learn the smallest complete
shape. It contains illustrative data and must not be treated as a partially
filled document.

Use [`manufacturing-group.json`](../examples/manufacturing-group.json) to look
up complex patterns such as shared facts, dimensions, assertions, and
roll-forwards. It deliberately contains an inconsistent calculation and is
evidence for validator behavior, not a general-purpose financial-statement
template.

FS does not provide balance-sheet, income-statement, or industry templates
because those would prescribe meanings and contents that remain
author-controlled.

## Reusable Agent Instruction

The following instruction can accompany the source data and authoring policy:

```text
Create one FS document with formatVersion "0.1" from the supplied financial
data. Use the FS semantic specification as the normative meaning, the document
JSON Schema for shape, and minimal.json only as a structural example.

Preserve source meanings, labels, granularity, signs, units, scales, and
periods unless the authoring policy explicitly changes them. Use stable
document-local identifiers. Store supplied values as independent facts and
statements as presentations over those facts. Distinguish zero, missing, and
explicitly unavailable values. Add only author-confirmed calculation rules.
Never invent values, alter a value to satisfy a check, infer calculations from
layout, or put provenance in the FS JSON.

If a financial interpretation is ambiguous, report it instead of guessing.
Run the full reference validator, repair structural errors using its stable
codes and JSON Pointer paths, and report calculation inconsistency separately.

Deliver the FS JSON, its structured validation result, and a separate ledger
of source references, decisions, omissions, and unresolved questions.
```

An installable Agent Skill should expose this workflow on demand and invoke the
same reference validator. It should route to focused references rather than
embedding the complete schema or fixture suite in agent context.

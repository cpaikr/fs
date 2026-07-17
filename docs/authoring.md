# Authoring FS Documents

This guide is the entry point for a person or agent encoding an already-resolved
financial-statement model as an FS document. The
[semantic specification](semantic-spec.md) remains normative. The
[JSON Schema](../schema/fs-document.schema.json) checks the JSON shape but does
not enforce every reference, uniqueness, calendar, coordinate, or calculation
invariant.

FS is a file-first interchange format, not an extraction system, accounting
taxonomy, conversion method, or mutable financial database. It starts after an
author has chosen the financial meanings and values to represent.

## Authoring Contract

Before encoding begins, the author must supply:

- the reporting entity and exact reporting scope;
- every item meaning and stable local identifier;
- units, scales, periods, and fact values;
- any non-period dimensions and their members;
- the intended distinction between zero, missing, and unavailable facts;
- statement composition and display order; and
- any calculation rules and tolerances the author wants checked.

These are prerequisites, not questions the format answers. A person or agent
must stop and request missing or contradictory inputs rather than infer a
meaning, choose a sign, aggregate items, map a taxonomy, or invent a value.

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
comparison separately. `fs validate <document|->` is the reference operational
conformance check; the semantic specification remains normative.

The AJV commands in the [fixture guide](../fixtures/README.md) remain useful
for shape validation only. Passing JSON Schema is not sufficient evidence of
FS conformance.

A reviewable authoring result should include:

1. the FS JSON document;
2. its complete structured validation result from the reference validator.

FS defines no source ledger, provenance sidecar, or conversion record. Other
systems may maintain their own records, but they are outside this project and
its conformance contract. Source and provenance properties inside FS JSON are
nonconforming in V0.

## Schema and Version Discovery

Every V0 document declares `"formatVersion": "0.1"`. Do not add a top-level
`$schema` property: the current closed document schema does not permit it. Use
`fs schema document` to read the exact bundled schema, or
`fs schema --output <new-path> document` to create an exact copy.

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

## Agent Use

Agents should follow this guide directly rather than copy a second maintained
prompt. They must stop when the prerequisite financial model is incomplete and
must not claim full semantic conformance until the reference validator has
run.

The CLI guide and future installable Agent Skill share one portable source
derived from this workflow. They must not add extraction or mapping
instructions and should route to focused references rather than embed the
complete schema or fixture suite in default context.

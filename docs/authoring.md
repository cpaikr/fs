# Authoring FS Documents

This guide is the entry point for a person or agent encoding an already
resolved financial-statement model as an FS document. The
[semantic specification](semantic-spec.md) is normative. The
[JSON Schema](../schema/fs-document.schema.json) checks the JSON shape but
cannot enforce every reference, uniqueness, calendar, nested-map, rollup, or
snapshot invariant.

FS is a file-first interchange format, not an extraction system, accounting
taxonomy, conversion method, or mutable financial database. It starts after an
author has chosen the financial meanings and values to represent.

## Authoring Contract

Before encoding begins, the author must supply:

- the reporting entity and exact reporting scope;
- every statement's item meanings, order, and stable local identifiers;
- units, scales, selected periods, and one cell state for every item-period;
- any custom grouping-column names and each item's assignments;
- the intended distinction between zero, missing, and unavailable values; and
- every confirmed additive parent-child relationship and applicable unit
  tolerance.

These are prerequisites, not questions the format answers. A person or agent
must stop and request missing or contradictory inputs rather than infer a
meaning, choose a sign, aggregate or split items, map a taxonomy, invent a
grouping, or create a value.

## Workflow

### 1. Fix the artifact boundary

Create one document for exactly one entity and reporting scope. Mixed entities
or scopes require separate documents. Choose stable local identifiers, but do
not imply that they belong to a universal taxonomy.

### 2. Define units, periods, and grouping columns

Define units and periods before statements reference them. Units make the
measure and base-ten scale explicit. Periods describe instants or inclusive
durations rather than merely naming display columns.

Declare each custom grouping purpose once in `groupingColumns`. A grouping
column is an opaque author-defined classification, not a hierarchy, category
registry, value coordinate, or calculation.

### 3. Author statement-owned item rows

Place ordered items directly inside each statement. An item identifier is
unique only within that statement. Give every item one unit and a `values` map
whose keys exactly match the statement's selected periods.

Encode cell states deliberately:

- normalized exact decimal strings store values;
- `"0"` is zero;
- JSON `null` is missing; and
- `{ "unavailable": true }` is explicitly unavailable.

Never omit a selected period key, calculate a missing value into existence, or
alter a supplied value to make a subtotal pass.

Give every item a `groupings` map whose keys exactly match
`groupingColumns`. Use a nonempty string for an assignment and JSON `null` for
no assignment. When the document declares no grouping columns, every item's
map is `{}`.

### 4. Add only confirmed rollups

Set `rollupTo` on a child only when the author confirms that its stored value
adds with coefficient one and its stored sign to a parent in the same
statement. Child and parent must use the same unit. Relationships must be
acyclic.

The parent's reported cells remain explicit. Rollup validation compares each
parent with its direct children for every statement period; it does not derive
the parent. Nested subtotals are valid because each level evaluates only its
direct children. Custom grouping values never imply rollups.

### 5. Validate and deliver

Full validation checks JSON shape plus all semantic invariants and reports
structural conformance, rollup consistency, and snapshot comparison
separately. `fs validate <document|->` is the reference operational check.
Passing JSON Schema alone is never full conformance evidence.

A reviewable authoring result should include:

1. the FS JSON document;
2. its complete structured validation result from the reference validator.

FS defines no source ledger, provenance sidecar, or conversion record. Other
systems may maintain their own records, but source and provenance properties
inside FS JSON are nonconforming.

## Schema and Version Discovery

Every V0 document declares `"formatVersion": "0.1"`. Do not add a top-level
`$schema` property: the current closed document schema does not permit it. Use
`fs schema document` to read the exact bundled schema, or
`fs schema --output <new-path> document` to create an exact copy.

Replacing placeholder schema identifiers and deciding whether to allow an
optional constant `$schema` pointer remain Roadmap step 11. Such a pointer
would aid discovery only; full semantic validation would still require the
reference validator.

## Working With the Examples

[`minimal.json`](../examples/minimal.json) is the smallest complete
statement-item-row shape. [`manufacturing-group.json`](../examples/manufacturing-group.json)
is a multi-statement example covering mixed units, grouping columns, nested
reported subtotals, and an intentionally inconsistent rollup.

FS does not provide statement-type or industry templates because their
meanings and contents remain author-controlled.

## Agent Use

Agents should follow this guide directly rather than copy a second maintained
prompt. They must stop when the prerequisite financial model is incomplete and
must not claim full semantic conformance until the reference validator has
run.

The CLI guide and repository-distributed Agent Skill share one portable source
derived from this workflow. They must not add extraction or mapping
instructions and should route to focused references rather than embed the
complete schema or fixture suite in default context.

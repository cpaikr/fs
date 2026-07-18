# Authoring Policy

This guide owns the decision boundary and durable policy for authoring an FS
document. The [portable workflow](../content/guide/authoring.md.template) owns
the exact create-and-repair procedure used by the bundled guide and Agent
Skill. The [semantic specification](semantic-spec.md) remains normative for
artifact meaning.

FS is a file-first interchange format, not an extraction system, accounting
taxonomy, conversion method, or mutable financial database. Authoring starts
only after the financial model is resolved.

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

## Create and Repair Policy

For a new document, encode the complete author-resolved model. For a repair,
preserve the supplied candidate unchanged through its first reference validator
run and treat its author-resolved financial choices as invariants. Correct only
syntax, shape, and reference encoding that preserves those choices. When a
diagnostic exposes a missing or contradictory financial decision, request that
decision before continuing. Structural corrections must never change a
financial choice merely to satisfy validation or a rollup.

## Operational Workflow

Follow the [portable workflow](../content/guide/authoring.md.template) for the
complete contract-discovery, preparation, validation, repair, creation, and
delivery sequence. It is the single maintained operational source; generated
copies must not be edited independently.

JSON Schema checks shape but not every reference, uniqueness, calendar,
nested-map, rollup, or snapshot invariant. Completion therefore requires the
reference validator and safe creation boundary defined by the portable
workflow, not schema validation alone.

A reviewable authoring result should include:

1. the FS JSON document;
2. its complete structured validation result from the reference validator.

FS defines no source ledger, provenance sidecar, or conversion record. Other
systems may maintain their own records, but source and provenance properties
inside FS JSON are nonconforming.

## Working With the Examples

[`minimal.json`](../examples/minimal.json) is the smallest complete
statement-item-row shape. [`manufacturing-group.json`](../examples/manufacturing-group.json)
is a multi-statement example covering mixed units, grouping columns, nested
reported subtotals, and an intentionally inconsistent rollup.

FS does not provide statement-type or industry templates because their
meanings and contents remain author-controlled.

## Agent Use

Agents should use the generated CLI guide or repository-distributed Agent Skill
for the self-contained operational workflow. Both are generated from the
portable source. They must stop when the prerequisite financial model is
incomplete and must not add extraction or mapping behavior outside this policy.

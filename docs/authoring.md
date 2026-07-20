# Authoring Policy

This guide owns the decision boundary and durable policy for authoring an FS
document. The [portable workflow](../content/guide/authoring.md.template) owns
the exact create-and-repair procedure used by the bundled guide and Agent
Skill. The [semantic specification](semantic-spec.md) remains normative for
artifact meaning.

FS is a file-first interchange format, not an extraction system, accounting
taxonomy, conversion method, or mutable financial database. Authoring starts
only after the financial model is resolved.

The **authoring actor** is the person or delegated agent responsible for
resolving that model. The repository-distributed Agent Skill may help an actor
resolve imperfect source material into the prerequisite model. This assistance
remains upstream of encoding: report material assumptions and unresolved
limitations to the user, keep provenance outside FS JSON, and begin encoding
only after the required financial choices are internally consistent.

## Authoring Contract

Before encoding begins, the authoring actor must resolve:

- the reporting entity and exact reporting scope;
- every statement's item meanings, order, and stable local identifiers;
- units, scales, selected periods, and one cell state for every item-period;
- any custom grouping-column names and each item's assignments;
- the intended distinction between zero, missing, and unavailable values; and
- every confirmed additive parent-child relationship and applicable unit
  tolerance.

These are prerequisites, not questions the format answers. When a user
delegates source resolution, an agent may recover evidence-supported choices
from the supplied material and use professional judgment among reasonable
interpretations. It asks the user only when the evidence cannot support a
defensible choice and the alternatives would materially change the financial
meaning. It must disclose material assumptions and must not invent a value or
source detail, impose an external taxonomy or cross-entity alignment, or change
a reported value to manufacture consistency.

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

The generated CLI guide begins with an already-resolved financial model. The
repository-distributed Agent Skill adds an upstream source-material branch for
delegated resolution, followed by the same create-and-repair workflow. The
portable source owns that shared encoding workflow; the Skill-only source-input
guide owns source exploration and its source-fidelity gate.

An agent resolving source material follows the evidence and escalation boundary
in the authoring contract above. An agent repairing existing FS JSON treats the
candidate's financial choices as authoritative and never reinterprets them as
part of structural repair.

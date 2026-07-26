# Authoring Policy

This guide owns the decision boundary and durable policy for authoring an FS
document. The [portable workflow](../content/guide/authoring.md.template) owns
the exact create-and-repair procedure used by the bundled guide and Agent
Skill. The [completed refactor plan](plans/remove-user-defined-groupings.md)
records the `0.2` implementation and release-preparation evidence. The
[semantic specification](semantic-spec.md) remains normative for artifact
meaning.

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

## Classification Boundary

FS contains no user-defined classification or mapping fields. When a source
category is necessary to distinguish the financial meaning of a value, the
author encodes that meaning in the item's stable identifier and human-readable
label or description. A category that separates values requires distinct item
rows. A category that defines an additive subtotal requires an explicit parent
item and confirmed `rollupTo` relationships.

All other source or project classification, filtering, mapping, and styling
data remains outside the FS document. A project may associate its own mapping
table with statement and item identifiers, but FS does not define that table,
its lifecycle, or a linking convention.

For example, if a source reports `Domestic revenue` and
`International revenue` as separate amounts, encode them as separate items. If
the source also reports `Total revenue` and the relationship is confirmed
additive, the two items may `rollupTo` that explicit total item. A project-only
tag such as `operating` or a dashboard color belongs in the consuming
project's mapping data, not in either item.

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
value-map, rollup, or snapshot invariant. Completion therefore requires the
reference validator and safe creation boundary defined by the portable
workflow, not schema validation alone.

A reviewable authoring result should include:

1. the FS JSON document;
2. its complete structured validation result from the reference validator.

FS defines no source ledger, provenance sidecar, classification sidecar, or
conversion record. Other systems may maintain their own records, but extra
properties added to FS JSON for source, provenance, or external classification
are nonconforming.

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

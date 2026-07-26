# Remove User-Defined Groupings

Status: Accepted for `0.2`; implementation pending.

FS `0.1` allowed optional document-local grouping columns and required every
item to carry a matching grouping map. These opaque annotations could travel
with a document and render as flat columns, but they had no shared financial
meaning. They allowed project-specific classification choices to change the
base artifact even when its items, values, units, periods, order, and rollups
were otherwise identical.

## Decision

FS `0.2` removes top-level `groupingColumns` and item `groupings`. The format
defines no replacement classification fields, fixed vocabulary, mapping table,
sidecar, or linking convention. Projects keep classification, filtering,
mapping, and styling data in their own code and data stores.

A category that is necessary to distinguish an item's financial meaning is
encoded in that item's identifier or human-readable label or description. If
the category separates values, the author supplies distinct item rows. If it
defines an additive subtotal, the author supplies the subtotal item and
explicit `rollupTo` relationships. Other source or user-defined categories are
outside FS.

This is a clean contract break. Documents, validation results, snapshot diffs,
schema identifiers, and reference tools move together to
`formatVersion: "0.2"`. The `0.2` reference implementation rejects `0.1`; it
provides no compatibility reader, migration command, normalizer, alias, or
parallel model.

## Rationale

FS owns a portable financial-statement artifact, not every useful view of its
rows. Because grouping names and values were document-local and deliberately
opaque, generic consumers could preserve and display them but could not
interpret them. External mappings support multiple independent views without
duplicating or changing the financial statement and can evolve under the
owning project's rules.

The smaller closed grammar also removes required empty `groupings` objects,
map-key equality rules, grouping-specific diagnostics, and dependent rendering
behavior. The deliberate cost is that nonessential classifications no longer
travel inside a self-contained FS document.

## Supersession

This decision supersedes the grouping-column and grouping-map portions of
[ADR 0001](0001-replace-dimensional-members-with-item-grouping.md). Its
statement-owned item rows, value maps, units, order, and additive rollup model
remain accepted. The finite rendering policy in
[ADR 0002](0002-bound-render-output.md) remains independent.

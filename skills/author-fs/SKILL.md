---
name: author-fs
description: >-
  Encode and validate complete FS financial-statement documents from
  author-resolved models. Use when an agent must create or repair an FS JSON
  document without inferring missing financial meanings, values, taxonomy,
  rollups, groupings, or source mappings.
---

# Authoring FS Documents

This Skill is based on `@cpai/fs` version `0.1.0`.

Use this workflow only after the financial model is resolved. FS encodes one
entity and reporting scope; it does not extract source material, choose
financial meanings, map a taxonomy, convert units, or invent values.

## Prerequisites

Before encoding, obtain all of these from the author:

- the reporting entity and exact reporting scope;
- every statement's item meanings, order, and stable local identifiers;
- units, scales, selected periods, and one cell state for every item-period;
- any grouping-column names and each item's assignments;
- the intended distinction between zero, missing, and unavailable values; and
- every confirmed additive parent-child relationship and unit tolerance.

Stop and request missing or contradictory inputs. Do not infer a meaning,
choose a sign, aggregate items, map a taxonomy, or invent a value.

## Workflow

1. Create one document for exactly one entity and reporting scope.
2. Define units and periods before statements reference them. Declare any
   custom grouping purposes once in `groupingColumns`; they are flat metadata,
   not hierarchies or value coordinates.
3. Place ordered items directly in each statement. Give every item one unit, a
   `values` map whose keys exactly match the statement periods, and a
   `groupings` map whose keys exactly match `groupingColumns`.
4. Encode each cell deliberately: use normalized exact decimal strings for
   values, `"0"` for zero, JSON `null` for missing, and
   `{ "unavailable": true }` only for explicit unavailability. Never omit a
   selected period key.
5. Set `rollupTo` on a child only for a confirmed additive relationship to a
   same-unit parent in the same statement. Parent values remain explicit;
   validation checks direct children and never materializes a subtotal.
6. Validate the complete candidate before creating a document.

## Contract Discovery

```sh
npx -y @cpai/fs@0.1.0 schema document
npx -y @cpai/fs@0.1.0 example
npx -y @cpai/fs@0.1.0 example minimal
```

The [FS V0 semantic specification](https://github.com/cpaikr/fs/blob/main/docs/semantic-spec.md)
defines meaning beyond JSON shape. Passing the schema alone is not full
conformance evidence.

## Validate and Create

```sh
npx -y @cpai/fs@0.1.0 validate candidate.json
npx -y @cpai/fs@0.1.0 create --output statement.fs.json candidate.json
```

If validation reports structural nonconformance, use each diagnostic's stable
code and JSON Pointer path to correct the encoding, then validate the complete
candidate again. Do not invent a missing financial decision during repair.
Run `create` only after validation reports structural conformance.

Structural conformance, rollup calculation consistency, and snapshot
comparison are separate results. A rollup inconsistency may still be a
successful usable validation result and does not prevent `create`; structural
nonconformance does. `create` copies the candidate's exact bytes atomically and
never overwrites an existing path or creates a missing parent directory.

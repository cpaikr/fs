---
name: author-fs
description: "Organize financial statements into conforming FS documents. Use when source statements in spreadsheets, PDFs, images, webpages, or other imperfect inputs must be explored and resolved before encoding, when an already-resolved financial model must be encoded, or when an existing FS JSON document needs structural repair."
---

# Authoring FS Documents

This Skill uses `@sjunepark/fs@0.2.0`.
Its pinned commands are the package-availability check: continue only when
they resolve from npm. Report a block instead of substituting an unpinned
tag or another version.

Encode only an author-resolved financial model. One FS document covers one
entity and reporting scope.

## Choose the Authoring Branch

Choose one branch before resolving the encoding inputs:

- **Source material:** Use this branch when the user supplies financial
  statements or asks to organize, structure, or convert statements without
  an already-resolved model. Inventory the source artifacts available in the
  task, then read the [source-input guide](guides/resolving-inputs.md). If no
  source material is accessible, request it. Use the guide to resolve the
  prerequisite model, continue through create preparation, and complete its
  source-fidelity gate before reference validation.
- **Resolved model:** When all prerequisite financial choices are already
  supplied, continue with the create branch.
- **Existing FS JSON:** Continue with the repair branch. Preserve its
  financial choices and validate the unchanged candidate first.

## Resolve Inputs

For a new document, confirm all of these inputs before encoding:

- entity `name` and optional `id`, scope `label` and optional `id`, and any
  optional `documentId`;
- units with `id`, `label`, `measure`, `scale`, and optional canonical,
  nonnegative `defaultTolerance`; omission means exact zero, and the parent
  item's unit controls each rollup tolerance;
- periods with `id`, `kind`, and either `date` for an instant or inclusive
  `start` and `end` for a duration;
- statements with `id`, `label`, ordered period identifiers, and ordered
  items; each item has `id`, `label`, `unit`, and `values`, plus any optional
  `description` or `rollupTo`;
- one deliberate value state for every item-period: an exact decimal, zero,
  missing, or unavailable; and
- confirmed rollups whose child and parent are in the same statement, use the
  same unit, add with coefficient one and stored signs unchanged, and form an
  acyclic graph.

For a repair, treat the candidate's financial meanings, values, units,
periods, item meanings, and rollups as authoritative. Repair syntax, shape, and
reference encoding. Ask for author input only when a diagnostic exposes a
missing or contradictory financial decision.

Proceed when every required choice is present and internally consistent.
Otherwise request the exact unresolved input.

## Workflow

### 1. Load the Exact Contract

```sh
npx -y @sjunepark/fs@0.2.0 schema document
npx -y @sjunepark/fs@0.2.0 example
npx -y @sjunepark/fs@0.2.0 example minimal
```

Continue only when all three commands succeed and their artifacts are
available. The [FS 0.2 semantic specification](https://cpaikr.github.io/fs/spec/0.2/)
defines meaning beyond JSON shape. Consult it when an invariant or repair is
uncertain.

Contract discovery is complete when the schema, example catalog, and minimal
example are available from the exact command version.

### 2. Prepare the Candidate

Choose one branch:

- **Create:** encode the complete author-resolved model with the rules below.
- **Repair:** preserve the supplied candidate unchanged through its first
  validation in Step 3. Use the rules below as repair constraints after the
  validator establishes the baseline diagnostics.

For either branch, apply these encoding constraints:

- Set `"formatVersion": "0.2"`. The only allowed optional discovery pointer
  is `"$schema": "https://cpaikr.github.io/fs/schema/0.2/fs-document.schema.json"`.
- Define entity, scope, units, and periods before statements reference them.
  Keep objects closed and every identifier and reference exact. Keep
  project-specific classification and mapping data outside FS.
- Give each statement an ordered, nonempty period list and ordered, nonempty
  item list. Each item's `values` keys exactly match its statement periods.
- Encode values as canonical decimal strings: no exponent or leading `+`, no
  unnecessary leading integer zeros or trailing fractional zeros, and no
  negative zero. Use `"0"` for zero, JSON `null` for missing, and
  `{ "unavailable": true }` for explicit unavailability.
- Set `rollupTo` only on a confirmed child. Every relationship is
  same-statement, same-unit, coefficient-one, stored-sign, and acyclic. The
  parent remains explicit; validation compares direct children and never
  derives a subtotal.

Create preparation is complete when every required member, selected-period
cell, identifier, reference, and confirmed rollup is
present without inventing a financial choice. Repair preparation is complete
when the original candidate is staged unchanged and its author-resolved
financial choices are fixed as invariants.

### 3. Validate and Repair to Conformance

```sh
npx -y @sjunepark/fs@0.2.0 validate candidate.json
```

For a repair, run this command on the unchanged candidate first. When
it returns `error.code: "invalid-json"`, repair syntax, trailing content, or
duplicate members only when one correction preserves the supplied financial
choice; otherwise request that choice. Re-run until the command returns a
structured validation result. When
`validation.conformance.status` is `"nonconforming"`, repair each
structural diagnostic by its stable `code` and JSON Pointer `path`, then
validate the complete candidate again. Change only encoding. If repair needs a
financial decision, stop and request that decision. Repeat until
`validation.conformance.status` is `"conforming"`.

Structural conformance, `calculations`, and `snapshotDiff` are separate
results. A conforming document may have inconsistent rollups; preserve the
reported values and do not force calculation consistency.

Validation is complete only with a conforming status and the unabridged
structured output retained.

### 4. Create, Optionally Render, and Deliver

```sh
npx -y @sjunepark/fs@0.2.0 create --output statement.fs.json candidate.json
```

Use a new output path whose parent directory already exists. `create` copies
the candidate's exact bytes atomically and never overwrites a path.

Finish document creation only when `output.status` is `"created"`.

When the user requests an HTML view, render the created document:

```sh
npx -y @sjunepark/fs@0.2.0 render --output statement.html statement.fs.json
```

Use another new output path whose parent directory already exists. `render`
validates the input again and atomically creates a deterministic standalone
HTML document with embedded CSS, renderer-owned fixed inline behavior, and no
external resources. Treat the HTML as a derived presentation, not a
replacement for the FS JSON: it provides statement review, presentation-only
rollup hierarchy and fresh rollup-check summaries, and per-statement
copy-for-Excel controls. Rendering calculates rollup checks but does not derive,
rescale, round, aggregate, or change the displayed statement values. Embedded
validation snapshots are not displayed. Finish rendering only when its
`output.status` is `"created"`.

Deliver the created FS JSON and the complete structured validation output,
including `validation` and `snapshotDiff`, which remain in the JSON command
output. When requested and successfully created, deliver the HTML alongside
them.

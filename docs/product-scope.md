# Product Scope

`fs` is a working title. The [roadmap](../ROADMAP.md) records strategic
delivery milestones.

This document describes the current V0 statement-item-row contract.

## Summary

Create a public, lightweight convention for representing clean financial
statements as structured, reviewable, and optionally validatable data.

An author or agent may obtain the values from a PDF, spreadsheet, website,
image, manual entry, or any combination of sources. `fs` defines the artifact
produced after that work; it does not define how the values were acquired.

## Problem

Financial-statement extraction usually produces an ad hoc table, CSV, or JSON
shape. Those outputs preserve cells but often lose financial meaning:

- periods, dates, units, and scales are implicit;
- missing, unavailable, and zero values are conflated;
- reported additive subtotals cannot be checked consistently;
- statement layout is mistaken for item identity; and
- every downstream consumer needs custom parsing instructions.

The result should instead be one predictable document whose ordered item rows,
period values, units, groupings, and reported subtotals are explicit.

## Product

V0 is a standalone financial-statement document and its validation semantics.
Its central boundaries are:

- JSON is the canonical serialization.
- One document covers exactly one reporting entity and reporting scope.
- One document may contain multiple statements and multiple periods.
- Statements own ordered, document-local items and their period-keyed values.
- Each item owns one unit, and its `groupings` map contains exactly the
  declared grouping columns; the project supplies no accounting taxonomy.
- FS may group an item but does not split, allocate, or infer finer detail.
- All values, including reported subtotal values, are stored explicitly.
  Optional `rollupTo` relationships validate direct additive children but
  never create, replace, or materialize values.
- Rollup inconsistency is reportable without making structurally usable data
  nonconforming.
- Source and provenance metadata are entirely outside the specification.
- A validation snapshot may be embedded for later comparison without creating
  a special document type or filename convention.

Authoring guidance and reference tools teach, discover, validate, and safely
write this same contract. They begin from author-resolved financial meanings
and values; they do not define a conversion method or introduce semantics
absent from the artifact specification.

The [domain glossary](glossary.md) defines these terms precisely.

## Non-Goals

V0 will not:

- extract, OCR, or align source material;
- define financial-statement types or prescribe their contents;
- define a universal item taxonomy or align different companies;
- decide when an author should retain detail or aggregate items;
- split an item, allocate its value, or infer source detail not supplied by the
  author;
- model journal entries, ledgers, forecasts, or valuation policy;
- model general formulas, roll-forwards, reusable mapping profiles, or
  genuinely multidimensional statements;
- infer arithmetic from statement order or presentation;
- act as a mutable financial database or field-by-field statement editor; or
- execute arbitrary code embedded in a document.

Authors remain responsible for choosing item meanings, statement composition,
grouping columns, rollup relationships, and the level of detail appropriate
for their use.

## Deliverables

The V0 product consists of:

1. A semantic specification and canonical JSON mapping.
2. A JSON Schema and language-neutral conformance fixtures.
3. Representative balance-sheet, income-statement, cash-flow, equity, and
   manufacturing-statement examples using statement-owned item rows.
4. A reference CLI for contract discovery, validation, safe creation,
   recording validation snapshots, and simple HTML rendering.
5. Authoring guidance and an installable Agent Skill that invoke the same
   reference validator.

## Design Method

The format is intentionally optimized for ordinary financial statements
rather than a general multidimensional data cube. The examples must prove
multi-period item values,
mixed item units, user-declared grouping columns, additive reported subtotals,
overlapping period types, unavailable values, and calculation inconsistencies.
Genuinely multidimensional cases are outside V0 rather than generated through
Cartesian axes.

Core validation and snapshot command scenarios are designed before their
schemas to expose required behavior. Examples and language-neutral fixtures fix
artifact-dependent result fields and identities for the normative contract they
accompany. Document-encoding and contract-discovery commands project that model
without adding new semantics. See the [CLI design](cli/design.md).

## Success Criteria

V0 succeeds when:

- independent authors can produce structurally compatible documents without
  sharing an accounting taxonomy;
- downstream code can identify statement items, period values, units, and
  groupings without interpreting rendered HTML;
- supplied additive subtotals can be checked without replacing their stored
  values;
- inconsistent calculations remain visible and consumable;
- documents with no rollup relationships remain valid and straightforward to
  use;
- documents and validation results are deterministic to inspect and diff;
- given author-resolved statements and values, a person or agent can discover
  the contract, encode a complete candidate, and act on validation diagnostics
  without reading the whole repository; and
- new user-defined items or statement layouts do not require a core release.

## Future Direction

A later dataset layer may represent several entities under shared definitions
chosen by its author. It may enable intentionally aligned company data, but
`fs` will represent that alignment rather than supply its taxonomy or perform
the alignment. The single-entity document remains the V0 atomic artifact.

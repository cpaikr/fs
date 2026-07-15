# Project Proposal

Status: initial discussion draft, 2026-07-16. `fs` is a working title.

## Summary

Create an independent, lightweight convention for organizing financial
statements from heterogeneous sources into agent-readable, reviewable, and
validatable data.

An agent may extract the data from any source using any method: Excel, a filing,
a website, a PDF, an image, a copied table, or manually written code. `fs` begins
after that source-specific work. It defines the artifact the agent should
produce, not how the agent obtains the data.

The project should combine two useful ideas without copying either system:

- From XBRL's Open Information Model: facts have explicit identity and
  coordinate semantics such as entity, period, unit, and dimensions,
  independently of serialization.
- From TOON: the common text representation should be compact, deterministic,
  line-oriented, and especially efficient for repeated tabular facts.

`fs` should not require a universal accounting taxonomy. Users freely define
financial items, calculations, classifications, groups, and statement views.
The strict part is the mechanics that make those definitions unambiguous.

## Problem

Financial-statement organization is repeatedly rebuilt for each task. Source
material arrives in incompatible forms, and agents return equally incompatible
spreadsheets, tables, JSON objects, or prose. Common failures include:

- ambiguous periods, currencies, scales, and consolidation scope;
- source labels being overwritten by an analyst's normalized names;
- zero, blank, unavailable, and missing values being conflated;
- subtotals disagreeing with their components without a visible check;
- presentation hierarchy silently being treated as calculation logic;
- one classification overwriting another, such as replacing a K-IFRS mapping
  with a valuation grouping; and
- values losing their source locations during transcription or regrouping.

A shared convention would let agents organize statements consistently even when
the extraction process and downstream use are unrelated.

## Product Thesis

The product is a **declarative financial-statement artifact and its validation
rules**. It is not an extraction product, accounting taxonomy, or financial
modeling runtime.

The artifact should be useful in three ways:

1. A person or agent can read and edit it directly.
2. A validator can detect structural, arithmetic, and classification errors.
3. Downstream code can convert it into its own model-specific representation.

The semantic model should be specified before a custom syntax. A reference JSON
mapping can prove the model first. A compact text serialization should be added
only after several real statements show which repetition and nesting patterns
deserve syntax.

## Relationship to Creo DCF

`fs` and Creo DCF should remain independent.

```text
arbitrary source material
        |
        v
source-specific agent or preparation code
        |
        v
fs artifact: reported facts, relationships, classifications, provenance
        |
        +---------------------> other accounting and analysis tasks
        |
        v
optional Creo DCF project adapter
        |
        v
DCF fields and project-owned forecast logic
```

Creo DCF should follow Creo Valuation's separation:

- the platform owns only durable field, dependency, validation, and inspection
  mechanics;
- actual DCF construction and financial policy live in executable example
  projects; and
- a project may consume `fs`, custom TypeScript, CSV, literals, or any other
  author-chosen input form.

`fs` therefore must not become a required Creo DCF input or cause statement,
forecast, or valuation vocabulary to enter the DCF kernel.

## Design Principles

### Strict mechanics, open vocabulary

Stable identifiers, fact coordinates, period semantics, units, missingness,
references, and validation behavior are strict. Account names, calculation
names, classification schemes, group members, and statement layouts are open.

### Identity is not a label

Every durable definition has a stable identifier separate from its display and
source labels. Facts are addressed by their report and complete coordinate;
source-specific fact identifiers may also be retained for provenance. This
permits repeated labels, multilingual labels, spelling changes, and multiple
external taxonomy references without changing identity.

### Reported and derived values never become interchangeable

A value supplied from a source remains a provided fact. A value calculated by
`fs` remains a derived fact. A calculation may validate a provided subtotal, but
the provided value must not be silently replaced by the calculated result.

### Presentation, classification, and calculation are separate relationships

A row may appear under a presentation parent, belong to several classification
schemes, and participate in a calculation. None of those relationships implies
the others.

### Source acquisition stays outside the artifact

OCR, workbook parsing, web retrieval, and image interpretation are preparation
steps. They may be distributed as adapters and examples, but they do not expand
the core grammar.

### Examples carry policy

K-GAAP and K-IFRS mappings, valuation classifications, industry-specific
statements, and extraction practices belong in optional profiles and executable
examples. The core should not pick one as canonical.

## Proposed Domain Language

- **Report** — one identified collection of financial facts and their supporting
  definitions, sources, and relationships.
- **Item** — a user-defined financial meaning identified independently of its
  labels. An item may represent a detailed account, a reported line item, a
  subtotal, a ratio, or another calculated measure.
- **Fact** — a provided or derived value for an item at a complete coordinate.
- **Coordinate** — the entity, period, unit, and optional named dimensions that
  identify a fact.
- **Calculation** — a declarative relationship defining an expected or derived
  value from other items.
- **Classification scheme** — one named purpose for organizing items, such as
  K-GAAP, K-IFRS, valuation role, or internal management reporting.
- **Group** — a member of a classification scheme. Groups may form an explicit
  hierarchy.
- **Membership** — an item's assignment to a group under one classification
  scheme.
- **Statement view** — an ordered presentation of items and section headings.
- **Source reference** — an identified reference to source material and,
  optionally, its content hash, capture date, and a precise location such as a
  sheet and cell, page and region, URL, or table row.

`Item` is preferable to `Account` as the universal primitive because gross
profit, gross margin, and statement subtotals are not ledger accounts. A source
account can still be represented as an item with its source label and external
references.

## Minimal Semantic Kernel

### Report context

A report declares:

- report and schema version identifiers;
- entity and optional consolidation/reporting scope;
- default currency and optional numeric scale for facts in that currency;
- fiscal-calendar or period definitions; and
- source references.

Defaults reduce repetition but are expanded into complete fact coordinates by a
conforming processor.

A numeric scale is a semantic multiplier, not a display hint. A value of
`1000` with unit `KRW` and scale `million` represents exactly KRW
1,000,000,000. A report-level scale is inherited only by monetary facts in the
default currency. Other numeric facts declare their own scale or use `1`;
calculations normalize compatible quantities before arithmetic.

### Items

An item requires only a stable identifier. Optional properties include:

- display and source labels, including language and label role;
- expected period nature: instant or duration;
- expected unit;
- description;
- external references such as K-GAAP, K-IFRS, DART, or project taxonomy IDs.

The core does not reserve financial item identifiers such as `revenue` or
`tradeReceivables`.

### Facts

A fact contains:

- item identifier;
- exact instant or duration period;
- exact decimal or explicit unavailable value;
- structured unit and numeric scale when not inherited from report context;
- entity and optional named dimensions when not inherited from report context;
- origin: provided or derived; and
- provenance.

Missing means that no fact exists. It must remain distinct from zero and an
explicitly unavailable fact. No two facts can occupy the same coordinate within
one Report; corroborating source references attach to the same fact instead.
V0 represents each revision or restatement as a separate Report, optionally
linked to its predecessor through provenance.

### Calculations

Users define calculations over item references. The initial expression language
should remain deliberately narrow: constants, item references, `+`, `-`, `*`,
`/`, and explicit sums. It should provide unit checking, coordinate alignment,
cycle detection, and declared tolerances, but no arbitrary code execution.

V0 pairs operands only when entity, period, and all named dimensions match
exactly. Compatible units are normalized before arithmetic. There is no
implicit broadcasting, grouping, period rollup, or aggregation other than an
explicit sum. At most one materializing calculation may define a target item
for a matching coordinate.

For each applicable coordinate:

1. If the target fact is absent and every required input has a compatible,
   calculable value, a conforming materializer creates a derived fact.
2. If a provided target fact exists, the calculation produces an expected value
   in a separate validation result and checks the provided value within its
   tolerance. It does not create a second fact at the same coordinate.
3. If required inputs are missing, explicitly unavailable, or incompatible,
   validation reports the exact unresolved dependency instead of inventing
   zero.
4. A materializer never overwrites a provided fact.

Materialization is an explicit, deterministic operation that emits a
materialized representation while preserving the original provided facts and
their provenance.

For terminology, `revenue - COGS` is **gross profit**. Gross margin is normally
`gross profit / revenue`; both should be expressible as user-defined items.

### Classifications

Each classification scheme declares:

- a stable identifier and purpose;
- optional authority, version, and external reference;
- groups and optional parent relationships; and
- memberships from items to one or more groups.

V0 permits any number of memberships. Exclusivity, completeness, and other
policy constraints belong in optional profiles or project checks, not in the
semantic kernel.

An external reference asserts identity or equivalence with an identifier in
another system. Classification membership expresses grouping. For example, a
direct K-IFRS concept match may be an item's external reference, while grouping
several source items under a K-IFRS concept uses a classification group whose
own external reference names that concept.

One item can simultaneously participate in independent schemes such as:

- K-GAAP mapping;
- K-IFRS mapping;
- statement line, subgroup, and major group;
- current/noncurrent presentation;
- NWC, non-operating asset, debt, tax, or other valuation grouping; and
- a project-specific forecast-treatment grouping.

Group hierarchy does not imply summation. A subtotal requires a separate
calculation relationship.

### Statement views

A statement view defines ordered rows, headings, indentation, and visible items.
It does not own facts and does not perform arithmetic. The same item may appear
in several views without copying its facts.

## Illustrative Text Shape

The following is non-normative. It illustrates the desired reading experience,
not a committed grammar:

```text
fs: 0.1
report: acme-2025
entity: acme-consolidated
currency: KRW
scale: million

sources:
  audit-fs: ./sources/acme-audit-2025.xlsx

periods:
  fy2024: 2024-01-01/2024-12-31
  fy2025: 2025-01-01/2025-12-31

items[4]{id,label,nature,unit}:
  revenue,Revenue,duration,KRW
  cogs,Cost of goods sold,duration,KRW
  gross-profit,Gross profit,duration,KRW
  gross-margin,Gross margin,duration,pure

facts[6]{item,period,value,source}:
  revenue,fy2024,1000,audit-fs
  cogs,fy2024,700,audit-fs
  gross-profit,fy2024,300,audit-fs
  revenue,fy2025,1200,audit-fs
  cogs,fy2025,780,audit-fs
  gross-profit,fy2025,420,audit-fs

calculations:
  gross-profit: revenue - cogs
  gross-margin: gross-profit / revenue

classifications:
  valuation-role:
    groups: [operating-revenue, operating-expense]
    memberships:
      cogs: operating-expense
      revenue: operating-revenue

statements:
  income-statement: [revenue, cogs, gross-profit, gross-margin]
```

Here, the supplied gross-profit facts remain source facts and are validated
against the calculation. Gross-margin facts can be derived because they were not
provided.

## Validation and Conformance

A conforming validator should report structured errors and warnings for:

- invalid or duplicate identifiers;
- unresolved item, group, period, unit, or source references;
- duplicate fact coordinates;
- invalid instant/duration or unit usage;
- calculation cycles, incomplete inputs, and unit mismatches;
- provided-versus-expected calculation differences;
- classification and presentation hierarchy cycles; and
- derived facts without complete calculation lineage.

The specification should publish language-neutral fixtures covering valid
documents, encoding/decoding, validation failures, round trips, calculations,
and classification edge cases. A reference implementation should expose at
least:

```text
fs validate <document>
fs materialize <document>
```

If a non-JSON serialization is adopted, it should also expose deterministic
formatting and conversion to the reference JSON mapping. Exact command names
remain provisional.

## Core, Profiles, Examples, and Adapters

The repository should keep these responsibilities distinct:

```text
spec/       semantic model, serialization, validation, conformance fixtures
profiles/   optional K-GAAP, K-IFRS, DART, valuation, and industry mappings
examples/   small learning cases, production-shaped statements, frozen references
adapters/   optional Excel, web, PDF, image, table, and XBRL preparation tools
```

Example categories should mirror Creo Valuation's useful separation:

- learning examples that teach one convention at a time;
- source pipelines that show how one producer emits an `fs` artifact;
- production-shaped examples that agents may copy;
- frozen real-statement references used only for reconciliation; and
- downstream examples, including an optional `fs` to Creo DCF adapter.

The initial distribution should also include a concise agent authoring policy:
preserve source labels, never invent zero for missing data, keep calculations
and classifications explicit, record ambiguity instead of guessing, and run
validation before handing the artifact to another task.

## Non-Goals

The first project will not:

- extract or OCR arbitrary source material;
- define a universal accounting or valuation taxonomy;
- decide correct K-GAAP, K-IFRS, or valuation classifications;
- model journal entries or a general ledger;
- model narrative or other nonnumeric disclosures in v0;
- contain DCF forecasts, normalization policy, or valuation formulas;
- execute arbitrary user code inside a received artifact;
- reproduce the full XBRL taxonomy, namespace, linkbase, or Formula machinery;
- infer calculations from presentation hierarchy; or
- optimize token count at the expense of unambiguous semantics and exact values.

## Initial Milestones

### M0: Evidence corpus

Manually organize several materially different statements, including:

- a simple annual income statement;
- detailed Korean P&L, balance sheet, and cash-flow statements;
- a statement with supplied subtotals that do and do not reconcile;
- multiple simultaneous accounting and valuation classifications; and
- facts transcribed from a workbook, website, PDF, and image with source
  locations.

The exit artifact is a set of reviewed examples and a list of recurring
mechanics. No custom parser is required.

### M1: Semantic model and JSON mapping

Specify items, facts, coordinates, calculations, classifications, statement
views, provenance, validation behavior, and a lossless reference JSON mapping.
Publish conformance fixtures, a small validator, and a deterministic
materializer.

### M2: Compact agent-facing syntax

Design a deterministic text syntax from the proven examples. Compare it with
plain JSON, JSON Lines, YAML, CSV, and TOON-style tabular sections. Require
lossless round trips to the semantic model.

### M3: Profiles and source pipelines

Add optional mappings and example adapters only where repeated real use earns
them. Keep every source adapter outside the core processor.

## Success Criteria

The first release succeeds if:

- two independent agents can produce schema-valid reports whose preserved
  source labels, coordinates, units, and locations make differences alignable
  and reviewable without requiring identical project-local item identifiers;
- every material fact retains an auditable source reference;
- supplied subtotals can be validated without losing their reported identity;
- missing calculated facts can be materialized with explicit lineage;
- multiple classification schemes coexist without overwriting one another;
- all classification, presentation, and calculation relationships remain
  separately inspectable;
- the artifact is easy to diff and deterministic to format;
- a downstream project can consume the report without understanding its source
  extraction process; and
- a new account, group, or statement layout never requires a core release.

## Open Decisions

- Is `fs` an acceptable public name? It collides with common filesystem package
  names and the `.fs` extension is already associated with F#.
- Should the first canonical artifact be one file or a small package containing
  definitions, facts, and source references?
- Can the semantic model be serialized directly with JSON and TOON, avoiding a
  new `fs` grammar entirely?
- What is the smallest calculation grammar that covers real statements without
  becoming a spreadsheet language?
- How should decimal precision, source rounding, and calculation tolerances be
  represented?
- Should source artifacts be hash-addressed references only, or may small source
  excerpts be embedded?
- Does the first version need a structured way to carry unresolved source or
  classification ambiguity, or are authored notes sufficient?

## Precedents

- [Creo Valuation](https://github.com/sjunepark/creo-valuation) demonstrates the
  intended mechanics-versus-examples separation: the platform supplies generic
  fields and checks while financial rules remain visible in projects.
- [TOON specification](https://github.com/toon-format/spec) demonstrates a
  deterministic, indentation-based JSON representation with compact uniform
  object arrays and conformance fixtures.
- [XBRL Open Information Model](https://specifications.xbrl.org/work-product-index-open-information-model-open-information-model.html)
  demonstrates a syntax-independent fact model and separate JSON/CSV mappings.
- [XBRL Calculations 1.1](https://specifications.xbrl.org/work-product-index-calculations-2-calculations-1-1.html)
  is a useful narrow precedent for validating reported totals without requiring
  a general formula language.

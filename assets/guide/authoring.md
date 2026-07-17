# Authoring FS Documents

Use this workflow only after the financial model is resolved. FS encodes one
entity and reporting scope; it does not extract source material, choose
financial meanings, map a taxonomy, convert units, or invent values.

## Prerequisites

Before encoding, obtain all of these from the author:

- the reporting entity and exact reporting scope;
- every item meaning and stable document-local identifier;
- units, scales, periods, fact values, and any dimensions;
- the intended distinction between zero, missing, and unavailable facts;
- statement composition and display order; and
- any calculation rules and tolerances to check.

Stop and request missing or contradictory inputs. Do not infer a meaning,
choose a sign, aggregate items, map a taxonomy, or invent a value.

## Workflow

1. Create one document for exactly one entity and reporting scope.
2. Define items, units, periods, and dimensions before referencing them.
3. Store each supplied value at its complete fact coordinate. Use exact decimal
   strings, encode zero as `"0"`, omit a missing coordinate, and use
   `"unavailable": true` only for explicit unavailability.
4. Add flat statement presentations over the shared facts. Presentation does
   not create facts, hierarchy, or calculations.
5. Add only confirmed calculation checks. Rules validate stored facts and
   never materialize values.
6. Validate the complete candidate before creating a document.

## Contract Discovery

```sh
fs schema document
fs example
fs example minimal
```

The [FS V0 semantic specification](https://github.com/cpaikr/fs/blob/main/docs/semantic-spec.md)
defines meaning beyond JSON shape. Passing the schema alone is not full
conformance evidence.

## Validate and Create

```sh
fs validate candidate.json
fs create --output statement.fs.json candidate.json
```

If validation reports structural nonconformance, use each diagnostic's stable
code and JSON Pointer path to correct the encoding, then validate the complete
candidate again. Do not invent a missing financial decision during repair.
Run `create` only after validation reports structural conformance.

Structural conformance, calculation consistency, and snapshot comparison are
separate results. Calculation inconsistency may still be a successful usable
validation result and does not prevent `create`; structural nonconformance
does. `create` copies the candidate's exact bytes atomically and never
overwrites an existing path or creates a missing parent directory.

import { calculate } from "./calculate.js"
import type { Document } from "./model.js"
import { inputLimitFailure, inputLimits, type InputLimitFailure } from "../limits.js"
import { validateSchema, type StructuralError } from "./schema.js"
import { validateSemantics } from "./semantic.js"
import { compareSnapshot, type SnapshotDiff, type ValidationResult } from "./snapshot.js"

export type DocumentValidation =
  | {
      readonly validation: Extract<ValidationResult, { readonly conformance: { readonly status: "nonconforming" } }>
      readonly snapshotDiff: SnapshotDiff
    }
  | {
      readonly document: Document
      readonly validation: Extract<ValidationResult, { readonly conformance: { readonly status: "conforming" } }>
      readonly snapshotDiff: SnapshotDiff
    }

export type BoundedDocumentValidation =
  | { readonly ok: true; readonly result: DocumentValidation }
  | ({ readonly ok: false } & InputLimitFailure)

const nonemptyErrors = (
  errors: ReadonlyArray<StructuralError>
): readonly [StructuralError, ...StructuralError[]] => {
  const [first, ...rest] = errors
  if (first === undefined) throw new Error("Nonconforming validation lost its diagnostics")
  return [first, ...rest]
}

type NonconformingValidation = Extract<
  ValidationResult,
  { readonly conformance: { readonly status: "nonconforming" } }
>

const nonconforming = (errors: ReadonlyArray<StructuralError>): NonconformingValidation => ({
  formatVersion: "0.1",
  conformance: { status: "nonconforming", errors: nonemptyErrors(errors) },
  calculations: { status: "not-run", applications: [] }
})

const structuralFailure = (
  value: unknown,
  schemaErrors: ReadonlyArray<StructuralError>
): DocumentValidation => {
  const validation = nonconforming(schemaErrors)
  const hasSnapshot = typeof value === "object" && value !== null && "validationSnapshot" in value
  const invalidSnapshot = schemaErrors.some(
    (error) => error.path === "/validationSnapshot" || error.path.startsWith("/validationSnapshot/")
  )
  if (hasSnapshot && invalidSnapshot) {
    return {
      validation,
      snapshotDiff: { formatVersion: "0.1", status: "not-comparable", reason: "invalid-snapshot" }
    }
  }
  const snapshot = hasSnapshot
    ? (value as { readonly validationSnapshot?: Document["validationSnapshot"] }).validationSnapshot
    : undefined
  return { validation, snapshotDiff: compareSnapshot(snapshot, validation) }
}

const validateConformingShape = (document: Document): DocumentValidation => {
  const semanticErrors = validateSemantics(document)
  if (semanticErrors.length > 0) {
    const validation = nonconforming(semanticErrors)
    return { validation, snapshotDiff: compareSnapshot(document.validationSnapshot, validation) }
  }

  const validation: Extract<
    ValidationResult,
    { readonly conformance: { readonly status: "conforming" } }
  > = {
    formatVersion: "0.1",
    conformance: { status: "conforming", errors: [] },
    calculations: calculate(document)
  }
  return {
    document,
    validation,
    snapshotDiff: compareSnapshot(document.validationSnapshot, validation)
  }
}

const decimalBudget = (document: Document): InputLimitFailure | undefined => {
  let total = 0
  const check = (decimal: string): InputLimitFailure | undefined => {
    const digits = decimal.length - (decimal.startsWith("-") ? 1 : 0) - (decimal.includes(".") ? 1 : 0)
    if (digits > inputLimits.decimalDigits) {
      return inputLimitFailure("decimal-digits", inputLimits.decimalDigits)
    }
    total += digits
    return total > inputLimits.totalDecimalDigits
      ? inputLimitFailure("total-decimal-digits", inputLimits.totalDecimalDigits)
      : undefined
  }

  for (const unit of document.units) {
    if (unit.defaultTolerance !== undefined) {
      const failure = check(unit.defaultTolerance)
      if (failure !== undefined) return failure
    }
  }
  for (const statement of document.statements) {
    for (const item of statement.items) {
      for (const value of Object.values(item.values)) {
        if (typeof value !== "string") continue
        const failure = check(value)
        if (failure !== undefined) return failure
      }
    }
  }
  for (const application of document.validationSnapshot?.applications ?? []) {
    if (application.status === "error") continue
    for (const value of [
      application.actual,
      application.expected,
      application.difference,
      application.tolerance
    ]) {
      const failure = check(value)
      if (failure !== undefined) return failure
    }
  }
  return undefined
}

export const validateDocumentBounded = (value: unknown): BoundedDocumentValidation => {
  const schemaErrors = validateSchema(value)
  if (schemaErrors.length > 0) return { ok: true, result: structuralFailure(value, schemaErrors) }
  const document = value as Document
  const limit = decimalBudget(document)
  if (limit !== undefined) return { ok: false, ...limit }
  return { ok: true, result: validateConformingShape(document) }
}

export const validateDocument = (value: unknown): DocumentValidation => {
  const schemaErrors = validateSchema(value)
  return schemaErrors.length > 0
    ? structuralFailure(value, schemaErrors)
    : validateConformingShape(value as Document)
}

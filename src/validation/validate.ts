import { calculate } from "./calculate.js"
import type { Document, ValidationSnapshot } from "./model.js"
import { inputLimitFailure, inputLimits, type InputLimitFailure } from "../limits.js"
import { conformsToSchema, validateSchema, type StructuralError } from "./schema.js"
import { conformsSemantically, validateSemantics } from "./semantic.js"
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

const diagnosticBytes = (errors: ReadonlyArray<StructuralError>): number =>
  Buffer.byteLength(JSON.stringify(errors), "utf8")

const diagnosticLimit = (
  errors: ReadonlyArray<StructuralError>
): InputLimitFailure | undefined =>
  diagnosticBytes(errors) > inputLimits.validationDiagnosticBytes
    ? inputLimitFailure("validation-diagnostic-bytes", inputLimits.validationDiagnosticBytes)
    : undefined

function* snapshotDecimals(snapshot: ValidationSnapshot): Generator<string> {
  for (const application of snapshot.applications) {
    if (application.status === "error") continue
    yield application.actual
    yield application.expected
    yield application.difference
    yield application.tolerance
  }
}

function* documentDecimals(document: Document): Generator<string> {
  for (const unit of document.units) {
    if (unit.defaultTolerance !== undefined) yield unit.defaultTolerance
  }
  for (const statement of document.statements) {
    for (const item of statement.items) {
      for (const value of Object.values(item.values)) {
        if (typeof value === "string") yield value
      }
    }
  }
  if (document.validationSnapshot !== undefined) {
    yield* snapshotDecimals(document.validationSnapshot)
  }
}

const decimalBudgetFor = (decimals: Iterable<string>): InputLimitFailure | undefined => {
  let total = 0
  for (const decimal of decimals) {
    const digits = decimal.length - (decimal.startsWith("-") ? 1 : 0) - (decimal.includes(".") ? 1 : 0)
    if (digits > inputLimits.decimalDigits) {
      return inputLimitFailure("decimal-digits", inputLimits.decimalDigits)
    }
    total += digits
    if (total > inputLimits.totalDecimalDigits) {
      return inputLimitFailure("total-decimal-digits", inputLimits.totalDecimalDigits)
    }
  }
  return undefined
}

const snapshotDecimalBudget = (value: unknown): InputLimitFailure | undefined => {
  if (value === null || typeof value !== "object" || !("validationSnapshot" in value)) return undefined
  const snapshot = (value as { readonly validationSnapshot?: ValidationSnapshot }).validationSnapshot
  return snapshot === undefined ? undefined : decimalBudgetFor(snapshotDecimals(snapshot))
}

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

const conforming = (document: Document): DocumentValidation => {
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

const validateConformingShape = (document: Document): DocumentValidation => {
  const semanticErrors = validateSemantics(document)
  if (semanticErrors.length === 0) return conforming(document)
  const validation = nonconforming(semanticErrors)
  return { validation, snapshotDiff: compareSnapshot(document.validationSnapshot, validation) }
}

const decimalBudget = (document: Document): InputLimitFailure | undefined => {
  return decimalBudgetFor(documentDecimals(document))
}

export const validateDocumentBounded = (
  value: unknown,
  jsonValues: number
): BoundedDocumentValidation => {
  const complex = jsonValues > inputLimits.invalidDocumentValues
  const schemaErrors = complex
    ? conformsToSchema(value)
      ? []
      : undefined
    : validateSchema(value)
  if (schemaErrors === undefined) {
    return {
      ok: false,
      ...inputLimitFailure("invalid-document-values", inputLimits.invalidDocumentValues)
    }
  }
  if (schemaErrors.length > 0) {
    const invalidSnapshot = schemaErrors.some(
      (error) => error.path === "/validationSnapshot" || error.path.startsWith("/validationSnapshot/")
    )
    const snapshotLimit = invalidSnapshot ? undefined : snapshotDecimalBudget(value)
    if (snapshotLimit !== undefined) return { ok: false, ...snapshotLimit }
    const limit = diagnosticLimit(schemaErrors)
    return limit === undefined
      ? { ok: true, result: structuralFailure(value, schemaErrors) }
      : { ok: false, ...limit }
  }
  const document = value as Document
  const limit = decimalBudget(document)
  if (limit !== undefined) return { ok: false, ...limit }
  if (complex) {
    return conformsSemantically(document)
      ? { ok: true, result: conforming(document) }
      : {
          ok: false,
          ...inputLimitFailure("invalid-document-values", inputLimits.invalidDocumentValues)
        }
  }
  const semanticErrors = validateSemantics(document)
  if (semanticErrors.length === 0) return { ok: true, result: conforming(document) }
  const semanticLimit = diagnosticLimit(semanticErrors)
  return semanticLimit === undefined
    ? { ok: true, result: structuralFailure(document, semanticErrors) }
    : { ok: false, ...semanticLimit }
}

export const validateDocument = (value: unknown): DocumentValidation => {
  const schemaErrors = validateSchema(value)
  return schemaErrors.length > 0
    ? structuralFailure(value, schemaErrors)
    : validateConformingShape(value as Document)
}

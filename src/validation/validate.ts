import { calculate } from "./calculate.js"
import type { Document } from "./model.js"
import { validateSchema, type StructuralError } from "./schema.js"
import { validateSemantics } from "./semantic.js"
import { compareSnapshot, type SnapshotDiff, type ValidationResult } from "./snapshot.js"

export interface DocumentValidation {
  readonly validation: ValidationResult
  readonly snapshotDiff: SnapshotDiff
}

const nonconforming = (errors: ReadonlyArray<StructuralError>): ValidationResult => ({
  formatVersion: "0.1",
  conformance: { status: "nonconforming", errors },
  calculations: { status: "not-run", applications: [] }
})

export const validateDocument = (value: unknown): DocumentValidation => {
  const schemaErrors = validateSchema(value)
  if (schemaErrors.length > 0) {
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
    const snapshot =
      hasSnapshot
        ? (value as { readonly validationSnapshot?: Document["validationSnapshot"] }).validationSnapshot
        : undefined
    return { validation, snapshotDiff: compareSnapshot(snapshot, validation) }
  }

  const document = value as Document
  const semanticErrors = validateSemantics(document)
  if (semanticErrors.length > 0) {
    const validation = nonconforming(semanticErrors)
    return { validation, snapshotDiff: compareSnapshot(document.validationSnapshot, validation) }
  }

  const calculations = calculate(document)
  const validation: ValidationResult = {
    formatVersion: "0.1",
    conformance: { status: "conforming", errors: [] },
    calculations
  }
  return { validation, snapshotDiff: compareSnapshot(document.validationSnapshot, validation) }
}

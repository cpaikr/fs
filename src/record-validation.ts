import { inconsistentApplications, type Document, type ValidationSnapshot } from "./validation/model.js"
import type { ValidationResult } from "./validation/snapshot.js"

export interface RecordedValidation {
  readonly document: Document
  readonly bytes: Buffer
}

const snapshotFromValidation = (validation: ValidationResult): ValidationSnapshot => {
  if (validation.calculations.status === "not-run") {
    return {
      conformance: "nonconforming",
      calculations: validation.calculations.status,
      applications: []
    }
  }
  if (validation.calculations.status === "not-defined") {
    return {
      conformance: "conforming",
      calculations: validation.calculations.status,
      applications: []
    }
  }
  if (validation.calculations.status === "consistent") {
    const [first, ...rest] = validation.calculations.applications
    return {
      conformance: "conforming",
      calculations: validation.calculations.status,
      applications: [first, ...rest]
    }
  }
  const applications = inconsistentApplications([...validation.calculations.applications])
  if (applications === undefined) {
    throw new Error("Inconsistent validation lost its failing application")
  }
  return {
    conformance: "conforming",
    calculations: validation.calculations.status,
    applications
  }
}

export const recordValidationSnapshot = (
  document: Document,
  validation: ValidationResult
): RecordedValidation => {
  const { validationSnapshot: _previous, ...members } = document
  const validationSnapshot = snapshotFromValidation(validation)
  const recorded: Document = { ...members, validationSnapshot }
  return {
    document: recorded,
    bytes: Buffer.from(`${JSON.stringify(recorded, null, 2)}\n`, "utf8")
  }
}

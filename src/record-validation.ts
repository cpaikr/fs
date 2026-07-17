import type {
  Document,
  ValidationSnapshot
} from "./validation/model.js"
import type { ValidationResult } from "./validation/snapshot.js"

export interface RecordedValidation {
  readonly document: Document
  readonly bytes: Buffer
}

export const recordValidationSnapshot = (
  document: Document,
  validation: ValidationResult
): RecordedValidation => {
  const { validationSnapshot: _previous, ...members } = document
  const validationSnapshot: ValidationSnapshot = {
    conformance: validation.conformance.status,
    calculations: validation.calculations.status,
    applications: validation.calculations.applications
  }
  const recorded: Document = { ...members, validationSnapshot }
  return {
    document: recorded,
    bytes: Buffer.from(`${JSON.stringify(recorded, null, 2)}\n`, "utf8")
  }
}

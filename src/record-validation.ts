import type {
  ConsistentApplications,
  Document,
  ValidationSnapshot
} from "./validation/model.js"
import { inconsistentApplications } from "./validation/model.js"
import type { ValidationResult } from "./validation/snapshot.js"

export interface RecordedValidation {
  readonly document: Document
  readonly bytes: Buffer
}

const unexpectedValidation = (): never => {
  throw new Error("Validated result has an impossible status and application combination")
}

const snapshotFromValidation = (validation: ValidationResult): ValidationSnapshot => {
  const { status: conformance } = validation.conformance
  const { status: calculations, applications } = validation.calculations

  if (conformance === "nonconforming") {
    if (calculations !== "not-run" || applications.length !== 0) return unexpectedValidation()
    return { conformance, calculations, applications: [] }
  }
  if (calculations === "not-defined") {
    if (applications.length !== 0) return unexpectedValidation()
    return { conformance, calculations, applications: [] }
  }
  if (calculations === "consistent") {
    const satisfied = applications.filter(
      (application): application is ConsistentApplications[number] => application.status === "satisfied"
    )
    const [first, ...rest] = satisfied
    if (first === undefined || satisfied.length !== applications.length) return unexpectedValidation()
    return {
      conformance,
      calculations,
      applications: [first, ...rest]
    }
  }
  if (calculations === "inconsistent") {
    const typedApplications = inconsistentApplications(applications)
    if (typedApplications === undefined) return unexpectedValidation()
    return {
      conformance,
      calculations,
      applications: typedApplications
    }
  }

  return unexpectedValidation()
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

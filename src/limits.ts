export const inputLimits = {
  bytes: 16_777_216,
  jsonNesting: 64,
  jsonValues: 200_000,
  invalidDocumentValues: 256,
  validationDiagnosticBytes: 1_048_576,
  decimalDigits: 1_000,
  totalDecimalDigits: 1_000_000
} as const

export type InputBudget =
  | "input-bytes"
  | "json-nesting"
  | "json-values"
  | "invalid-document-values"
  | "validation-diagnostic-bytes"
  | "decimal-digits"
  | "total-decimal-digits"

export interface InputLimitFailure {
  readonly budget: InputBudget
  readonly limit: number
  readonly message: string
}

export const inputLimitFailure = (
  budget: InputBudget,
  limit: number
): InputLimitFailure => ({
  budget,
  limit,
  message: `Input exceeds the ${budget} budget of ${limit}.`
})

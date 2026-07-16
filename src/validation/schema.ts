import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js"

import { schemaAsset } from "../assets.js"
import { compareDiagnostics } from "./identity.js"

export interface StructuralError {
  readonly code: string
  readonly path: string
  readonly message: string
}

const documentSchema = JSON.parse(schemaAsset("document").toString("utf8")) as object
const ajv = new Ajv2020({ allErrors: true, strict: false })
const validate: ValidateFunction = ajv.compile(documentSchema)

const escapePointer = (value: string): string => value.replaceAll("~", "~0").replaceAll("/", "~1")

const normalize = (error: ErrorObject): StructuralError => {
  let path = error.instancePath
  let code = `schema-${error.keyword}`
  if (error.keyword === "additionalProperties") {
    path = `${path}/${escapePointer(String(error.params.additionalProperty))}`
    code = "unknown-property"
  } else if (error.keyword === "type" && path.match(/^\/facts\/\d+\/value$/u)) {
    code = "decimal-string-required"
  } else if (error.keyword === "oneOf" && path.match(/^\/facts\/\d+$/u)) {
    code = "fact-value-exclusive"
  } else if (
    error.keyword === "pattern" &&
    (path.endsWith("/defaultTolerance") || path.endsWith("/tolerance"))
  ) {
    code = "invalid-tolerance"
  } else if (
    (error.keyword === "minimum" || error.keyword === "maximum") &&
    path.match(/^\/units\/\d+\/scale$/u)
  ) {
    code = "scale-out-of-range"
  }
  return {
    code,
    path,
    message: error.message === undefined ? "The document does not match its schema." : `Value ${error.message}.`
  }
}

export const validateSchema = (value: unknown): ReadonlyArray<StructuralError> => {
  if (validate(value)) return []
  const normalized = (validate.errors ?? []).map(normalize)
  return normalized.sort(compareDiagnostics)
}

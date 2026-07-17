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

const pointerValue = (value: unknown, pointer: string): unknown => {
  if (pointer === "") return value
  return pointer
    .slice(1)
    .split("/")
    .map((token) => token.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce<unknown>((current, token) => {
      if (current === null || typeof current !== "object") return undefined
      return (current as Readonly<Record<string, unknown>>)[token]
    }, value)
}

const message = (error: ErrorObject): string =>
  error.message === undefined ? "The document does not match its schema." : `Value ${error.message}.`

const uniqueItemPath = (error: ErrorObject): string => {
  const first = typeof error.params.i === "number" ? error.params.i : 0
  const second = typeof error.params.j === "number" ? error.params.j : 0
  return `${error.instancePath}/${Math.max(first, second)}`
}

const normalize = (error: ErrorObject): StructuralError | undefined => {
  let path = error.instancePath
  let code: string

  if (error.keyword === "oneOf" || error.keyword === "if") return undefined
  if (error.keyword === "required") {
    path = `${path}/${escapePointer(String(error.params.missingProperty))}`
    code = "required-property"
  } else if (error.keyword === "additionalProperties") {
    path = `${path}/${escapePointer(String(error.params.additionalProperty))}`
    code = "unknown-property"
  } else if (path.endsWith("/defaultTolerance")) {
    code = "invalid-tolerance"
  } else if (
    (error.keyword === "minimum" || error.keyword === "maximum") &&
    /^\/units\/\d+\/scale$/u.test(path)
  ) {
    code = "scale-out-of-range"
  } else if (error.keyword === "uniqueItems" && /^\/statements\/\d+\/periods$/u.test(path)) {
    path = uniqueItemPath(error)
    code = "duplicate-reference"
  } else if (error.keyword === "uniqueItems" && path === "/groupingColumns") {
    path = uniqueItemPath(error)
    code = "duplicate-id"
  } else if (error.keyword === "type") {
    code = "invalid-type"
  } else {
    if (typeof error.propertyName === "string") {
      path = `${path}/${escapePointer(error.propertyName)}`
    }
    code = "invalid-value"
  }

  return { code, path, message: message(error) }
}

export const validateSchema = (value: unknown): ReadonlyArray<StructuralError> => {
  if (validate(value)) return []
  const raw = validate.errors ?? []
  const decimalNumberPaths = new Set(
    raw
      .map(({ instancePath }) => instancePath)
      .filter(
        (path) =>
          /^\/statements\/\d+\/items\/\d+\/values\/[^/]+$/u.test(path) &&
          typeof pointerValue(value, path) === "number"
      )
  )
  const normalized = raw
    .filter((error) => !decimalNumberPaths.has(error.instancePath))
    .map(normalize)
    .filter((error): error is StructuralError => error !== undefined)

  decimalNumberPaths.forEach((path) => {
    normalized.push({
      code: "decimal-string-required",
      path,
      message: "An exact decimal must be encoded as a canonical JSON string."
    })
  })

  const unique = new Map<string, StructuralError>()
  normalized.forEach((error) => unique.set(`${error.path}\u0000${error.code}`, error))
  return [...unique.values()].sort(compareDiagnostics)
}

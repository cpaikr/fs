import type { ApplicationKey, Coordinate, Dimensions } from "./model.js"

const compareText = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0

const canonicalDimensions = (dimensions: Dimensions | undefined): string =>
  JSON.stringify(Object.entries(dimensions ?? {}).sort(([left], [right]) => compareText(left, right)))

export const coordinateKey = (coordinate: Coordinate): string =>
  JSON.stringify([
    coordinate.item,
    coordinate.period,
    coordinate.unit,
    JSON.parse(canonicalDimensions(coordinate.dimensions)) as unknown
  ])

export const applicationKey = (key: ApplicationKey): string =>
  JSON.stringify([key.rule, key.period, JSON.parse(canonicalDimensions(key.dimensions)) as unknown])

export const compareDiagnostics = (
  left: { readonly path: string; readonly code: string },
  right: { readonly path: string; readonly code: string }
): number => compareText(left.path, right.path) || compareText(left.code, right.code)

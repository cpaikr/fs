import type { ApplicationKey } from "./model.js"

const compareText = (left: string, right: string): number => left < right ? -1 : left > right ? 1 : 0

export const applicationKey = (key: ApplicationKey): string =>
  JSON.stringify([key.statement, key.parent, key.period])

export const compareDiagnostics = (
  left: { readonly path: string; readonly code: string },
  right: { readonly path: string; readonly code: string }
): number => compareText(left.path, right.path) || compareText(left.code, right.code)

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { renderHtml, renderLimits } from "../../src/render.js"
import type { Document } from "../../src/validation/model.js"

export const exactByteDocument = (): Document => {
  const document = JSON.parse(readFileSync(resolve("examples/minimal.json"), "utf8")) as Document
  const statement = document.statements[0]
  const item = statement?.items[0]
  if (statement === undefined || item === undefined) {
    throw new Error("Minimal fixture lost its first statement item")
  }
  const baseline: Document = {
    ...document,
    entity: { ...document.entity, name: "x" },
    statements: [{ ...statement, label: "x", items: [{ ...item, label: "x" }] }]
  }
  const renderLength = (candidate: Document): number => {
    const rendered = renderHtml(candidate)
    if (!rendered.ok) throw new Error("Render byte-boundary probe unexpectedly exceeded a budget")
    return rendered.bytes.length
  }
  const baselineLength = renderLength(baseline)
  const entityDelta = renderLength({
    ...baseline,
    entity: { ...baseline.entity, name: "xa" }
  }) - baselineLength
  const statementDelta = renderLength({
    ...baseline,
    statements: [{ ...baseline.statements[0] as Document["statements"][number], label: "xa" }]
  }) - baselineLength
  const remaining = renderLimits.htmlBytes - baselineLength
  let statementPadding = 0
  while (
    statementPadding < entityDelta &&
    (remaining - statementPadding * statementDelta) % entityDelta !== 0
  ) {
    statementPadding += 1
  }
  const entityPadding = (remaining - statementPadding * statementDelta) / entityDelta
  if (!Number.isInteger(entityPadding) || entityPadding < 0) {
    throw new Error("Could not construct the exact HTML byte boundary")
  }
  return {
    ...baseline,
    entity: { ...baseline.entity, name: `x${"a".repeat(entityPadding)}` },
    statements: [{
      ...baseline.statements[0] as Document["statements"][number],
      label: `x${"a".repeat(statementPadding)}`
    }]
  }
}

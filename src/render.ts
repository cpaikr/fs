import { HtmlSink } from "./render/html.js"
import {
  createRenderPresentation,
  type RenderPresentation
} from "./render/presentation.js"
import { renderTemplate } from "./render/template.js"
import type { Document } from "./validation/model.js"

export const renderLimits = {
  columns: 1_000,
  gridSlots: 100_000,
  htmlBytes: 16 * 1024 * 1024
} as const

export type RenderLimitBudget = "columns" | "grid-slots" | "html-bytes"

export type RenderResult =
  | { readonly ok: true; readonly bytes: Buffer }
  | {
      readonly ok: false
      readonly budget: RenderLimitBudget
      readonly limit: number
    }

const limitExceeded = (budget: RenderLimitBudget, limit: number): RenderResult => ({
  ok: false,
  budget,
  limit
})

const structuralPreflight = (presentation: RenderPresentation): RenderResult | undefined => {
  for (const { statement, fixedColumnCount } of presentation.statements) {
    const fixedColumns = fixedColumnCount
    if (fixedColumns > renderLimits.columns || statement.periods.length > renderLimits.columns - fixedColumns) {
      return limitExceeded("columns", renderLimits.columns)
    }
  }

  let gridSlots = 0
  for (const { statement, fixedColumnCount } of presentation.statements) {
    const columns = fixedColumnCount + statement.periods.length
    const rows = statement.items.length + 1
    const remainingSlots = renderLimits.gridSlots - gridSlots
    if (rows > Math.floor(remainingSlots / columns)) {
      return limitExceeded("grid-slots", renderLimits.gridSlots)
    }
    gridSlots += rows * columns
  }
  return undefined
}

export const renderHtml = (document: Document): RenderResult => {
  const presentation = createRenderPresentation(document)
  const structuralFailure = structuralPreflight(presentation)
  if (structuralFailure !== undefined) return structuralFailure

  const measuringSink = new HtmlSink(false, renderLimits.htmlBytes)
  renderTemplate(presentation, measuringSink)
  if (measuringSink.exceeded) return limitExceeded("html-bytes", renderLimits.htmlBytes)

  const outputSink = new HtmlSink(true, renderLimits.htmlBytes)
  renderTemplate(presentation, outputSink)
  if (outputSink.exceeded) throw new Error("Measured HTML exceeded its byte budget while encoding")
  return { ok: true, bytes: outputSink.bytes() }
}

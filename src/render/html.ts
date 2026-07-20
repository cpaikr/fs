interface HtmlPart {
  readonly text: string
  readonly escaped: boolean
}

const templateParts: unique symbol = Symbol("HtmlTemplate.parts")

export interface HtmlTemplate {
  readonly [templateParts]: ReadonlyArray<HtmlPart>
}

type HtmlInterpolation = HtmlTemplate | string | number

const literal = (text: string): HtmlPart => ({ text, escaped: false })
const authorText = (text: string): HtmlPart => ({ text, escaped: true })

export const html = (
  strings: TemplateStringsArray,
  ...values: ReadonlyArray<HtmlInterpolation>
): HtmlTemplate => {
  const parts: Array<HtmlPart> = []
  for (const [index, string] of strings.entries()) {
    if (string.length > 0) parts.push(literal(string))
    const value = values[index]
    if (value === undefined) continue
    if (typeof value === "string") {
      parts.push(authorText(value))
    } else if (typeof value === "number") {
      parts.push(literal(String(value)))
    } else {
      parts.push(...value[templateParts])
    }
  }
  return { [templateParts]: parts }
}

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/gu, (character) => {
    switch (character) {
      case "&":
        return "&amp;"
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case '"':
        return "&quot;"
      case "'":
        return "&#39;"
      default:
        return character
    }
  })

const escapedByteLength = (text: string): number => {
  let bytes = Buffer.byteLength(text, "utf8")
  for (const character of text.matchAll(/[&<>"']/gu)) {
    switch (character[0]) {
      case "&":
      case "'":
        bytes += 4
        break
      case "<":
      case ">":
        bytes += 3
        break
      case '"':
        bytes += 5
        break
    }
  }
  return bytes
}

export class HtmlSink {
  private readonly chunks: Array<string> | null
  private byteCount = 0
  exceeded = false

  constructor(
    collect: boolean,
    private readonly byteLimit: number
  ) {
    this.chunks = collect ? [] : null
  }

  write(template: HtmlTemplate): void {
    this.writeTemplate(template, false)
  }

  writeLine(template: HtmlTemplate): void {
    this.writeTemplate(template, true)
  }

  private writeTemplate(template: HtmlTemplate, lineBreak: boolean): void {
    if (this.exceeded) return
    let remaining = this.byteLimit - this.byteCount - (lineBreak ? 1 : 0)
    if (remaining < 0) {
      this.exceeded = true
      return
    }
    const renderedParts: Array<string> | null = this.chunks === null ? null : []
    for (const part of template[templateParts]) {
      const length = part.escaped ? escapedByteLength(part.text) : Buffer.byteLength(part.text, "utf8")
      if (length > remaining) {
        this.exceeded = true
        return
      }
      remaining -= length
      renderedParts?.push(part.escaped ? escapeHtml(part.text) : part.text)
    }
    this.byteCount = this.byteLimit - remaining
    if (renderedParts !== null) {
      this.chunks?.push(`${renderedParts.join("")}${lineBreak ? "\n" : ""}`)
    }
  }

  bytes(): Buffer {
    if (this.chunks === null || this.exceeded) throw new Error("HTML sink has no complete output")
    return Buffer.from(this.chunks.join(""), "utf8")
  }
}

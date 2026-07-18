import { inputLimitFailure, inputLimits, type InputLimitFailure } from "./limits.js"

export type JsonDecodeResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly kind: "invalid-json"; readonly message: string }
  | ({ readonly ok: false; readonly kind: "input-limit" } & InputLimitFailure)

const maximumBoundaryInteger = "9007199254740992"

class OwnedJsonError extends Error {}

class JsonLimitError extends Error {
  constructor(readonly failure: InputLimitFailure) {
    super(failure.message)
  }
}

const owned = (message: string): never => {
  throw new OwnedJsonError(message)
}

const integerMagnitudeWithinBoundary = (lexeme: string): boolean => {
  const match = /^-?(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/u.exec(lexeme)
  if (match === null) return false
  const whole = match[1] ?? ""
  const fraction = match[2] ?? ""
  const digits = `${whole}${fraction}`
  if (!/[1-9]/u.test(digits)) return true

  const exponentLexeme = match[3] ?? "0"
  const exponentNegative = exponentLexeme.startsWith("-")
  const exponentDigits = exponentLexeme.replace(/^[+-]?0*/u, "") || "0"
  if (exponentDigits.length > 6) return false
  const exponentMagnitude = Number(exponentDigits)
  if (!Number.isSafeInteger(exponentMagnitude)) return false
  const exponent = exponentNegative ? -exponentMagnitude : exponentMagnitude
  const decimalIndex = whole.length + exponent
  if (decimalIndex <= 0 || /[1-9]/u.test(digits.slice(decimalIndex))) return false

  const integerPrefix = digits.slice(0, Math.min(decimalIndex, digits.length)).replace(/^0+/u, "")
  const trailingZeros = Math.max(0, decimalIndex - digits.length)
  const magnitudeLength = integerPrefix.length + trailingZeros
  if (magnitudeLength !== maximumBoundaryInteger.length) {
    return magnitudeLength < maximumBoundaryInteger.length
  }
  const magnitude = `${integerPrefix}${"0".repeat(trailingZeros)}`
  return magnitude <= maximumBoundaryInteger
}

type ObjectFrame = {
  readonly kind: "object"
  state: "first-key-or-end" | "key" | "comma-or-end"
  readonly members: Set<string>
}

type ArrayFrame = {
  readonly kind: "array"
  state: "first-value-or-end" | "value" | "comma-or-end"
}

type Frame = ObjectFrame | ArrayFrame

class JsonScanner {
  private index = 0
  private values = 0
  private rootComplete = false
  private readonly stack: Array<Frame> = []

  constructor(private readonly text: string) {}

  scan(): void {
    this.whitespace()
    this.value()
    while (!this.rootComplete) {
      const frame = this.stack.at(-1)
      if (frame === undefined) throw new OwnedJsonError("JSON contains invalid syntax.")
      if (frame.kind === "object") this.objectStep(frame)
      else this.arrayStep(frame)
    }
    this.whitespace()
    if (this.index !== this.text.length) owned("JSON contains trailing content.")
  }

  private whitespace(): void {
    while (/^[\t\n\r ]$/u.test(this.text[this.index] ?? "")) this.index += 1
  }

  private completePrimitive(): void {
    if (this.stack.length === 0) this.rootComplete = true
  }

  private closeContainer(): void {
    this.stack.pop()
    if (this.stack.length === 0) this.rootComplete = true
  }

  private countValue(): void {
    this.values += 1
    if (this.values > inputLimits.jsonValues) {
      throw new JsonLimitError(inputLimitFailure("json-values", inputLimits.jsonValues))
    }
  }

  private value(): void {
    const character = this.text[this.index]
    if (character === "{" || character === "[") {
      this.countValue()
      if (this.stack.length + 1 > inputLimits.jsonNesting) {
        throw new JsonLimitError(inputLimitFailure("json-nesting", inputLimits.jsonNesting))
      }
      this.index += 1
      this.stack.push(
        character === "{"
          ? { kind: "object", state: "first-key-or-end", members: new Set<string>() }
          : { kind: "array", state: "first-value-or-end" }
      )
      return
    }
    if (character === '"') {
      this.countValue()
      this.string()
      this.completePrimitive()
      return
    }
    for (const literal of ["true", "false", "null"] as const) {
      if (this.text.startsWith(literal, this.index)) {
        this.countValue()
        this.index += literal.length
        this.completePrimitive()
        return
      }
    }
    const end = this.numberEnd()
    if (end === this.index) owned("JSON contains invalid syntax.")
    this.countValue()
    this.number(this.text.slice(this.index, end))
    this.index = end
    this.completePrimitive()
  }

  private numberEnd(): number {
    let cursor = this.index
    if (this.text[cursor] === "-") cursor += 1
    if (this.text[cursor] === "0") {
      cursor += 1
    } else {
      const first = this.text[cursor]
      if (first === undefined || first < "1" || first > "9") return this.index
      while (/^\d$/u.test(this.text[cursor] ?? "")) cursor += 1
    }
    if (this.text[cursor] === ".") {
      cursor += 1
      const start = cursor
      while (/^\d$/u.test(this.text[cursor] ?? "")) cursor += 1
      if (cursor === start) owned("JSON contains invalid syntax.")
    }
    if (this.text[cursor] === "e" || this.text[cursor] === "E") {
      cursor += 1
      if (this.text[cursor] === "+" || this.text[cursor] === "-") cursor += 1
      const start = cursor
      while (/^\d$/u.test(this.text[cursor] ?? "")) cursor += 1
      if (cursor === start) owned("JSON contains invalid syntax.")
    }
    return cursor
  }

  private number(lexeme: string): void {
    const numeric = Number(lexeme)
    if (!Number.isFinite(numeric)) owned("JSON number is outside the supported finite range.")
    if (Number.isInteger(numeric) && !integerMagnitudeWithinBoundary(lexeme)) {
      owned("JSON number cannot be represented without precision loss.")
    }
  }

  private string(): string {
    const start = this.index
    this.index += 1
    while (this.index < this.text.length) {
      const character = this.text[this.index]
      if (character === '"') {
        this.index += 1
        try {
          return JSON.parse(this.text.slice(start, this.index)) as string
        } catch (error) {
          if (error instanceof SyntaxError) owned("JSON contains an invalid string.")
          throw error
        }
      }
      if (character === "\\") {
        this.index += 1
        const escape = this.text[this.index]
        if (escape === "u") {
          const digits = this.text.slice(this.index + 1, this.index + 5)
          if (!/^[0-9A-Fa-f]{4}$/u.test(digits)) owned("JSON contains an invalid escape.")
          this.index += 5
          continue
        }
        if (!['"', "\\", "/", "b", "f", "n", "r", "t"].includes(escape ?? "")) {
          owned("JSON contains an invalid escape.")
        }
        this.index += 1
        continue
      }
      if (character === undefined || character.charCodeAt(0) < 0x20) {
        owned("JSON contains an invalid string.")
      }
      this.index += 1
    }
    throw new OwnedJsonError("JSON contains an unterminated string.")
  }

  private objectStep(frame: ObjectFrame): void {
    this.whitespace()
    if (frame.state === "comma-or-end") {
      if (this.text[this.index] === "}") {
        this.index += 1
        this.closeContainer()
        return
      }
      if (this.text[this.index] !== ",") owned("JSON object members are not separated.")
      this.index += 1
      frame.state = "key"
      return
    }
    if (frame.state === "first-key-or-end" && this.text[this.index] === "}") {
      this.index += 1
      this.closeContainer()
      return
    }
    if (this.text[this.index] !== '"') owned("JSON object key is not a string.")
    const member = this.string()
    if (frame.members.has(member)) owned("JSON object contains a duplicate member.")
    frame.members.add(member)
    this.whitespace()
    if (this.text[this.index] !== ":") owned("JSON object member lacks a colon.")
    this.index += 1
    this.whitespace()
    frame.state = "comma-or-end"
    this.value()
  }

  private arrayStep(frame: ArrayFrame): void {
    this.whitespace()
    if (frame.state === "comma-or-end") {
      if (this.text[this.index] === "]") {
        this.index += 1
        this.closeContainer()
        return
      }
      if (this.text[this.index] !== ",") owned("JSON array values are not separated.")
      this.index += 1
      frame.state = "value"
      return
    }
    if (frame.state === "first-value-or-end" && this.text[this.index] === "]") {
      this.index += 1
      this.closeContainer()
      return
    }
    frame.state = "comma-or-end"
    this.value()
  }
}

export const decodeJson = (bytes: Buffer): JsonDecodeResult => {
  let text: string
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch (error) {
    if (error instanceof TypeError) {
      return { ok: false, kind: "invalid-json", message: "Input is not valid UTF-8." }
    }
    throw error
  }

  try {
    new JsonScanner(text).scan()
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch (error) {
    if (error instanceof JsonLimitError) {
      return { ok: false, kind: "input-limit", ...error.failure }
    }
    if (error instanceof OwnedJsonError || error instanceof SyntaxError) {
      return {
        ok: false,
        kind: "invalid-json",
        message: error.message.length > 0 ? error.message : "Input is not valid JSON."
      }
    }
    throw error
  }
}

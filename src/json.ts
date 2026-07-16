export type JsonDecodeResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly message: string }

class JsonScanner {
  private index = 0

  constructor(private readonly text: string) {}

  scan(): void {
    this.whitespace()
    this.value()
    this.whitespace()
    if (this.index !== this.text.length) throw new Error("JSON contains trailing content.")
  }

  private whitespace(): void {
    while (/[\t\n\r ]/.test(this.text[this.index] ?? "")) this.index += 1
  }

  private value(): void {
    const character = this.text[this.index]
    if (character === "{") return this.object()
    if (character === "[") return this.array()
    if (character === '"') {
      this.string()
      return
    }
    for (const literal of ["true", "false", "null"]) {
      if (this.text.startsWith(literal, this.index)) {
        this.index += literal.length
        return
      }
    }
    const number = this.text.slice(this.index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u)?.[0]
    if (number !== undefined) {
      this.number(number)
      this.index += number.length
      return
    }
    throw new Error("JSON contains invalid syntax.")
  }

  private number(lexeme: string): void {
    const numeric = Number(lexeme)
    if (!Number.isFinite(numeric)) throw new Error("JSON number is outside the supported finite range.")
    if (/^-?\d+$/u.test(lexeme)) {
      const integer = BigInt(lexeme)
      const magnitude = integer < 0n ? -integer : integer
      // The adjacent out-of-range scale fixtures deliberately require
      // ±(MAX_SAFE_INTEGER + 1) to reach schema normalization. Larger integer
      // lexemes cannot survive the JavaScript number boundary exactly.
      if (magnitude > 9007199254740992n) {
        throw new Error("JSON integer cannot be represented without precision loss.")
      }
    }
  }

  private string(): string {
    const start = this.index
    this.index += 1
    while (this.index < this.text.length) {
      const character = this.text[this.index]
      if (character === '"') {
        this.index += 1
        return JSON.parse(this.text.slice(start, this.index)) as string
      }
      if (character === "\\") {
        this.index += 1
        const escape = this.text[this.index]
        if (escape === "u") {
          const digits = this.text.slice(this.index + 1, this.index + 5)
          if (!/^[0-9A-Fa-f]{4}$/u.test(digits)) throw new Error("JSON contains an invalid escape.")
          this.index += 5
          continue
        }
        if (!['"', "\\", "/", "b", "f", "n", "r", "t"].includes(escape ?? "")) {
          throw new Error("JSON contains an invalid escape.")
        }
        this.index += 1
        continue
      }
      if (character === undefined || character.charCodeAt(0) < 0x20) {
        throw new Error("JSON contains an invalid string.")
      }
      this.index += 1
    }
    throw new Error("JSON contains an unterminated string.")
  }

  private object(): void {
    this.index += 1
    this.whitespace()
    const members = new Set<string>()
    if (this.text[this.index] === "}") {
      this.index += 1
      return
    }
    while (true) {
      if (this.text[this.index] !== '"') throw new Error("JSON object key is not a string.")
      const member = this.string()
      if (members.has(member)) throw new Error("JSON object contains a duplicate member.")
      members.add(member)
      this.whitespace()
      if (this.text[this.index] !== ":") throw new Error("JSON object member lacks a colon.")
      this.index += 1
      this.whitespace()
      this.value()
      this.whitespace()
      if (this.text[this.index] === "}") {
        this.index += 1
        return
      }
      if (this.text[this.index] !== ",") throw new Error("JSON object members are not separated.")
      this.index += 1
      this.whitespace()
    }
  }

  private array(): void {
    this.index += 1
    this.whitespace()
    if (this.text[this.index] === "]") {
      this.index += 1
      return
    }
    while (true) {
      this.value()
      this.whitespace()
      if (this.text[this.index] === "]") {
        this.index += 1
        return
      }
      if (this.text[this.index] !== ",") throw new Error("JSON array values are not separated.")
      this.index += 1
      this.whitespace()
    }
  }
}

export const decodeJson = (bytes: Buffer): JsonDecodeResult => {
  let text: string
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return { ok: false, message: "Input is not valid UTF-8." }
  }

  try {
    new JsonScanner(text).scan()
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error && error.message.length > 0 ? error.message : "Input is not valid JSON."
    }
  }
}

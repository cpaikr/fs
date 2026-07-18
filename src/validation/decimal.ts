export class Decimal {
  private constructor(
    private readonly coefficient: bigint,
    private readonly scale: number
  ) {}

  static parse(value: string): Decimal {
    const match = /^(-?)(\d+)(?:\.(\d+))?$/u.exec(value)
    if (match === null) throw new Error("Invalid canonical decimal")
    const fractional = match[3] ?? ""
    const sign = match[1] === "-" ? -1n : 1n
    return Decimal.normalize(sign * BigInt(`${match[2]}${fractional}`), fractional.length)
  }

  static zero(): Decimal {
    return new Decimal(0n, 0)
  }

  private static normalize(coefficient: bigint, scale: number): Decimal {
    if (coefficient === 0n) return Decimal.zero()
    const negative = coefficient < 0n
    const digits = (negative ? -coefficient : coefficient).toString()
    const removable = Math.min(scale, digits.length - digits.replace(/0+$/u, "").length)
    if (removable === 0) return new Decimal(coefficient, scale)
    const normalized = BigInt(digits.slice(0, -removable)) * (negative ? -1n : 1n)
    return new Decimal(normalized, scale - removable)
  }

  add(other: Decimal): Decimal {
    const scale = Math.max(this.scale, other.scale)
    const left = this.coefficient * 10n ** BigInt(scale - this.scale)
    const right = other.coefficient * 10n ** BigInt(scale - other.scale)
    return Decimal.normalize(left + right, scale)
  }

  static sum(values: ReadonlyArray<Decimal>): Decimal {
    if (values.length === 0) return Decimal.zero()
    const scale = values.reduce((maximum, value) => Math.max(maximum, value.scale), 0)
    const coefficient = values.reduce(
      (total, value) => total + value.coefficient * 10n ** BigInt(scale - value.scale),
      0n
    )
    return Decimal.normalize(coefficient, scale)
  }

  subtract(other: Decimal): Decimal {
    return this.add(Decimal.normalize(-other.coefficient, other.scale))
  }

  absolute(): Decimal {
    return this.coefficient < 0n ? Decimal.normalize(-this.coefficient, this.scale) : this
  }

  lessThanOrEqual(other: Decimal): boolean {
    const scale = Math.max(this.scale, other.scale)
    return (
      this.coefficient * 10n ** BigInt(scale - this.scale) <=
      other.coefficient * 10n ** BigInt(scale - other.scale)
    )
  }

  toString(): string {
    if (this.scale === 0) return this.coefficient.toString()
    const negative = this.coefficient < 0n
    const digits = (negative ? -this.coefficient : this.coefficient).toString().padStart(this.scale + 1, "0")
    const split = digits.length - this.scale
    return `${negative ? "-" : ""}${digits.slice(0, split)}.${digits.slice(split)}`
  }
}

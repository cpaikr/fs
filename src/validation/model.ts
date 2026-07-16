export type Dimensions = Readonly<Record<string, string>>

export interface Definition {
  readonly id: string
}

export interface Unit extends Definition {
  readonly defaultTolerance?: string
}

export type Period =
  | (Definition & { readonly kind: "instant"; readonly date: string })
  | (Definition & { readonly kind: "duration"; readonly start: string; readonly end: string })

export interface Dimension extends Definition {
  readonly members: ReadonlyArray<Definition>
}

export interface Coordinate {
  readonly item: string
  readonly period: string
  readonly unit: string
  readonly dimensions?: Dimensions
}

export interface Fact extends Coordinate {
  readonly value?: string
  readonly unavailable?: true
}

export interface ItemTerm {
  readonly coefficient: string
  readonly item: string
}

export interface FactTerm {
  readonly coefficient: string
  readonly fact: Coordinate
}

export interface RuleScope {
  readonly periods: ReadonlyArray<string>
  readonly dimensions?: ReadonlyArray<Dimensions>
}

export type CalculationRule =
  | {
      readonly id: string
      readonly kind: "samePeriod"
      readonly unit: string
      readonly target: { readonly item: string }
      readonly terms: ReadonlyArray<ItemTerm>
      readonly scope: RuleScope
      readonly tolerance?: string
    }
  | {
      readonly id: string
      readonly kind: "rollForward"
      readonly unit: string
      readonly balance: { readonly item: string }
      readonly movements: ReadonlyArray<ItemTerm>
      readonly scope: RuleScope
      readonly tolerance?: string
    }
  | {
      readonly id: string
      readonly kind: "assertion"
      readonly target: Coordinate
      readonly terms: ReadonlyArray<FactTerm>
      readonly tolerance?: string
    }

export interface Statement {
  readonly id: string
  readonly unit: string
  readonly periods: ReadonlyArray<string>
  readonly dimensions?: ReadonlyArray<{
    readonly dimension: string
    readonly members: ReadonlyArray<string>
  }>
  readonly entries: ReadonlyArray<
    | { readonly type: "heading"; readonly label: string }
    | { readonly type: "item"; readonly item: string }
  >
}

export interface ApplicationKey {
  readonly rule: string
  readonly period: string
  readonly dimensions: Dimensions
}

export type ApplicationResult =
  | {
      readonly key: ApplicationKey
      readonly status: "satisfied" | "unsatisfied"
      readonly actual: string
      readonly expected: string
      readonly difference: string
      readonly tolerance: string
    }
  | {
      readonly key: ApplicationKey
      readonly status: "error"
      readonly reason: "missing-fact" | "unavailable-fact"
      readonly coordinate: Required<Coordinate>
    }
  | {
      readonly key: ApplicationKey
      readonly status: "error"
      readonly reason: "missing-boundary-period"
      readonly boundary: "opening" | "closing"
      readonly date: string
    }
  | {
      readonly key: ApplicationKey
      readonly status: "skipped"
      readonly reason: "no-predecessor" | "gap" | "ambiguous-predecessor"
    }

export interface ValidationSnapshot {
  readonly conformance: "conforming" | "nonconforming"
  readonly calculations: "not-run" | "not-defined" | "not-evaluated" | "consistent" | "inconsistent"
  readonly applications: ReadonlyArray<ApplicationResult>
}

export interface Document {
  readonly formatVersion: "0.1"
  readonly items?: ReadonlyArray<Definition>
  readonly units?: ReadonlyArray<Unit>
  readonly periods?: ReadonlyArray<Period>
  readonly dimensions?: ReadonlyArray<Dimension>
  readonly facts?: ReadonlyArray<Fact>
  readonly statements: ReadonlyArray<Statement>
  readonly calculationRules?: ReadonlyArray<CalculationRule>
  readonly validationSnapshot?: ValidationSnapshot
}

export interface Definition {
  readonly id: string
}

export interface Unit extends Definition {
  readonly label: string
  readonly measure: string
  readonly scale: number
  readonly defaultTolerance?: string
}

export type Period =
  | (Definition & { readonly kind: "instant"; readonly date: string })
  | (Definition & { readonly kind: "duration"; readonly start: string; readonly end: string })

export type ValueCell = string | null | { readonly unavailable: true }

export type GroupingCell = string | null

export interface Item extends Definition {
  readonly label: string
  readonly description?: string
  readonly unit: string
  readonly values: Readonly<Record<string, ValueCell>>
  readonly groupings: Readonly<Record<string, GroupingCell>>
  readonly rollupTo?: string
}

export interface Statement extends Definition {
  readonly label: string
  readonly periods: ReadonlyArray<string>
  readonly items: ReadonlyArray<Item>
}

export interface ApplicationKey {
  readonly statement: string
  readonly parent: string
  readonly period: string
}

export interface CellIdentity {
  readonly statement: string
  readonly item: string
  readonly period: string
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
      readonly reason: "missing-value" | "unavailable-value"
      readonly cell: CellIdentity
    }

export type CalculationStatus = "not-run" | "not-defined" | "consistent" | "inconsistent"

export interface ValidationSnapshot {
  readonly conformance: "conforming" | "nonconforming"
  readonly calculations: CalculationStatus
  readonly applications: ReadonlyArray<ApplicationResult>
}

export interface Document {
  readonly formatVersion: "0.1"
  readonly documentId?: string
  readonly entity: { readonly id?: string; readonly name: string }
  readonly scope: { readonly id?: string; readonly label: string }
  readonly units: ReadonlyArray<Unit>
  readonly periods: ReadonlyArray<Period>
  readonly groupingColumns?: ReadonlyArray<string>
  readonly statements: ReadonlyArray<Statement>
  readonly validationSnapshot?: ValidationSnapshot
}

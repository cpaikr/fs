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

interface NumericApplication {
  readonly key: ApplicationKey
  readonly actual: string
  readonly expected: string
  readonly difference: string
  readonly tolerance: string
}

export type SatisfiedApplication = NumericApplication & { readonly status: "satisfied" }
export type UnsatisfiedApplication = NumericApplication & { readonly status: "unsatisfied" }

export type ApplicationResult =
  | SatisfiedApplication
  | UnsatisfiedApplication
  | {
      readonly key: ApplicationKey
      readonly status: "error"
      readonly reason: "missing-value" | "unavailable-value"
      readonly cell: CellIdentity
    }

export type FailedApplication = Exclude<ApplicationResult, SatisfiedApplication>
export type ConsistentApplications = readonly [SatisfiedApplication, ...SatisfiedApplication[]]
declare const inconsistentApplicationsBrand: unique symbol
export type InconsistentApplications = readonly [ApplicationResult, ...ApplicationResult[]] & {
  readonly [inconsistentApplicationsBrand]: true
}

export const inconsistentApplications = (
  applications: ReadonlyArray<ApplicationResult>
): InconsistentApplications | undefined => {
  const [first, ...rest] = applications
  if (
    first === undefined ||
    !applications.some(({ status }) => status === "unsatisfied" || status === "error")
  ) {
    return undefined
  }
  const copied: readonly [ApplicationResult, ...ApplicationResult[]] = [first, ...rest]
  return copied as InconsistentApplications
}

export type CalculationStatus = "not-run" | "not-defined" | "consistent" | "inconsistent"

export type ValidationSnapshot =
  | {
      readonly conformance: "nonconforming"
      readonly calculations: "not-run"
      readonly applications: readonly []
    }
  | {
      readonly conformance: "conforming"
      readonly calculations: "not-defined"
      readonly applications: readonly []
    }
  | {
      readonly conformance: "conforming"
      readonly calculations: "consistent"
      readonly applications: ConsistentApplications
    }
  | {
      readonly conformance: "conforming"
      readonly calculations: "inconsistent"
      readonly applications: InconsistentApplications
    }

export interface Document {
  readonly $schema?: "https://cpaikr.github.io/fs/schema/0.1/fs-document.schema.json"
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

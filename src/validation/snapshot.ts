import { isDeepStrictEqual } from "node:util"

import { Decimal } from "./decimal.js"
import { applicationKey } from "./identity.js"
import type { ApplicationResult, CalculationStatus, ValidationSnapshot } from "./model.js"

export interface ValidationResult {
  readonly formatVersion: "0.1"
  readonly conformance: {
    readonly status: "conforming" | "nonconforming"
    readonly errors: ReadonlyArray<{ readonly code: string; readonly path: string; readonly message: string }>
  }
  readonly calculations: {
    readonly status: CalculationStatus
    readonly applications: ReadonlyArray<ApplicationResult>
  }
}

type ApplicationChange =
  | { readonly change: "unchanged" | "changed"; readonly recorded: ApplicationResult; readonly current: ApplicationResult }
  | { readonly change: "added"; readonly current: ApplicationResult }
  | { readonly change: "removed"; readonly recorded: ApplicationResult }

export type SnapshotDiff =
  | { readonly formatVersion: "0.1"; readonly status: "not-recorded" }
  | { readonly formatVersion: "0.1"; readonly status: "not-comparable"; readonly reason: "invalid-snapshot" }
  | {
      readonly formatVersion: "0.1"
      readonly status: "match" | "mismatch"
      readonly conformance: {
        readonly recorded: "conforming" | "nonconforming"
        readonly current: "conforming" | "nonconforming"
      }
      readonly calculations: { readonly recorded: CalculationStatus; readonly current: CalculationStatus }
      readonly applications: ReadonlyArray<ApplicationChange>
    }

export const isApplicationValid = (application: ApplicationResult): boolean => {
  if (application.status === "error") return true
  try {
    const difference = Decimal.parse(application.actual).subtract(Decimal.parse(application.expected))
    if (difference.toString() !== Decimal.parse(application.difference).toString()) return false
    const satisfied = difference.absolute().lessThanOrEqual(Decimal.parse(application.tolerance))
    return application.status === (satisfied ? "satisfied" : "unsatisfied")
  } catch {
    return false
  }
}

export const isSnapshotValid = (snapshot: ValidationSnapshot): boolean => {
  const keys = snapshot.applications.map((application) => applicationKey(application.key))
  if (new Set(keys).size !== keys.length) return false
  if (!snapshot.applications.every(isApplicationValid)) return false
  if (snapshot.conformance === "nonconforming") {
    return snapshot.calculations === "not-run" && snapshot.applications.length === 0
  }
  if (snapshot.calculations === "not-defined") return snapshot.applications.length === 0
  if (snapshot.calculations === "consistent") {
    return snapshot.applications.length > 0 && snapshot.applications.every(({ status }) => status === "satisfied")
  }
  return (
    snapshot.applications.length > 0 &&
    snapshot.applications.some(({ status }) => status === "unsatisfied" || status === "error")
  )
}

export const compareSnapshot = (
  snapshot: ValidationSnapshot | undefined,
  current: ValidationResult
): SnapshotDiff => {
  if (snapshot === undefined) return { formatVersion: "0.1", status: "not-recorded" }
  if (!isSnapshotValid(snapshot)) {
    return { formatVersion: "0.1", status: "not-comparable", reason: "invalid-snapshot" }
  }

  const remaining = new Map(snapshot.applications.map((application) => [applicationKey(application.key), application]))
  const changes: Array<ApplicationChange> = []
  for (const application of current.calculations.applications) {
    const prior = remaining.get(applicationKey(application.key))
    if (prior === undefined) {
      changes.push({ change: "added", current: application })
      continue
    }
    changes.push({
      change: isDeepStrictEqual(prior, application) ? "unchanged" : "changed",
      recorded: prior,
      current: application
    })
    remaining.delete(applicationKey(application.key))
  }
  for (const application of snapshot.applications) {
    if (remaining.has(applicationKey(application.key))) {
      changes.push({ change: "removed", recorded: application })
    }
  }

  const status =
    snapshot.conformance === current.conformance.status &&
    snapshot.calculations === current.calculations.status &&
    changes.every(({ change }) => change === "unchanged")
      ? "match"
      : "mismatch"
  return {
    formatVersion: "0.1",
    status,
    conformance: { recorded: snapshot.conformance, current: current.conformance.status },
    calculations: { recorded: snapshot.calculations, current: current.calculations.status },
    applications: changes
  }
}

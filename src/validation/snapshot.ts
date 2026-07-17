import { isDeepStrictEqual } from "node:util"

import { Decimal } from "./decimal.js"
import { applicationKey } from "./identity.js"
import type { ApplicationResult, ValidationSnapshot } from "./model.js"

export interface ValidationResult {
  readonly formatVersion: "0.1"
  readonly conformance: {
    readonly status: "conforming" | "nonconforming"
    readonly errors: ReadonlyArray<{ readonly code: string; readonly path: string; readonly message: string }>
  }
  readonly calculations: {
    readonly status: "not-run" | "not-defined" | "not-evaluated" | "consistent" | "inconsistent"
    readonly applications: ReadonlyArray<ApplicationResult>
  }
}

export type SnapshotDiff =
  | { readonly formatVersion: "0.1"; readonly status: "not-recorded" }
  | { readonly formatVersion: "0.1"; readonly status: "not-comparable"; readonly reason: "invalid-snapshot" }
  | {
      readonly formatVersion: "0.1"
      readonly status: "match" | "mismatch"
      readonly conformance: { readonly recorded: string; readonly current: string }
      readonly calculations: { readonly recorded: string; readonly current: string }
      readonly applications: ReadonlyArray<
        | { readonly change: "unchanged" | "changed"; readonly recorded: ApplicationResult; readonly current: ApplicationResult }
        | { readonly change: "added"; readonly current: ApplicationResult }
        | { readonly change: "removed"; readonly recorded: ApplicationResult }
      >
    }

const isApplicationValid = (application: ApplicationResult): boolean => {
  if (application.status !== "satisfied" && application.status !== "unsatisfied") return true
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
  if (snapshot.calculations === "not-run") return false
  if (snapshot.calculations === "not-defined") return snapshot.applications.length === 0
  if (snapshot.calculations === "not-evaluated") {
    return snapshot.applications.length > 0 && snapshot.applications.every((result) => result.status === "skipped")
  }
  if (snapshot.calculations === "consistent") {
    return (
      snapshot.applications.some((result) => result.status === "satisfied") &&
      snapshot.applications.every((result) => result.status === "satisfied" || result.status === "skipped")
    )
  }
  return snapshot.applications.some((result) => result.status === "unsatisfied" || result.status === "error")
}

export const compareSnapshot = (
  snapshot: ValidationSnapshot | undefined,
  current: ValidationResult
): SnapshotDiff => {
  if (snapshot === undefined) return { formatVersion: "0.1", status: "not-recorded" }
  if (!isSnapshotValid(snapshot)) {
    return { formatVersion: "0.1", status: "not-comparable", reason: "invalid-snapshot" }
  }

  const recorded = new Map(snapshot.applications.map((result) => [applicationKey(result.key), result]))
  const changes: Array<
    | { readonly change: "unchanged" | "changed"; readonly recorded: ApplicationResult; readonly current: ApplicationResult }
    | { readonly change: "added"; readonly current: ApplicationResult }
    | { readonly change: "removed"; readonly recorded: ApplicationResult }
  > = []
  for (const application of current.calculations.applications) {
    const key = applicationKey(application.key)
    const prior = recorded.get(key)
    if (prior === undefined) {
      changes.push({ change: "added", current: application })
    } else {
      changes.push({
        change: isDeepStrictEqual(prior, application) ? "unchanged" : "changed",
        recorded: prior,
        current: application
      })
      recorded.delete(key)
    }
  }
  for (const application of snapshot.applications) {
    if (recorded.has(applicationKey(application.key))) changes.push({ change: "removed", recorded: application })
  }

  const status =
    snapshot.conformance === current.conformance.status &&
    snapshot.calculations === current.calculations.status &&
    changes.every((change) => change.change === "unchanged")
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

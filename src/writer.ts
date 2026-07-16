import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  openSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs"
import { randomBytes } from "node:crypto"
import { basename, dirname, join } from "node:path"

export type WriteFailure = "output-exists" | "output-parent-not-found" | "write-failed"

const errorCode = (error: unknown): string | undefined =>
  typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined

const closeWithoutMasking = (descriptor: number | null): void => {
  if (descriptor === null) return
  try {
    closeSync(descriptor)
  } catch {
    // The write outcome remains authoritative; cleanup faults are handled by
    // the filesystem-state checks and never reclassified as output-exists.
  }
}

const unlinkWithoutMasking = (path: string): void => {
  try {
    unlinkSync(path)
  } catch {
    // Best-effort cleanup is followed by a bounded write-failed outcome.
  }
}

export const writeNewFile = (path: string, bytes: Buffer): WriteFailure | null => {
  if (existsSync(path)) return "output-exists"
  const parent = dirname(path)
  try {
    if (!statSync(parent).isDirectory()) return "output-parent-not-found"
  } catch {
    return "output-parent-not-found"
  }

  const temporary = join(parent, `.${basename(path)}.fs-${randomBytes(8).toString("hex")}.tmp`)
  let descriptor: number | null = null
  try {
    descriptor = openSync(temporary, "wx", 0o600)
    writeFileSync(descriptor, bytes)
    fsyncSync(descriptor)
    closeSync(descriptor)
    descriptor = null
  } catch {
    closeWithoutMasking(descriptor)
    unlinkWithoutMasking(temporary)
    return "write-failed"
  }

  try {
    linkSync(temporary, path)
  } catch (error) {
    unlinkWithoutMasking(temporary)
    return errorCode(error) === "EEXIST" ? "output-exists" : "write-failed"
  }

  try {
    unlinkSync(temporary)
    return null
  } catch {
    // Roll back the committed name if cleanup fails so a reported failure does
    // not intentionally leave a successful-looking destination behind.
    unlinkWithoutMasking(path)
    unlinkWithoutMasking(temporary)
    return "write-failed"
  }
}

import {
  closeSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs"
import { randomBytes } from "node:crypto"
import { basename, dirname, join } from "node:path"

export type WriteFailure = "output-exists" | "output-parent-not-found" | "write-failed"

export interface WriterServices {
  readonly exists: (path: string) => boolean
  readonly isDirectory: (path: string) => boolean
  readonly openExclusive: (path: string) => number
  readonly write: (descriptor: number, bytes: Buffer) => void
  readonly sync: (descriptor: number) => void
  readonly close: (descriptor: number) => void
  readonly link: (source: string, destination: string) => void
  readonly unlink: (path: string) => void
  readonly suffix: () => string
}

export const outputEntryExists = (path: string): boolean => {
  try {
    lstatSync(path)
    return true
  } catch (error) {
    if (errorCode(error) === "ENOENT") return false
    throw error
  }
}

export const nodeWriterServices: WriterServices = {
  exists: outputEntryExists,
  isDirectory: (path) => statSync(path).isDirectory(),
  openExclusive: (path) => openSync(path, "wx", 0o600),
  write: writeFileSync,
  sync: fsyncSync,
  close: closeSync,
  link: linkSync,
  unlink: unlinkSync,
  suffix: () => randomBytes(8).toString("hex")
}

const errorCode = (error: unknown): string | undefined =>
  typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined

const closeWithoutMasking = (descriptor: number | null, services: WriterServices): void => {
  if (descriptor === null) return
  try {
    services.close(descriptor)
  } catch {
    // The primary write outcome remains authoritative.
  }
}

const unlinkWithoutMasking = (path: string, services: WriterServices): void => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      services.unlink(path)
      return
    } catch {
      // Retry transient close/antivirus races before preserving the primary
      // operation outcome.
    }
  }
}

export const writeNewFile = (
  path: string,
  bytes: Buffer,
  services: WriterServices = nodeWriterServices
): WriteFailure | null => {
  try {
    if (services.exists(path)) return "output-exists"
  } catch {
    return "write-failed"
  }
  const parent = dirname(path)
  try {
    if (!services.isDirectory(parent)) return "output-parent-not-found"
  } catch (error) {
    const code = errorCode(error)
    return code === "ENOENT" || code === "ENOTDIR" ? "output-parent-not-found" : "write-failed"
  }

  const temporary = join(parent, `.${basename(path)}.fs-${services.suffix()}.tmp`)
  let descriptor: number | null = null
  try {
    descriptor = services.openExclusive(temporary)
    services.write(descriptor, bytes)
    services.sync(descriptor)
    services.close(descriptor)
    descriptor = null
  } catch {
    closeWithoutMasking(descriptor, services)
    unlinkWithoutMasking(temporary, services)
    return "write-failed"
  }

  try {
    services.link(temporary, path)
  } catch (error) {
    unlinkWithoutMasking(temporary, services)
    return errorCode(error) === "EEXIST" ? "output-exists" : "write-failed"
  }

  // Once the hard link succeeds, the destination is a synced, exact copy and
  // the operation has committed. Cleanup must not turn that success into a
  // reported failure or attempt to remove a destination another process can
  // already observe. A persistent unlink fault can retain only the complete,
  // private-mode temporary hard link; it cannot expose a partial destination.
  unlinkWithoutMasking(temporary, services)
  return null
}

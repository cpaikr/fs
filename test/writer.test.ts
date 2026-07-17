import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { outputEntryExists, writeNewFile, type WriterServices } from "../src/writer.js"

interface FakeOptions {
  readonly failure?:
    | "parent"
    | "open"
    | "write"
    | "sync"
    | "close"
    | "link"
    | "race"
    | "cleanup"
    | "cleanup-persistent"
  readonly parentCode?: string
}

const fakeWriter = (options: FakeOptions = {}) => {
  const paths = new Set<string>()
  const calls: Array<string> = []
  let cleanupFailures = 0
  const services: WriterServices = {
    exists: (path) => paths.has(path),
    isDirectory: () => {
      if (options.failure === "parent") {
        throw Object.assign(new Error("parent inspection failed"), { code: options.parentCode })
      }
      return true
    },
    openExclusive: (path) => {
      calls.push(`open:${path}`)
      if (options.failure === "open") throw new Error("open failed")
      if (paths.has(path)) throw Object.assign(new Error("temporary exists"), { code: "EEXIST" })
      paths.add(path)
      return 7
    },
    write: () => {
      calls.push("write")
      if (options.failure === "write") throw new Error("interrupted write")
    },
    sync: () => {
      calls.push("sync")
      if (options.failure === "sync") throw new Error("sync failed")
    },
    close: () => {
      calls.push("close")
      if (options.failure === "close") throw new Error("close failed")
    },
    link: (source, destination) => {
      calls.push(`link:${source}:${destination}`)
      if (options.failure === "race") throw Object.assign(new Error("race"), { code: "EEXIST" })
      if (options.failure === "link") throw Object.assign(new Error("link failed"), { code: "EIO" })
      paths.add(destination)
    },
    unlink: (path) => {
      calls.push(`unlink:${path}`)
      if (
        path.includes(".tmp") &&
        (options.failure === "cleanup-persistent" ||
          (options.failure === "cleanup" && cleanupFailures < 1))
      ) {
        cleanupFailures += 1
        throw new Error("cleanup fault")
      }
      paths.delete(path)
    },
    suffix: () => "fixed"
  }
  return { services, paths, calls }
}

describe("atomic no-replace writer", () => {
  it("writes exact bytes and refuses a later overwrite", () => {
    const root = mkdtempSync(join(tmpdir(), "fs-writer-"))
    const path = join(root, "result.json")
    try {
      expect(writeNewFile(path, Buffer.from(" exact\n"))).toBeNull()
      expect(readFileSync(path)).toEqual(Buffer.from(" exact\n"))
      expect(writeNewFile(path, Buffer.from("different"))).toBe("output-exists")
      expect(readFileSync(path)).toEqual(Buffer.from(" exact\n"))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it("treats a path below a non-directory parent as absent until write", () => {
    const root = mkdtempSync(join(tmpdir(), "fs-writer-"))
    const parent = join(root, "parent")
    const destination = join(parent, "result.json")
    writeFileSync(parent, "not a directory")
    try {
      expect(outputEntryExists(destination)).toBe(false)
      expect(writeNewFile(destination, Buffer.from("x"))).toBe("output-parent-not-found")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it("uses a bounded temporary name and preserves collisions it does not own", () => {
    const fake = fakeWriter()
    const parent = join("work")
    const destination = join(parent, "a".repeat(255))
    const temporary = join(parent, ".fs-fixed.tmp")
    fake.paths.add(temporary)

    expect(writeNewFile(destination, Buffer.from("x"), fake.services)).toBe("write-failed")
    expect(fake.paths.has(temporary)).toBe(true)
    expect(fake.calls).toEqual([`open:${temporary}`])

    const available = fakeWriter()
    expect(writeNewFile(destination, Buffer.from("x"), available.services)).toBeNull()
    expect(available.calls[0]).toBe(`open:${temporary}`)
  })

  it("maps temporary-name generation failures without throwing", () => {
    const fake = fakeWriter()
    const services: WriterServices = {
      ...fake.services,
      suffix: () => {
        throw new Error("random source unavailable")
      }
    }

    expect(writeNewFile("/work/result.json", Buffer.from("x"), services)).toBe("write-failed")
    expect(fake.calls).toEqual([])
  })

  it.each(["open", "write", "sync", "close"] as const)(
    "fails closed when %s fails before commit",
    (failure) => {
      const fake = fakeWriter({ failure })

      expect(writeNewFile("/work/result.json", Buffer.from("x"), fake.services)).toBe("write-failed")
      expect([...fake.paths]).toEqual([])
      expect(fake.calls.some((call) => call.startsWith("link:"))).toBe(false)
    }
  )

  it("reports a commit race without replacing or leaking the temporary", () => {
    const fake = fakeWriter({ failure: "race" })

    expect(writeNewFile("/work/result.json", Buffer.from("x"), fake.services)).toBe("output-exists")
    expect([...fake.paths]).toEqual([])
  })

  it("reports a non-race commit fault without creating the destination", () => {
    const fake = fakeWriter({ failure: "link" })

    expect(writeNewFile("/work/result.json", Buffer.from("x"), fake.services)).toBe("write-failed")
    expect([...fake.paths]).toEqual([])
  })

  it("keeps a committed destination successful when temporary cleanup fails", () => {
    const fake = fakeWriter({ failure: "cleanup" })

    expect(writeNewFile("/work/result.json", Buffer.from("x"), fake.services)).toBeNull()
    expect(fake.paths.has("/work/result.json")).toBe(true)
    expect([...fake.paths]).toEqual(["/work/result.json"])
  })

  it("does not retract a committed destination after a persistent cleanup fault", () => {
    const fake = fakeWriter({ failure: "cleanup-persistent" })

    expect(writeNewFile("/work/result.json", Buffer.from("x"), fake.services)).toBeNull()
    expect(fake.paths.has("/work/result.json")).toBe(true)
    expect([...fake.paths].filter((path) => path.endsWith(".tmp"))).toHaveLength(1)
  })

  it.each([
    ["ENOENT", "output-parent-not-found"],
    ["ENOTDIR", "output-parent-not-found"],
    ["EACCES", "write-failed"],
    ["EIO", "write-failed"]
  ] as const)("maps parent inspection %s to %s", (parentCode, expected) => {
    const fake = fakeWriter({ failure: "parent", parentCode })

    expect(writeNewFile("/work/result.json", Buffer.from("x"), fake.services)).toBe(expected)
    expect(fake.calls).toEqual([])
  })
})

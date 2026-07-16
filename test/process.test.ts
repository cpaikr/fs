import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { execute } from "../src/process.js"

describe("process boundary", () => {
  it("reports deterministic discovery without arguments", () => {
    const result = execute([])

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toEqual(Buffer.alloc(0))
    expect(JSON.parse(result.stdout.toString("utf8"))).toEqual(
      JSON.parse(readFileSync(resolve("fixtures/cli/expected/discovery.json"), "utf8"))
    )
  })

  it("returns exact root help bytes", () => {
    const result = execute(["--help"])

    expect(result).toEqual({
      stdout: readFileSync(resolve("assets/help/fs.md")),
      stderr: Buffer.alloc(0),
      exitCode: 0
    })
  })

  it("rejects command-local options before the command", () => {
    const result = execute(["--version", "0.1", "schema", "document"])

    expect(result.exitCode).toBe(2)
    expect(JSON.parse(result.stdout.toString("utf8"))).toMatchObject({
      error: { operation: "fs", code: "unknown-flag" }
    })
  })

  it("does not read stdin before grammar succeeds", () => {
    const result = execute(["schema", "document", "extra", "-"], {
      cwd: process.cwd(),
      readStdin: () => {
        throw new Error("stdin should not be read")
      }
    })

    expect(result.exitCode).toBe(2)
    expect(JSON.parse(result.stdout.toString("utf8"))).toMatchObject({
      error: { operation: "schema", code: "unexpected-argument" }
    })
  })

  it.each([
    ["validate", ["validate", "-", "--format", "json"]],
    ["create", ["create", "-", "--output", "result.json"]]
  ] as const)("reads stdin exactly once for %s", (_name, args) => {
    const root = mkdtempSync(join(tmpdir(), "fs-process-"))
    let reads = 0
    try {
      const result = execute(args, {
        cwd: root,
        readStdin: () => {
          reads += 1
          return readFileSync(resolve("examples/minimal.json"))
        }
      })

      expect(result.exitCode).toBe(0)
      expect(reads).toBe(1)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it("checks an existing create destination before reading stdin", () => {
    const root = mkdtempSync(join(tmpdir(), "fs-process-"))
    writeFileSync(join(root, "result.json"), "existing")
    try {
      const result = execute(["create", "-", "--output", "result.json"], {
        cwd: root,
        readStdin: () => {
          throw new Error("stdin should not be read")
        }
      })

      expect(result.exitCode).toBe(1)
      expect(JSON.parse(result.stdout.toString("utf8"))).toMatchObject({
        error: { operation: "create", code: "output-exists" }
      })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it("treats a dangling destination symlink as existing before reading the candidate", () => {
    const root = mkdtempSync(join(tmpdir(), "fs-process-"))
    symlinkSync("missing-target.json", join(root, "result.json"), "file")
    try {
      const result = execute(["create", "-", "--output", "result.json"], {
        cwd: root,
        readStdin: () => {
          throw new Error("stdin should not be read")
        }
      })

      expect(result.exitCode).toBe(1)
      expect(JSON.parse(result.stdout.toString("utf8"))).toMatchObject({
        error: { operation: "create", code: "output-exists" }
      })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it.each([
    ["omitted", []],
    ["none", ["--log-level", "none"]],
    ["all", ["--log-level", "all"]]
  ] as const)("preserves create I/O order with %s logging", (_name, loggingArgs) => {
    const calls: Array<string> = []
    const result = execute(["create", "-", "--output", "result.json", ...loggingArgs], {
      cwd: process.cwd(),
      outputExists: () => false,
      readStdin: () => {
        calls.push("read")
        return readFileSync(resolve("examples/minimal.json"))
      },
      writeFile: () => {
        calls.push("write")
        return null
      }
    })

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toEqual(Buffer.alloc(0))
    expect(calls).toEqual(["read", "write"])
  })

  it("normalizes the all logging alias before validation executes", () => {
    let reads = 0
    const result = execute(["validate", "-", "--log-level", "all"], {
      cwd: process.cwd(),
      readStdin: () => {
        reads += 1
        return readFileSync(resolve("examples/minimal.json"))
      }
    })

    expect(result.exitCode).toBe(0)
    expect(reads).toBe(1)
    expect(result.stderr.toString("utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line).level)).toEqual([
      "debug",
      "info"
    ])
  })
})

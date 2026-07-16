import { readFileSync } from "node:fs"
import { resolve } from "node:path"

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
})

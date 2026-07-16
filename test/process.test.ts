import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { execute } from "../src/process.js"

describe("process boundary", () => {
  it("reports deterministic discovery without arguments", () => {
    const result = execute([])

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe("")
    expect(JSON.parse(result.stdout)).toEqual(
      JSON.parse(readFileSync(resolve("fixtures/cli/expected/discovery.json"), "utf8"))
    )
  })

  it("returns exact root help bytes", () => {
    const result = execute(["--help"])

    expect(result).toEqual({
      stdout: readFileSync(resolve("assets/help/fs.md"), "utf8"),
      stderr: "",
      exitCode: 0
    })
  })
})

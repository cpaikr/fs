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

  it("does not enter input or output boundaries before grammar succeeds", () => {
    const calls: Array<string> = []
    const context = {
      cwd: process.cwd(),
      readStdin: () => {
        calls.push("read")
        return Buffer.alloc(0)
      },
      outputExists: () => {
        calls.push("exists")
        return false
      },
      writeFile: () => {
        calls.push("write")
        return null
      }
    } as const

    const validate = execute(["validate", "-", "extra"], context)
    const create = execute(["create", "-", "extra", "--output", "result.json"], context)
    const global = execute(["--unknown", "validate", "-"], context)

    expect([validate.exitCode, create.exitCode, global.exitCode]).toEqual([2, 2, 2])
    expect(calls).toEqual([])
  })

  it("retains command context and missing-value errors when strict parsing fails", () => {
    const separate = execute(["--log-level", "debug", "validate", "missing.json", "--unknown"])
    const inline = execute(["--log-level=debug", "validate", "missing.json", "--unknown"])
    for (const result of [separate, inline]) {
      expect(JSON.parse(result.stdout.toString("utf8"))).toMatchObject({
        error: { operation: "validate", code: "unknown-flag" },
        help: [{ executable: "fs", arguments: ["validate", "missing.json", "--format", "json"] }]
      })
    }

    for (const [args, operation] of [
      [["create", "candidate.json", "--output"], "create"],
      [["schema", "document", "--version"], "schema"],
      [["validate", "input.json", "--format"], "validate"],
      [["create", "candidate.json", "--output=", "--help"], "create"],
      [["schema", "document", "--output", "", "--help"], "schema"],
      [["example", "minimal", "--output=", "--help"], "example"]
    ] as const) {
      const result = execute(args)
      expect(JSON.parse(result.stdout.toString("utf8"))).toMatchObject({
        error: { operation, code: "missing-argument" }
      })
    }
    expect(JSON.parse(execute(["--version"]).stdout.toString("utf8"))).toMatchObject({
      error: { operation: "fs", code: "unknown-flag" }
    })
    expect(
      JSON.parse(execute(["validate", "input.json", "--help=true", "--format"]).stdout.toString("utf8"))
    ).toMatchObject({
      error: { operation: "validate", code: "unknown-flag" }
    })
  })

  it.each([
    [["guide", "unknown", "--help"], "guide", "unexpected-argument"],
    [["schema", "unknown", "--help"], "schema", "unknown-schema"],
    [["schema", "document", "--version", "1.0", "--help"], "schema", "unsupported-version"],
    [["example", "unknown", "--help"], "example", "unknown-example"],
    [["validate", "input.json", "extra", "--help"], "validate", "unexpected-argument"],
    [["validate", "input.json", "--format", "toon", "--help"], "validate", "unsupported-format"],
    [["create", "input.json", "extra", "--help"], "create", "unexpected-argument"]
  ] as const)("does not let help mask invalid supplied syntax for %j", (args, operation, code) => {
    const result = execute(args)

    expect(result.exitCode).toBe(2)
    expect(JSON.parse(result.stdout.toString("utf8"))).toMatchObject({ error: { operation, code } })
  })

  it("emits shell-independent argv suggestions for hostile paths", () => {
    const input = "- candidate;echo unsafe"
    const output = "- result;echo unsafe"
    const create = execute(["create", "--", input])
    const example = execute(["example", `--output=${output}`])

    expect(JSON.parse(create.stdout.toString("utf8"))).toMatchObject({
      help: [
        {
          executable: "fs",
          arguments: ["create", "--output", "<new-document>", "--", input]
        }
      ]
    })
    expect(JSON.parse(example.stdout.toString("utf8"))).toMatchObject({
      help: [
        {
          executable: "fs",
          arguments: ["example", "<minimal|manufacturing-group>", `--output=${output}`]
        }
      ]
    })
  })

  it("preserves non-default content names in corrective help", () => {
    const unsupported = execute(["schema", "snapshot-diff", "--version", "1.0"])
    expect(JSON.parse(unsupported.stdout.toString("utf8"))).toMatchObject({
      help: [{ executable: "fs", arguments: ["schema", "snapshot-diff", "--version", "0.1"] }]
    })

    const context = {
      cwd: process.cwd(),
      readStdin: () => Buffer.alloc(0),
      writeFile: () => "write-failed" as const
    }
    const schema = execute(["schema", "validation-result", "--output", "result.json"], context)
    const example = execute(["example", "manufacturing-group", "--output", "result.json"], context)
    expect(JSON.parse(schema.stdout.toString("utf8"))).toMatchObject({
      help: [{ executable: "fs", arguments: ["schema", "validation-result", "--output", "<new-path>"] }]
    })
    expect(JSON.parse(example.stdout.toString("utf8"))).toMatchObject({
      help: [{ executable: "fs", arguments: ["example", "manufacturing-group", "--output", "<new-path>"] }]
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

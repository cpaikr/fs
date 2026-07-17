import { Effect } from "effect"
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { describe, expect, it } from "vitest"

import {
  ApplicationIO,
  ApplicationIOError,
  execute,
  type ApplicationIOService,
  type ApplicationRequest
} from "../src/process.js"
import { outputEntryExists, writeNewFile } from "../src/writer.js"

const makeIO = (
  cwd: string,
  overrides: Partial<ApplicationIOService> = {}
): ApplicationIOService => ({
  cwd,
  readFile: (path) =>
    Effect.try({
      try: () => readFileSync(path),
      catch: (error) => {
        const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
          ? error.code
          : undefined
        return new ApplicationIOError({ operation: "read-file", ...(code === undefined ? {} : { code }) })
      }
    }),
  readStdin: Effect.succeed(Buffer.alloc(0)),
  outputExists: (path) => Effect.sync(() => outputEntryExists(path)),
  writeFile: (path, contents) => Effect.sync(() => writeNewFile(path, contents)),
  ...overrides
})

const run = (
  request: ApplicationRequest,
  io: ApplicationIOService = makeIO(process.cwd())
) => Effect.runSync(execute(request).pipe(Effect.provideService(ApplicationIO, io)))

describe("application process boundary", () => {
  it("reports deterministic discovery without entering I/O", () => {
    const result = run({ command: "fs" })

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toEqual(Buffer.alloc(0))
    expect(JSON.parse(result.stdout.toString("utf8"))).toEqual(
      JSON.parse(readFileSync(resolve("fixtures/cli/expected/discovery.json"), "utf8"))
    )
  })

  it("preserves selected content names in corrective help", () => {
    const io = makeIO(process.cwd(), {
      writeFile: () => Effect.succeed("write-failed")
    })
    const schema = run(
      { command: "schema", name: "validation-result", output: "result.json" },
      io
    )
    const example = run(
      { command: "example", name: "manufacturing-group", output: "result.json" },
      io
    )

    expect(JSON.parse(schema.stdout.toString("utf8"))).toMatchObject({
      help: [{ executable: "fs", arguments: ["schema", "--output", "<new-path>", "validation-result"] }]
    })
    expect(JSON.parse(example.stdout.toString("utf8"))).toMatchObject({
      help: [{ executable: "fs", arguments: ["example", "--output", "<new-path>", "manufacturing-group"] }]
    })
  })

  it.each(["validate", "create"] as const)("reads stdin exactly once for %s", (command) => {
    const root = mkdtempSync(join(tmpdir(), "fs-process-"))
    let reads = 0
    try {
      const io = makeIO(root, {
        readStdin: Effect.sync(() => {
          reads += 1
          return readFileSync(resolve("examples/minimal.json"))
        })
      })
      const result = command === "validate"
        ? run({ command, input: "-", logLevel: "none" }, io)
        : run({ command, input: "-", output: "result.json" }, io)

      expect(result.exitCode).toBe(0)
      expect(reads).toBe(1)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it("checks an existing create destination before reading stdin", () => {
    const calls: Array<string> = []
    const io = makeIO(process.cwd(), {
      readStdin: Effect.sync(() => {
        calls.push("read")
        return Buffer.alloc(0)
      }),
      outputExists: () => Effect.sync(() => {
        calls.push("exists")
        return true
      }),
      writeFile: () => Effect.sync(() => {
        calls.push("write")
        return null
      })
    })

    const result = run({ command: "create", input: "-", output: "result.json" }, io)

    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stdout.toString("utf8"))).toMatchObject({
      error: { operation: "create", code: "output-exists" }
    })
    expect(calls).toEqual(["exists"])
  })

  it("treats a dangling destination symlink as existing before reading the candidate", () => {
    const root = mkdtempSync(join(tmpdir(), "fs-process-"))
    symlinkSync("missing-target.json", join(root, "result.json"), "file")
    try {
      const result = run(
        { command: "create", input: "-", output: "result.json" },
        makeIO(root, { readStdin: Effect.die("stdin should not be read") })
      )

      expect(result.exitCode).toBe(1)
      expect(JSON.parse(result.stdout.toString("utf8"))).toMatchObject({
        error: { operation: "create", code: "output-exists" }
      })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it("preserves create read/write ordering", () => {
    const calls: Array<string> = []
    const result = run(
      { command: "create", input: "-", output: "result.json" },
      makeIO(process.cwd(), {
        outputExists: () => Effect.sync(() => {
          calls.push("exists")
          return false
        }),
        readStdin: Effect.sync(() => {
          calls.push("read")
          return readFileSync(resolve("examples/minimal.json"))
        }),
        writeFile: () => Effect.sync(() => {
          calls.push("write")
          return null
        })
      })
    )

    expect(result.exitCode).toBe(0)
    expect(calls).toEqual(["exists", "read", "write"])
  })

  it("contains unexpected application defects without leaking causes", () => {
    const result = run(
      { command: "validate", input: "secret.json", logLevel: "debug" },
      makeIO(process.cwd(), { readFile: () => Effect.die("sensitive dependency failure") })
    )
    const text = result.stdout.toString("utf8")

    expect(result.exitCode).toBe(1)
    expect(JSON.parse(text)).toMatchObject({
      error: { operation: "validate", code: "internal-error" },
      help: []
    })
    expect(text).not.toContain("sensitive dependency failure")
  })

  it("retains exact bytes when creating from stdin", () => {
    const root = mkdtempSync(join(tmpdir(), "fs-process-"))
    const bytes = readFileSync(resolve("fixtures/raw-input/noncanonical-valid.json"))
    try {
      const result = run(
        { command: "create", input: "-", output: "result.json" },
        makeIO(root, { readStdin: Effect.succeed(bytes) })
      )

      expect(result.exitCode).toBe(0)
      expect(readFileSync(join(root, "result.json"))).toEqual(bytes)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

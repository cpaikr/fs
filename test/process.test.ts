import { Effect } from "effect"
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { describe, expect, it } from "vitest"

import type { ContentWriteRequest, DocumentRequest } from "../src/application.js"
import { executeContentWithIO } from "../src/content.js"
import { inputLimits } from "../src/limits.js"
import { nodeServices } from "../src/node-services.js"
import { runPathless } from "../src/pathless.js"
import {
  ApplicationIO,
  ApplicationIOError,
  execute,
  executeWithIO,
  type ApplicationIOService
} from "../src/process.js"
import { renderLimits } from "../src/render.js"
import type { Document, Item, Period } from "../src/validation/model.js"
import { outputEntryExists, writeNewFile } from "../src/writer.js"
import { exactByteDocument } from "./support/exact-byte-document.js"

const makeIO = (
  cwd: string,
  overrides: Partial<ApplicationIOService> = {}
): ApplicationIOService => ({
  cwd: Effect.succeed(cwd),
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
  request: DocumentRequest,
  io: ApplicationIOService = makeIO(process.cwd())
) => Effect.runSync(executeWithIO(request).pipe(
  Effect.provideService(ApplicationIO, io),
  Effect.provide(nodeServices)
))

const runContent = (
  request: ContentWriteRequest,
  io: ApplicationIOService
) => Effect.runSync(executeContentWithIO(request).pipe(Effect.provideService(ApplicationIO, io)))

const tableDocument = (periodCount: number, itemCount: number): Document => {
  const periods: Array<Period> = []
  const periodIds: Array<string> = []
  const start = Date.UTC(2020, 0, 1)
  for (let index = 0; index < periodCount; index += 1) {
    const id = `p${index}`
    periods.push({
      id,
      kind: "instant",
      date: new Date(start + index * 86_400_000).toISOString().slice(0, 10)
    })
    periodIds.push(id)
  }
  const values = Object.fromEntries(periodIds.map((period) => [period, "1"]))
  const items: Array<Item> = Array.from({ length: itemCount }, (_, index) => ({
    id: `item${index}`,
    label: `Item ${index}`,
    unit: "usd",
    values,
    groupings: {}
  }))
  return {
    formatVersion: "0.1",
    entity: { name: "Process render boundary" },
    scope: { label: "Rendering" },
    units: [{ id: "usd", label: "USD", measure: "USD", scale: 0 }],
    periods,
    statements: [{ id: "statement", label: "Statement", periods: periodIds, items }]
  }
}

describe("application process boundary", () => {
  it("reports deterministic discovery without entering I/O", () => {
    const result = runPathless({ command: "fs" })
    if (result === undefined) throw new Error("Discovery lost its pathless result")

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
    const schema = runContent(
      { command: "schema", name: "validation-result", output: "result.json" },
      io
    )
    const example = runContent(
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

  it("acquires a working directory only for relative paths", () => {
    let cwdCalls = 0
    const unavailable = makeIO(process.cwd(), {
      cwd: Effect.sync(() => {
        cwdCalls += 1
      }).pipe(
        Effect.flatMap(() => Effect.fail(new ApplicationIOError({ operation: "working-directory" })))
      ),
      readFile: () => Effect.succeed(readFileSync(resolve("examples/minimal.json"))),
      readStdin: Effect.succeed(readFileSync(resolve("examples/minimal.json"))),
      outputExists: () => Effect.succeed(false),
      writeFile: () => Effect.succeed(null)
    })

    expect(run({ command: "validate", input: "-", logLevel: "none" }, unavailable).exitCode).toBe(0)
    expect(run({
      command: "validate",
      input: resolve("examples/minimal.json"),
      logLevel: "none"
    }, unavailable).exitCode).toBe(0)
    expect(run({
      command: "create",
      input: "-",
      output: resolve("result.json")
    }, unavailable).exitCode).toBe(0)
    expect(runContent({
      command: "schema",
      name: "document",
      output: resolve("schema.json")
    }, unavailable).exitCode).toBe(0)
    expect(cwdCalls).toBe(0)

    const relative = run({ command: "validate", input: "input.json", logLevel: "none" }, unavailable)
    expect(relative.exitCode).toBe(1)
    expect(JSON.parse(relative.stdout.toString("utf8"))).toMatchObject({
      error: { code: "working-directory-unavailable" },
      help: []
    })
    expect(cwdCalls).toBe(1)
  })

  it("accepts an exact-limit file and rejects its first excess byte", () => {
    const root = mkdtempSync(join(tmpdir(), "fs-input-limit-"))
    const path = join(root, "input.json")
    const runLive = () => Effect.runSync(execute({
      command: "validate",
      input: path,
      logLevel: "none"
    }).pipe(
      Effect.provide(nodeServices)
    ))
    try {
      writeFileSync(path, Buffer.concat([
        Buffer.alloc(inputLimits.bytes - 2, 0x20),
        Buffer.from("{}")
      ]))
      const exact = runLive()
      expect(exact.exitCode).toBe(1)
      expect(JSON.parse(exact.stdout.toString("utf8"))).toMatchObject({
        validation: { conformance: { status: "nonconforming" } }
      })

      writeFileSync(path, Buffer.alloc(inputLimits.bytes + 1, 0x20))
      const excess = runLive()
      expect(JSON.parse(excess.stdout.toString("utf8"))).toMatchObject({
        error: {
          code: "input-limit-exceeded",
          budget: "input-bytes",
          limit: inputLimits.bytes
        }
      })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
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

  it("reads stdin exactly once when recording validation", () => {
    const root = mkdtempSync(join(tmpdir(), "fs-process-"))
    let reads = 0
    try {
      const result = run(
        {
          command: "record-validation",
          input: "-",
          output: "result.json",
          logLevel: "none"
        },
        makeIO(root, {
          readStdin: Effect.sync(() => {
            reads += 1
            return readFileSync(resolve("fixtures/valid/no-rollups.json"))
          })
        })
      )

      expect(result.exitCode).toBe(0)
      expect(reads).toBe(1)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it("refuses to replace an internally contradictory snapshot", () => {
    const calls: Array<string> = []
    const result = run(
      {
        command: "record-validation",
        input: "fixtures/invalid/contradictory-snapshot-application.json",
        output: "recorded.json",
        logLevel: "none"
      },
      makeIO(process.cwd(), {
        outputExists: () => Effect.succeed(false),
        writeFile: () => Effect.sync(() => {
          calls.push("write")
          return null
        })
      })
    )

    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stdout.toString("utf8"))).toMatchObject({
      validation: {
        conformance: {
          status: "nonconforming",
          errors: [
            {
              code: "invalid-value",
              path: "/validationSnapshot/applications/0"
            }
          ]
        },
        calculations: { status: "not-run", applications: [] }
      },
      snapshotDiff: { status: "not-comparable", reason: "invalid-snapshot" },
      output: { status: "not-created", reason: "structural-nonconformance" }
    })
    expect(calls).toEqual([])
  })

  it("reads stdin exactly once when rendering", () => {
    const root = mkdtempSync(join(tmpdir(), "fs-process-"))
    let reads = 0
    try {
      const result = run(
        {
          command: "render",
          input: "-",
          output: "result.html",
          logLevel: "none"
        },
        makeIO(root, {
          readStdin: Effect.sync(() => {
            reads += 1
            return readFileSync(resolve("examples/minimal.json"))
          })
        })
      )

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

  it("checks an existing snapshot destination before reading stdin", () => {
    const calls: Array<string> = []
    const result = run(
      {
        command: "record-validation",
        input: "-",
        output: "result.json",
        logLevel: "none"
      },
      makeIO(process.cwd(), {
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
    )

    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stdout.toString("utf8"))).toMatchObject({
      error: { operation: "record-validation", code: "output-exists" }
    })
    expect(calls).toEqual(["exists"])
  })

  it("checks an existing render destination before reading stdin", () => {
    const calls: Array<string> = []
    const result = run(
      {
        command: "render",
        input: "-",
        output: "result.html",
        logLevel: "none"
      },
      makeIO(process.cwd(), {
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
    )

    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stdout.toString("utf8"))).toMatchObject({
      error: { operation: "render", code: "output-exists" }
    })
    expect(calls).toEqual(["exists"])
  })

  it.each(["record-validation", "render"] as const)(
    "validates input before reporting a non-directory output parent for %s",
    (command) => {
      const root = mkdtempSync(join(tmpdir(), "fs-process-"))
      writeFileSync(join(root, "input.json"), "{")
      writeFileSync(join(root, "parent"), "not a directory")
      try {
        const result = run({
          command,
          input: "input.json",
          output: command === "render" ? "parent/result.html" : "parent/result.json",
          logLevel: "none"
        }, makeIO(root))

        expect(result.exitCode).toBe(1)
        expect(JSON.parse(result.stdout.toString("utf8"))).toMatchObject({
          error: { operation: command, code: "invalid-json", path: "input.json" },
          help: []
        })
      } finally {
        rmSync(root, { recursive: true, force: true })
      }
    }
  )

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

  it("preserves snapshot read, validation, and write ordering", () => {
    const calls: Array<string> = []
    let written: Buffer = Buffer.alloc(0)
    const result = run(
      {
        command: "record-validation",
        input: "-",
        output: "result.json",
        logLevel: "debug"
      },
      makeIO(process.cwd(), {
        outputExists: () => Effect.sync(() => {
          calls.push("exists")
          return false
        }),
        readStdin: Effect.sync(() => {
          calls.push("read")
          return readFileSync(resolve("fixtures/valid/no-rollups.json"))
        }),
        writeFile: (_path, contents) => Effect.sync(() => {
          calls.push("write")
          written = contents
          return null
        })
      })
    )

    expect(result.exitCode).toBe(0)
    expect(calls).toEqual(["exists", "read", "write"])
    expect(written).toEqual(
      readFileSync(resolve("fixtures/cli/expected/record-validation/no-rollups.json"))
    )
  })

  it("preserves render read, validation, and exact write ordering", () => {
    const calls: Array<string> = []
    let written: Buffer = Buffer.alloc(0)
    const result = run(
      {
        command: "render",
        input: "-",
        output: "result.html",
        logLevel: "debug"
      },
      makeIO(process.cwd(), {
        outputExists: () => Effect.sync(() => {
          calls.push("exists")
          return false
        }),
        readStdin: Effect.sync(() => {
          calls.push("read")
          return readFileSync(resolve("examples/minimal.json"))
        }),
        writeFile: (_path, contents) => Effect.sync(() => {
          calls.push("write")
          written = contents
          return null
        })
      })
    )

    expect(result.exitCode).toBe(0)
    expect(calls).toEqual(["exists", "read", "write"])
    expect(written).toEqual(readFileSync(resolve("fixtures/cli/expected/render/minimal.html")))
  })

  it("does not render or write a structurally nonconforming document", () => {
    const calls: Array<string> = []
    const result = run(
      {
        command: "render",
        input: "-",
        output: "result.html",
        logLevel: "none"
      },
      makeIO(process.cwd(), {
        outputExists: () => Effect.sync(() => {
          calls.push("exists")
          return false
        }),
        readStdin: Effect.sync(() => {
          calls.push("read")
          return readFileSync(resolve("fixtures/invalid/unresolved-rollup.json"))
        }),
        writeFile: () => Effect.sync(() => {
          calls.push("write")
          return null
        })
      })
    )

    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stdout.toString("utf8"))).toMatchObject({
      output: { status: "not-created", reason: "structural-nonconformance" }
    })
    expect(calls).toEqual(["exists", "read"])
  })

  it.each([
    [
      "columns",
      () => readFileSync(resolve("fixtures/valid/render-column-limit-exceeded.json"))
    ],
    ["grid-slots", () => Buffer.from(JSON.stringify(tableDocument(99, 1_000)))],
    [
      "html-bytes",
      () => {
        const document = JSON.parse(readFileSync(resolve("examples/minimal.json"), "utf8")) as Document
        return Buffer.from(JSON.stringify({
          ...document,
          entity: { ...document.entity, name: "&".repeat(Math.floor(renderLimits.htmlBytes / 10) + 1) }
        }))
      }
    ]
  ] as const)("reports the %s render limit after validation without writing output", (budget, input) => {
    const calls: Array<string> = []
    const result = run(
      { command: "render", input: "-", output: "result.html", logLevel: "error" },
      makeIO(process.cwd(), {
        outputExists: () => Effect.sync(() => {
          calls.push("exists")
          return false
        }),
        readStdin: Effect.sync(() => {
          calls.push("read")
          return input()
        }),
        writeFile: () => Effect.sync(() => {
          calls.push("write")
          return null
        })
      })
    )

    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stdout.toString("utf8"))).toMatchObject({
      error: { operation: "render", code: "output-limit-exceeded", path: "result.html" },
      help: []
    })
    expect(result.stderr.toString("utf8")).toContain(
      `"code":"output-limit-exceeded","budget":"${budget}"`
    )
    expect(calls).toEqual(["exists", "read"])
  })

  it.each([
    ["columns", () => tableDocument(renderLimits.columns - 1, 1)],
    ["grid-slots", () => tableDocument(99, 999)],
    ["html-bytes", exactByteDocument]
  ] as const)("writes successfully at the exact %s render boundary", (budget, input) => {
    const calls: Array<string> = []
    let written: Buffer<ArrayBufferLike> = Buffer.alloc(0)
    const result = run(
      { command: "render", input: "-", output: "result.html", logLevel: "none" },
      makeIO(process.cwd(), {
        outputExists: () => Effect.sync(() => {
          calls.push("exists")
          return false
        }),
        readStdin: Effect.sync(() => {
          calls.push("read")
          return Buffer.from(JSON.stringify(input()))
        }),
        writeFile: (_path, contents) => Effect.sync(() => {
          calls.push("write")
          written = contents
          return null
        })
      })
    )

    expect(result.exitCode).toBe(0)
    expect(calls).toEqual(["exists", "read", "write"])
    expect(written.length).toBeGreaterThan(0)
    if (budget === "html-bytes") expect(written).toHaveLength(renderLimits.htmlBytes)
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

import { NodeServices } from "@effect/platform-node"
import { Console as EffectConsole, Effect, Layer, Result, Runtime, Sink, Stdio, Stream } from "effect"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { noColorOutput, program } from "../src/cli.js"
import { ApplicationIO, type ApplicationIOService } from "../src/process.js"

interface CliObservation {
  readonly stdout: Buffer
  readonly stderr: Buffer
  readonly exitCode: number
}

const buffer = (value: string | Uint8Array): Buffer =>
  typeof value === "string" ? Buffer.from(value, "utf8") : Buffer.from(value)

const runCli = (
  args: ReadonlyArray<string>,
  io: ApplicationIOService
): CliObservation => {
  const stdout: Array<Buffer> = []
  const stderr: Array<Buffer> = []
  const stdio = Stdio.layerTest({
    args: Effect.succeed(args),
    stdin: Stream.empty,
    stdout: () => Sink.forEach((value: string | Uint8Array) => Effect.sync(() => stdout.push(buffer(value)))),
    stderr: () => Sink.forEach((value: string | Uint8Array) => Effect.sync(() => stderr.push(buffer(value))))
  })
  const captureConsole = new Proxy(console, {
    get(target, property, receiver) {
      if (property === "log") {
        return (...values: ReadonlyArray<unknown>) =>
          stdout.push(Buffer.from(`${values.join(" ")}\n`, "utf8"))
      }
      if (property === "error") {
        return (...values: ReadonlyArray<unknown>) =>
          stderr.push(Buffer.from(`${values.join(" ")}\n`, "utf8"))
      }
      const value = Reflect.get(target, property, receiver) as unknown
      return typeof value === "function" ? value.bind(target) : value
    }
  }) as EffectConsole.Console
  const result = Effect.runSync(
    Effect.result(
      program.pipe(Effect.provide(Layer.mergeAll(
        NodeServices.layer,
        stdio,
        Layer.succeed(EffectConsole.Console, captureConsole),
        noColorOutput,
        Layer.succeed(ApplicationIO, io)
      )))
    )
  )
  return {
    stdout: Buffer.concat(stdout),
    stderr: Buffer.concat(stderr),
    exitCode: Result.isSuccess(result) ? 0 : Runtime.getErrorExitCode(result.failure)
  }
}

const ioWithCalls = (
  calls: Array<string>,
  stdin = readFileSync(resolve("examples/minimal.json")),
  written: Array<Buffer> = []
): ApplicationIOService => ({
  cwd: process.cwd(),
  readFile: (path) => Effect.sync(() => {
    calls.push(`read-file:${path}`)
    return readFileSync(path)
  }),
  readStdin: Effect.sync(() => {
    calls.push("read-stdin")
    return stdin
  }),
  outputExists: () => Effect.sync(() => {
    calls.push("output-exists")
    return false
  }),
  writeFile: (_path, contents) => Effect.sync(() => {
    calls.push("write-file")
    written.push(contents)
    return null
  })
})

describe("Effect CLI boundary", () => {
  it("rejects grammar before application I/O and uses native streams with exit 2", () => {
    const calls: Array<string> = []
    const observed = runCli(["validate", "input.json", "extra.json"], ioWithCalls(calls))

    expect(observed.exitCode).toBe(2)
    expect(observed.stdout.toString("utf8")).toContain("USAGE")
    expect(observed.stdout.toString("utf8")).toContain("fs validate")
    expect(observed.stderr.toString("utf8")).toContain("extra.json")
    expect(calls).toEqual([])
  })

  it("reports a missing guide topic through native help and diagnostics", () => {
    const calls: Array<string> = []
    const observed = runCli(["guide"], ioWithCalls(calls))

    expect(observed.exitCode).toBe(2)
    expect(observed.stdout.toString("utf8")).toContain("fs guide")
    expect(observed.stdout.toString("utf8")).toContain("authoring")
    expect(observed.stderr.toString("utf8")).toContain("topic")
    expect(calls).toEqual([])
  })

  it("lets a native action short-circuit invalid ordinary values without application I/O", () => {
    const calls: Array<string> = []
    const observed = runCli(
      ["create", "--output", "result.json", "candidate.json", "extra.json", "--help"],
      ioWithCalls(calls)
    )

    expect(observed.exitCode).toBe(0)
    expect(observed.stdout.toString("utf8")).toContain("fs create")
    expect(observed.stderr).toEqual(Buffer.alloc(0))
    expect(calls).toEqual([])
  })

  it("keeps generated help ANSI-free through the configured formatter", () => {
    const observed = runCli(["--help"], ioWithCalls([]))

    expect(observed.exitCode).toBe(0)
    expect(observed.stdout.toString("utf8")).toContain("USAGE")
    expect(observed.stdout.toString("utf8")).not.toMatch(
      /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001b\\))/u
    )
  })

  it.each([
    ["omitted", []],
    ["none", ["--log-level", "none"]],
    ["debug", ["--log-level", "debug"]]
  ] as const)("preserves create I/O order with %s logging", (_name, loggingArgs) => {
    const calls: Array<string> = []
    const observed = runCli(
      [...loggingArgs, "create", "--output", "result.json", "-"],
      ioWithCalls(calls)
    )

    expect(observed.exitCode).toBe(0)
    expect(calls).toEqual(["output-exists", "read-stdin", "write-file"])
  })

  it("keeps snapshot results, bytes, and I/O order invariant with logging", () => {
    const observations = [
      [],
      ["--log-level", "none"],
      ["--log-level", "debug"]
    ].map((loggingArgs) => {
      const calls: Array<string> = []
      const written: Array<Buffer> = []
      const observed = runCli(
        [...loggingArgs, "record-validation", "--output", "result.json", "-"],
        ioWithCalls(calls, undefined, written)
      )
      expect(observed.exitCode).toBe(0)
      expect(calls).toEqual(["output-exists", "read-stdin", "write-file"])
      expect(written).toHaveLength(1)
      return { observed, written: written[0] }
    })

    expect(observations[1]?.observed.stdout).toEqual(observations[0]?.observed.stdout)
    expect(observations[2]?.observed.stdout).toEqual(observations[0]?.observed.stdout)
    expect(observations[1]?.written).toEqual(observations[0]?.written)
    expect(observations[2]?.written).toEqual(observations[0]?.written)
    expect(observations[0]?.observed.stderr).toEqual(Buffer.alloc(0))
    expect(observations[1]?.observed.stderr).toEqual(Buffer.alloc(0))
    expect(observations[2]?.observed.stderr.length).toBeGreaterThan(0)
  })

  it("keeps render results, bytes, and I/O order invariant with logging", () => {
    const observations = [
      [],
      ["--log-level", "none"],
      ["--log-level", "debug"]
    ].map((loggingArgs) => {
      const calls: Array<string> = []
      const written: Array<Buffer> = []
      const observed = runCli(
        [...loggingArgs, "render", "--output", "result.html", "-"],
        ioWithCalls(calls, undefined, written)
      )
      expect(observed.exitCode).toBe(0)
      expect(calls).toEqual(["output-exists", "read-stdin", "write-file"])
      expect(written).toHaveLength(1)
      return { observed, written: written[0] }
    })

    expect(observations[1]?.observed.stdout).toEqual(observations[0]?.observed.stdout)
    expect(observations[2]?.observed.stdout).toEqual(observations[0]?.observed.stdout)
    expect(observations[1]?.written).toEqual(observations[0]?.written)
    expect(observations[2]?.written).toEqual(observations[0]?.written)
    expect(observations[0]?.observed.stderr).toEqual(Buffer.alloc(0))
    expect(observations[1]?.observed.stderr).toEqual(Buffer.alloc(0))
    expect(observations[2]?.observed.stderr.length).toBeGreaterThan(0)
  })

  it("normalizes the all logging alias before validation dispatch", () => {
    const calls: Array<string> = []
    const observed = runCli(
      ["--log-level", "all", "validate", "-"],
      ioWithCalls(calls)
    )
    const levels = observed.stderr
      .toString("utf8")
      .trim()
      .split("\n")
      .map((line) => (JSON.parse(line) as { readonly level: string }).level)

    expect(observed.exitCode).toBe(0)
    expect(levels).toEqual(["debug", "info"])
    expect(calls).toEqual(["read-stdin"])
  })

  it("renders an escaped invalid built-in log level through the active command help", () => {
    const calls: Array<string> = []
    const observed = runCli(
      ["--log-level", "verbose", "validate", "input.json"],
      ioWithCalls(calls)
    )

    expect(observed.exitCode).toBe(2)
    expect(observed.stdout.toString("utf8")).toContain("fs validate")
    expect(observed.stderr.toString("utf8")).toContain("verbose")
    expect(calls).toEqual([])
  })
})

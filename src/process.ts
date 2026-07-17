import { Context, Data, Effect, Layer, Result, Stdio, Stream } from "effect"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import {
  authoringGuide,
  exampleAsset,
  schemaAsset,
  type ExampleName,
  type SchemaName
} from "./assets.js"
import { decodeJson } from "./json.js"
import { DiagnosticLogger, type LogLevel } from "./logger.js"
import { recordValidationSnapshot } from "./record-validation.js"
import { renderHtml } from "./render.js"
import type { Document } from "./validation/model.js"
import { compareSnapshot } from "./validation/snapshot.js"
import { validateDocument } from "./validation/validate.js"
import { outputEntryExists, writeNewFile, type WriteFailure } from "./writer.js"

export interface ProcessResult {
  readonly stdout: Buffer
  readonly stderr: Buffer
  readonly exitCode: 0 | 1
}

export interface ApplicationIOService {
  readonly cwd: string
  readonly readFile: (path: string) => Effect.Effect<Buffer, ApplicationIOError>
  readonly readStdin: Effect.Effect<Buffer, ApplicationIOError>
  readonly outputExists: (path: string) => Effect.Effect<boolean, ApplicationIOError>
  readonly writeFile: (path: string, contents: Buffer) => Effect.Effect<WriteFailure | null, ApplicationIOError>
}

export class ApplicationIOError extends Data.TaggedError("ApplicationIOError")<{
  readonly operation: "read-file" | "read-stdin" | "output-exists" | "write-file"
  readonly code?: string
}> {}

const dependencyError = (
  operation: ApplicationIOError["operation"],
  error: unknown
): ApplicationIOError => {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined
  return new ApplicationIOError({ operation, ...(code === undefined ? {} : { code }) })
}

export class ApplicationIO extends Context.Service<ApplicationIO, ApplicationIOService>()(
  "@cpai/fs/ApplicationIO"
) {
  static readonly live = Layer.effect(
    ApplicationIO,
    Effect.gen(function*() {
      const stdio = yield* Stdio.Stdio
      const readStdin = Stream.runCollect(stdio.stdin).pipe(
        Effect.map((chunks) => Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))),
        Effect.mapError((error) => dependencyError("read-stdin", error))
      )
      return {
        cwd: process.cwd(),
        readFile: (path: string) =>
          Effect.try({
            try: () => readFileSync(path),
            catch: (error) => dependencyError("read-file", error)
          }),
        readStdin,
        outputExists: (path: string) =>
          Effect.try({
            try: () => outputEntryExists(path),
            catch: (error) => dependencyError("output-exists", error)
          }),
        writeFile: (path: string, contents: Buffer) =>
          Effect.try({
            try: () => writeNewFile(path, contents),
            catch: (error) => dependencyError("write-file", error)
          })
      }
    })
  )
}

export type ApplicationRequest =
  | { readonly command: "fs" }
  | { readonly command: "guide" }
  | { readonly command: "schema"; readonly name: SchemaName; readonly output?: string }
  | { readonly command: "example"; readonly name: null }
  | { readonly command: "example"; readonly name: ExampleName; readonly output?: string }
  | { readonly command: "validate"; readonly input: string; readonly logLevel: LogLevel }
  | { readonly command: "create"; readonly input: string; readonly output: string }
  | {
      readonly command: "record-validation"
      readonly input: string
      readonly output: string
      readonly logLevel: LogLevel
    }
  | {
      readonly command: "render"
      readonly input: string
      readonly output: string
      readonly logLevel: LogLevel
    }

interface CommandSuggestion {
  readonly executable: "fs"
  readonly arguments: ReadonlyArray<string>
}

const commandSuggestion = (...arguments_: ReadonlyArray<string>): CommandSuggestion => ({
  executable: "fs",
  arguments: arguments_
})

const empty = Buffer.alloc(0)

const jsonResult = (value: unknown, exitCode: 0 | 1, stderr: Buffer = empty): ProcessResult => ({
  stdout: Buffer.from(`${JSON.stringify(value)}\n`, "utf8"),
  stderr,
  exitCode
})

const bytesResult = (stdout: Buffer): ProcessResult => ({ stdout, stderr: empty, exitCode: 0 })

const commandError = (
  operation: ApplicationRequest["command"],
  code: string,
  help: ReadonlyArray<CommandSuggestion>,
  path?: string,
  message = "The requested operation could not be completed.",
  stderr: Buffer = empty
): ProcessResult =>
  jsonResult(
    {
      error: {
        operation,
        code,
        message,
        ...(path === undefined ? {} : { path })
      },
      help
    },
    1,
    stderr
  )

const discovery = {
  executable: "fs",
  package: "@cpai/fs",
  input: null,
  artifact: {
    versions: ["0.1"],
    serializations: ["json"]
  },
  commands: [
    { name: "guide", access: "read" },
    { name: "schema", access: "read-write" },
    { name: "example", access: "read-write" },
    { name: "validate", access: "read" },
    { name: "create", access: "write" },
    { name: "record-validation", access: "write" },
    { name: "render", access: "write" }
  ],
  help: [
    commandSuggestion("guide", "authoring"),
    commandSuggestion("schema", "document"),
    commandSuggestion("example"),
    commandSuggestion("validate", "<document|->"),
    commandSuggestion("render", "--output", "<new-html>", "<document|->")
  ]
} as const

const examples = {
  examples: [
    {
      name: "minimal",
      purpose: "Smallest complete document with no rollups.",
      calculationStatus: "not-defined"
    },
    {
      name: "manufacturing-group",
      purpose: "Representative multi-statement document with a deliberate calculation inconsistency.",
      calculationStatus: "inconsistent"
    }
  ],
  help: [commandSuggestion("example", "minimal"), commandSuggestion("example", "manufacturing-group")]
} as const

const writeFailure = (
  operation: "schema" | "example" | "create" | "record-validation" | "render",
  failure: WriteFailure,
  path: string,
  help: ReadonlyArray<CommandSuggestion>,
  stderr: Buffer = empty
): ProcessResult => commandError(operation, failure, help, path, undefined, stderr)

const runSchema = (
  name: SchemaName,
  output: string | undefined,
  io: ApplicationIOService
): Effect.Effect<ProcessResult> =>
  Effect.gen(function*() {
    const bytes = schemaAsset(name)
    if (output === undefined) return bytesResult(bytes)
    const outcome = yield* Effect.result(io.writeFile(resolve(io.cwd, output), bytes))
    if (Result.isFailure(outcome)) {
      return writeFailure("schema", "write-failed", output, [
        commandSuggestion("schema", "--output", "<new-path>", name)
      ])
    }
    if (outcome.success !== null) {
      return writeFailure("schema", outcome.success, output, [
        commandSuggestion("schema", "--output", "<new-path>", name)
      ])
    }
    return jsonResult({ output: { status: "created", path: output } }, 0)
  })

const runExample = (
  request: Extract<ApplicationRequest, { readonly command: "example" }>,
  io: ApplicationIOService
): Effect.Effect<ProcessResult> =>
  Effect.gen(function*() {
    if (request.name === null) return jsonResult(examples, 0)
    const bytes = exampleAsset(request.name)
    if (request.output === undefined) return bytesResult(bytes)
    const outcome = yield* Effect.result(
      io.writeFile(resolve(io.cwd, request.output), bytes)
    )
    const help = [commandSuggestion("example", "--output", "<new-path>", request.name)]
    if (Result.isFailure(outcome)) return writeFailure("example", "write-failed", request.output, help)
    if (outcome.success !== null) return writeFailure("example", outcome.success, request.output, help)
    return jsonResult({ output: { status: "created", path: request.output } }, 0)
  })

interface ReadInputSuccess {
  readonly ok: true
  readonly bytes: Buffer
  readonly source: "path" | "stdin"
}

const readInput = (
  input: string,
  operation: "validate" | "create" | "record-validation" | "render",
  io: ApplicationIOService
): Effect.Effect<ReadInputSuccess | ProcessResult> =>
  Effect.gen(function*() {
    const outcome = yield* Effect.result(
      input === "-" ? io.readStdin : io.readFile(resolve(io.cwd, input))
    )
    if (Result.isSuccess(outcome)) {
      return { ok: true, bytes: outcome.success, source: input === "-" ? "stdin" : "path" }
    }
    if (input === "-") return commandError(operation, "input-unreadable", [], "-")
    const code = outcome.failure.code === "ENOENT" ? "input-not-found" : "input-unreadable"
    const help = code === "input-not-found"
      ? operation === "validate"
        ? [commandSuggestion("validate", "<existing-document>")]
        : operation === "create"
          ? [commandSuggestion("create", "--output", "<new-document>", "<existing-candidate>")]
          : operation === "record-validation"
            ? [commandSuggestion("record-validation", "--output", "<new-document>", "<existing-document>")]
            : [commandSuggestion("render", "--output", "<new-html>", "<existing-document>")]
      : []
    return commandError(operation, code, help, input)
  })

const validationHelp = (
  input: string,
  validation: ReturnType<typeof validateDocument>
): ReadonlyArray<CommandSuggestion> =>
  validation.validation.conformance.status === "conforming" &&
    (validation.snapshotDiff.status === "not-recorded" || validation.snapshotDiff.status === "mismatch")
    ? [commandSuggestion("record-validation", "--output", "<new-document>", input)]
    : []

const runValidate = (
  input: string,
  logLevel: LogLevel,
  io: ApplicationIOService
): Effect.Effect<ProcessResult> =>
  Effect.gen(function*() {
    const logger = new DiagnosticLogger(logLevel)
    const read = yield* readInput(input, "validate", io)
    if (!("ok" in read)) {
      const error = JSON.parse(read.stdout.toString("utf8")) as { readonly error: { readonly code: string } }
      logger.emit("error", "input-failed", "validate", {
        code: error.error.code,
        source: input === "-" ? "stdin" : "path"
      })
      return { ...read, stderr: logger.bytes() }
    }
    logger.emit("debug", "input-read", "validate", { source: read.source })
    const decoded = decodeJson(read.bytes)
    if (!decoded.ok) {
      logger.emit("error", "input-failed", "validate", { code: "invalid-json", source: read.source })
      return commandError("validate", "invalid-json", [], input, decoded.message, logger.bytes())
    }
    const result = validateDocument(decoded.value)
    logger.emit("info", "validation-completed", "validate", {
      conformance: result.validation.conformance.status,
      calculations: result.validation.calculations.status,
      snapshot: result.snapshotDiff.status
    })
    return jsonResult(
      {
        validation: result.validation,
        snapshotDiff: result.snapshotDiff,
        help: validationHelp(input, result)
      },
      result.validation.conformance.status === "conforming" ? 0 : 1,
      logger.bytes()
    )
  })

const runCreate = (
  input: string,
  output: string,
  io: ApplicationIOService
): Effect.Effect<ProcessResult> =>
  Effect.gen(function*() {
    const destination = resolve(io.cwd, output)
    const outputHelp = [commandSuggestion("create", "--output", "<new-document>", input)]
    const exists = yield* Effect.result(io.outputExists(destination))
    if (Result.isFailure(exists)) return commandError("create", "write-failed", outputHelp, output)
    if (exists.success) return commandError("create", "output-exists", outputHelp, output)

    const read = yield* readInput(input, "create", io)
    if (!("ok" in read)) return read
    const decoded = decodeJson(read.bytes)
    if (!decoded.ok) return commandError("create", "invalid-json", [], input, decoded.message)
    const result = validateDocument(decoded.value)
    if (result.validation.conformance.status === "nonconforming") {
      return jsonResult(
        {
          validation: result.validation,
          snapshotDiff: result.snapshotDiff,
          output: { status: "not-created", path: output, reason: "structural-nonconformance" },
          help: []
        },
        1
      )
    }

    const written = yield* Effect.result(io.writeFile(destination, read.bytes))
    if (Result.isFailure(written)) return writeFailure("create", "write-failed", output, outputHelp)
    if (written.success !== null) return writeFailure("create", written.success, output, outputHelp)
    return jsonResult(
      {
        validation: result.validation,
        snapshotDiff: result.snapshotDiff,
        output: { status: "created", path: output },
        help: []
      },
      0
    )
  })

type DerivedOutputOperation = "record-validation" | "render"

interface GeneratedOutputSuccess {
  readonly ok: true
  readonly bytes: Buffer
  readonly snapshotDiff: ReturnType<typeof validateDocument>["snapshotDiff"]
}

interface GeneratedOutputFailure {
  readonly ok: false
  readonly code: "output-limit-exceeded"
  readonly message: string
  readonly context: Readonly<Record<string, string | number | boolean>>
}

type GeneratedOutput = GeneratedOutputSuccess | GeneratedOutputFailure

const runValidatedOutput = (
  operation: DerivedOutputOperation,
  input: string,
  output: string,
  logLevel: LogLevel,
  io: ApplicationIOService,
  generate: (
    document: Document,
    validation: ReturnType<typeof validateDocument>
  ) => GeneratedOutput
): Effect.Effect<ProcessResult> =>
  Effect.gen(function*() {
    const logger = new DiagnosticLogger(logLevel)
    const destination = resolve(io.cwd, output)
    const outputHelp = [
      commandSuggestion(
        operation,
        "--output",
        operation === "render" ? "<new-html>" : "<new-document>",
        input
      )
    ]
    const exists = yield* Effect.result(io.outputExists(destination))
    if (Result.isFailure(exists)) {
      logger.emit("error", "output-failed", operation, { code: "write-failed" })
      return commandError(
        operation,
        "write-failed",
        outputHelp,
        output,
        undefined,
        logger.bytes()
      )
    }
    if (exists.success) {
      logger.emit("error", "output-failed", operation, { code: "output-exists" })
      return commandError(
        operation,
        "output-exists",
        outputHelp,
        output,
        undefined,
        logger.bytes()
      )
    }

    const read = yield* readInput(input, operation, io)
    if (!("ok" in read)) {
      const error = JSON.parse(read.stdout.toString("utf8")) as { readonly error: { readonly code: string } }
      logger.emit("error", "input-failed", operation, {
        code: error.error.code,
        source: input === "-" ? "stdin" : "path"
      })
      return { ...read, stderr: logger.bytes() }
    }
    logger.emit("debug", "input-read", operation, { source: read.source })
    const decoded = decodeJson(read.bytes)
    if (!decoded.ok) {
      logger.emit("error", "input-failed", operation, {
        code: "invalid-json",
        source: read.source
      })
      return commandError(
        operation,
        "invalid-json",
        [],
        input,
        decoded.message,
        logger.bytes()
      )
    }
    const result = validateDocument(decoded.value)
    logger.emit("info", "validation-completed", operation, {
      conformance: result.validation.conformance.status,
      calculations: result.validation.calculations.status,
      snapshot: result.snapshotDiff.status
    })
    if (result.validation.conformance.status === "nonconforming") {
      return jsonResult(
        {
          validation: result.validation,
          snapshotDiff: result.snapshotDiff,
          output: { status: "not-created", path: output, reason: "structural-nonconformance" },
          help: []
        },
        1,
        logger.bytes()
      )
    }

    const generated = generate(decoded.value as Document, result)
    if (!generated.ok) {
      logger.emit("error", "output-failed", operation, {
        code: generated.code,
        ...generated.context
      })
      return commandError(
        operation,
        generated.code,
        [],
        output,
        generated.message,
        logger.bytes()
      )
    }

    const written = yield* Effect.result(io.writeFile(destination, generated.bytes))
    if (Result.isFailure(written)) {
      logger.emit("error", "output-failed", operation, { code: "write-failed" })
      return writeFailure(
        operation,
        "write-failed",
        output,
        outputHelp,
        logger.bytes()
      )
    }
    if (written.success !== null) {
      logger.emit("error", "output-failed", operation, { code: written.success })
      return writeFailure(
        operation,
        written.success,
        output,
        outputHelp,
        logger.bytes()
      )
    }
    logger.emit("info", "output-created", operation, {})
    return jsonResult(
      {
        validation: result.validation,
        snapshotDiff: generated.snapshotDiff,
        output: { status: "created", path: output },
        help: []
      },
      0,
      logger.bytes()
    )
  })

const runRecordValidation = (
  input: string,
  output: string,
  logLevel: LogLevel,
  io: ApplicationIOService
): Effect.Effect<ProcessResult> =>
  runValidatedOutput("record-validation", input, output, logLevel, io, (document, result) => {
    const recorded = recordValidationSnapshot(document, result.validation)
    return {
      ok: true,
      bytes: recorded.bytes,
      snapshotDiff: compareSnapshot(recorded.document.validationSnapshot, result.validation)
    }
  })

const runRender = (
  input: string,
  output: string,
  logLevel: LogLevel,
  io: ApplicationIOService
): Effect.Effect<ProcessResult> =>
  runValidatedOutput("render", input, output, logLevel, io, (document, result) => {
    const rendered = renderHtml(document)
    if (!rendered.ok) {
      return {
        ok: false,
        code: "output-limit-exceeded",
        message: `Rendered output exceeds the ${rendered.budget} budget of ${rendered.limit}.`,
        context: { budget: rendered.budget, limit: rendered.limit }
      }
    }
    return {
      ok: true,
      bytes: rendered.bytes,
      snapshotDiff: result.snapshotDiff
    }
  })

const run = (request: ApplicationRequest): Effect.Effect<ProcessResult, never, ApplicationIO> =>
  Effect.gen(function*() {
    const io = yield* ApplicationIO
    switch (request.command) {
      case "fs":
        return jsonResult(discovery, 0)
      case "guide":
        return bytesResult(authoringGuide())
      case "schema":
        return yield* runSchema(request.name, request.output, io)
      case "example":
        return yield* runExample(request, io)
      case "validate":
        return yield* runValidate(request.input, request.logLevel, io)
      case "create":
        return yield* runCreate(request.input, request.output, io)
      case "record-validation":
        return yield* runRecordValidation(
          request.input,
          request.output,
          request.logLevel,
          io
        )
      case "render":
        return yield* runRender(
          request.input,
          request.output,
          request.logLevel,
          io
        )
    }
  })

export const execute = (request: ApplicationRequest): Effect.Effect<ProcessResult, never, ApplicationIO> =>
  run(request).pipe(
    Effect.catchDefect(() =>
      Effect.succeed(commandError(request.command, "internal-error", []))
    )
  )

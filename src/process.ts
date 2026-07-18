import { Effect, Result, Stdio } from "effect"
import { isAbsolute, resolve } from "node:path"

import type { ApplicationRequest, DocumentRequest, ProcessResult } from "./application.js"
import {
  ApplicationIO,
  type ApplicationIOError,
  type ApplicationIOService
} from "./io.js"
import { decodeJson } from "./json.js"
import { inputLimitFailure, inputLimits, type InputBudget } from "./limits.js"
import { DiagnosticLogger, type LogLevel } from "./logger.js"
import { recordValidationSnapshot } from "./record-validation.js"
import { renderHtml } from "./render.js"
import { compareSnapshot } from "./validation/snapshot.js"
import {
  validateDocumentBounded,
  type DocumentValidation
} from "./validation/validate.js"
import type { WriteFailure } from "./writer.js"

export { ApplicationIO, ApplicationIOError } from "./io.js"
export type { ApplicationIOService } from "./io.js"
export type { ApplicationRequest, DocumentRequest, ProcessResult } from "./application.js"

interface CommandSuggestion {
  readonly executable: "fs"
  readonly arguments: ReadonlyArray<string>
}

interface OperationalFailure {
  readonly code: string
  readonly path?: string
  readonly message?: string
  readonly budget?: InputBudget
  readonly limit?: number
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

const commandError = (
  operation: ApplicationRequest["command"],
  failure: OperationalFailure,
  help: ReadonlyArray<CommandSuggestion>,
  stderr: Buffer = empty
): ProcessResult =>
  jsonResult(
    {
      error: {
        operation,
        code: failure.code,
        message: failure.message ?? "The requested operation could not be completed.",
        ...(failure.path === undefined ? {} : { path: failure.path }),
        ...(failure.budget === undefined ? {} : { budget: failure.budget }),
        ...(failure.limit === undefined ? {} : { limit: failure.limit })
      },
      help
    },
    1,
    stderr
  )

const writeFailure = (
  operation: "schema" | "example" | "create" | "record-validation" | "render",
  failure: WriteFailure,
  path: string,
  help: ReadonlyArray<CommandSuggestion>,
  stderr: Buffer = empty
): ProcessResult => commandError(operation, { code: failure, path }, help, stderr)

interface ResolvedPaths {
  readonly input?: string
  readonly output?: string
}

const resolvePaths = (
  io: ApplicationIOService,
  input: string | undefined,
  output: string | undefined
): Effect.Effect<ResolvedPaths, ApplicationIOError> =>
  Effect.gen(function*() {
    const requiresWorkingDirectory =
      (input !== undefined && input !== "-" && !isAbsolute(input)) ||
      (output !== undefined && !isAbsolute(output))
    const workingDirectory = requiresWorkingDirectory ? yield* io.cwd : undefined
    return {
      ...(input === undefined || input === "-"
        ? {}
        : { input: isAbsolute(input) ? input : resolve(workingDirectory ?? "", input) }),
      ...(output === undefined
        ? {}
        : { output: isAbsolute(output) ? output : resolve(workingDirectory ?? "", output) })
    }
  })

const cwdFailure = (): OperationalFailure => ({
  code: "working-directory-unavailable",
  message: "The current working directory is unavailable."
})

const resolveOperationPaths = (
  io: ApplicationIOService,
  input: string | undefined,
  output: string | undefined
): Effect.Effect<{ readonly ok: true; readonly paths: ResolvedPaths } | {
  readonly ok: false
  readonly failure: OperationalFailure
}> =>
  Effect.result(resolvePaths(io, input, output)).pipe(
    Effect.map((result) =>
      Result.isSuccess(result)
        ? { ok: true as const, paths: result.success }
        : { ok: false as const, failure: cwdFailure() }
    )
  )

interface ReadInputSuccess {
  readonly ok: true
  readonly bytes: Buffer
  readonly source: "path" | "stdin"
}

interface InputFailure {
  readonly ok: false
  readonly failure: OperationalFailure
  readonly source: "path" | "stdin"
}

const inputNotFoundHelp = (
  operation: "validate" | "create" | "record-validation" | "render"
): ReadonlyArray<CommandSuggestion> =>
  operation === "validate"
    ? [commandSuggestion("validate", "<existing-document>")]
    : operation === "create"
      ? [commandSuggestion("create", "--output", "<new-document>", "<existing-candidate>")]
      : operation === "record-validation"
        ? [commandSuggestion("record-validation", "--output", "<new-document>", "<existing-document>")]
        : [commandSuggestion("render", "--output", "<new-html>", "<existing-document>")]

const readInput = (
  input: string,
  resolvedInput: string | undefined,
  io: ApplicationIOService
): Effect.Effect<ReadInputSuccess | InputFailure, never, Stdio.Stdio> =>
  Effect.gen(function*() {
    const source = input === "-" ? "stdin" : "path"
    const outcome = yield* Effect.result(
      input === "-" ? io.readStdin : io.readFile(resolvedInput ?? input)
    )
    if (Result.isSuccess(outcome)) return { ok: true, bytes: outcome.success, source }
    if (outcome.failure.budget === "input-bytes") {
      const limit = inputLimitFailure("input-bytes", inputLimits.bytes)
      return {
        ok: false,
        source,
        failure: { code: "input-limit-exceeded", path: input, ...limit }
      }
    }
    const code = input !== "-" && outcome.failure.code === "ENOENT"
      ? "input-not-found"
      : "input-unreadable"
    return { ok: false, source, failure: { code, path: input } }
  })

const decodeFailure = (input: string, decoded: Exclude<ReturnType<typeof decodeJson>, { ok: true }>): OperationalFailure =>
  decoded.kind === "input-limit"
    ? { code: "input-limit-exceeded", path: input, ...decoded }
    : { code: "invalid-json", path: input, message: decoded.message }

const validateDecoded = (
  value: unknown,
  jsonValues: number,
  input: string
): { readonly ok: true; readonly result: DocumentValidation } | {
  readonly ok: false
  readonly failure: OperationalFailure
} => {
  const bounded = validateDocumentBounded(value, jsonValues)
  return bounded.ok
    ? { ok: true, result: bounded.result }
    : {
        ok: false,
        failure: { code: "input-limit-exceeded", path: input, ...bounded }
      }
}

const outputPreflight = (
  io: ApplicationIOService,
  destination: string,
  output: string
): Effect.Effect<OperationalFailure | undefined> =>
  Effect.result(io.outputExists(destination)).pipe(
    Effect.map((result) =>
      Result.isFailure(result)
        ? { code: "write-failed", path: output }
        : result.success
          ? { code: "output-exists", path: output }
          : undefined
    )
  )

const validationHelp = (
  input: string,
  validation: DocumentValidation
): ReadonlyArray<CommandSuggestion> =>
  validation.validation.conformance.status === "conforming" &&
    (validation.snapshotDiff.status === "not-recorded" || validation.snapshotDiff.status === "mismatch")
    ? [commandSuggestion("record-validation", "--output", "<new-document>", input)]
    : []

const runValidate = (
  input: string,
  logLevel: LogLevel,
  io: ApplicationIOService
): Effect.Effect<ProcessResult, never, Stdio.Stdio> =>
  Effect.gen(function*() {
    const logger = new DiagnosticLogger(logLevel)
    const resolved = yield* resolveOperationPaths(io, input, undefined)
    if (!resolved.ok) return commandError("validate", resolved.failure, [], logger.bytes())
    const read = yield* readInput(input, resolved.paths.input, io)
    if (!read.ok) {
      logger.emit("error", "input-failed", "validate", {
        code: read.failure.code,
        source: read.source,
        ...(read.failure.budget === undefined ? {} : { budget: read.failure.budget }),
        ...(read.failure.limit === undefined ? {} : { limit: read.failure.limit })
      })
      const help = read.failure.code === "input-not-found" ? inputNotFoundHelp("validate") : []
      return commandError("validate", read.failure, help, logger.bytes())
    }
    logger.emit("debug", "input-read", "validate", { source: read.source })
    const decoded = decodeJson(read.bytes)
    if (!decoded.ok) {
      const failure = decodeFailure(input, decoded)
      logger.emit("error", "input-failed", "validate", {
        code: failure.code,
        source: read.source,
        ...(failure.budget === undefined ? {} : { budget: failure.budget }),
        ...(failure.limit === undefined ? {} : { limit: failure.limit })
      })
      return commandError("validate", failure, [], logger.bytes())
    }
    const validated = validateDecoded(decoded.value, decoded.values, input)
    if (!validated.ok) {
      logger.emit("error", "input-failed", "validate", {
        code: validated.failure.code,
        source: read.source,
        budget: validated.failure.budget ?? "decimal-digits",
        limit: validated.failure.limit ?? inputLimits.decimalDigits
      })
      return commandError("validate", validated.failure, [], logger.bytes())
    }
    const result = validated.result
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
): Effect.Effect<ProcessResult, never, Stdio.Stdio> =>
  Effect.gen(function*() {
    const resolved = yield* resolveOperationPaths(io, input, output)
    if (!resolved.ok) return commandError("create", resolved.failure, [])
    const destination = resolved.paths.output ?? output
    const outputHelp = [commandSuggestion("create", "--output", "<new-document>", input)]
    const preflight = yield* outputPreflight(io, destination, output)
    if (preflight !== undefined) return commandError("create", preflight, outputHelp)

    const read = yield* readInput(input, resolved.paths.input, io)
    if (!read.ok) {
      const help = read.failure.code === "input-not-found" ? inputNotFoundHelp("create") : []
      return commandError("create", read.failure, help)
    }
    const decoded = decodeJson(read.bytes)
    if (!decoded.ok) return commandError("create", decodeFailure(input, decoded), [])
    const validated = validateDecoded(decoded.value, decoded.values, input)
    if (!validated.ok) return commandError("create", validated.failure, [])
    const result = validated.result
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
  readonly snapshotDiff: DocumentValidation["snapshotDiff"]
}

interface GeneratedOutputFailure {
  readonly ok: false
  readonly failure: OperationalFailure
  readonly context: Readonly<Record<string, string | number | boolean>>
}

type GeneratedOutput = GeneratedOutputSuccess | GeneratedOutputFailure

const runValidatedOutput = (
  operation: DerivedOutputOperation,
  input: string,
  output: string,
  logLevel: LogLevel,
  io: ApplicationIOService,
  generate: (validation: Extract<DocumentValidation, { readonly document: object }>) => GeneratedOutput
): Effect.Effect<ProcessResult, never, Stdio.Stdio> =>
  Effect.gen(function*() {
    const logger = new DiagnosticLogger(logLevel)
    const resolved = yield* resolveOperationPaths(io, input, output)
    if (!resolved.ok) return commandError(operation, resolved.failure, [], logger.bytes())
    const destination = resolved.paths.output ?? output
    const outputHelp = [
      commandSuggestion(
        operation,
        "--output",
        operation === "render" ? "<new-html>" : "<new-document>",
        input
      )
    ]
    const preflight = yield* outputPreflight(io, destination, output)
    if (preflight !== undefined) {
      logger.emit("error", "output-failed", operation, { code: preflight.code })
      return commandError(operation, preflight, outputHelp, logger.bytes())
    }

    const read = yield* readInput(input, resolved.paths.input, io)
    if (!read.ok) {
      logger.emit("error", "input-failed", operation, {
        code: read.failure.code,
        source: read.source,
        ...(read.failure.budget === undefined ? {} : { budget: read.failure.budget }),
        ...(read.failure.limit === undefined ? {} : { limit: read.failure.limit })
      })
      const help = read.failure.code === "input-not-found" ? inputNotFoundHelp(operation) : []
      return commandError(operation, read.failure, help, logger.bytes())
    }
    logger.emit("debug", "input-read", operation, { source: read.source })
    const decoded = decodeJson(read.bytes)
    if (!decoded.ok) {
      const failure = decodeFailure(input, decoded)
      logger.emit("error", "input-failed", operation, {
        code: failure.code,
        source: read.source,
        ...(failure.budget === undefined ? {} : { budget: failure.budget }),
        ...(failure.limit === undefined ? {} : { limit: failure.limit })
      })
      return commandError(operation, failure, [], logger.bytes())
    }
    const validated = validateDecoded(decoded.value, decoded.values, input)
    if (!validated.ok) {
      logger.emit("error", "input-failed", operation, {
        code: validated.failure.code,
        source: read.source,
        budget: validated.failure.budget ?? "decimal-digits",
        limit: validated.failure.limit ?? inputLimits.decimalDigits
      })
      return commandError(operation, validated.failure, [], logger.bytes())
    }
    const result = validated.result
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

    if (!("document" in result)) throw new Error("Conforming validation lost its document")
    const generated = generate(result)
    if (!generated.ok) {
      logger.emit("error", "output-failed", operation, {
        code: generated.failure.code,
        ...generated.context
      })
      return commandError(operation, generated.failure, [], logger.bytes())
    }
    const written = yield* Effect.result(io.writeFile(destination, generated.bytes))
    if (Result.isFailure(written)) {
      logger.emit("error", "output-failed", operation, { code: "write-failed" })
      return writeFailure(operation, "write-failed", output, outputHelp, logger.bytes())
    }
    if (written.success !== null) {
      logger.emit("error", "output-failed", operation, { code: written.success })
      return writeFailure(operation, written.success, output, outputHelp, logger.bytes())
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
): Effect.Effect<ProcessResult, never, Stdio.Stdio> =>
  runValidatedOutput("record-validation", input, output, logLevel, io, (result) => {
    const recorded = recordValidationSnapshot(result.document, result.validation)
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
): Effect.Effect<ProcessResult, never, Stdio.Stdio> =>
  runValidatedOutput("render", input, output, logLevel, io, (result) => {
    const rendered = renderHtml(result.document)
    if (!rendered.ok) {
      return {
        ok: false,
        failure: {
          code: "output-limit-exceeded",
          path: output,
          message: `Rendered output exceeds the ${rendered.budget} budget of ${rendered.limit}.`
        },
        context: { budget: rendered.budget, limit: rendered.limit }
      }
    }
    return { ok: true, bytes: rendered.bytes, snapshotDiff: result.snapshotDiff }
  })

const run = (
  request: DocumentRequest
): Effect.Effect<ProcessResult, never, ApplicationIO | Stdio.Stdio> =>
  Effect.gen(function*() {
    const io = yield* ApplicationIO
    switch (request.command) {
      case "validate":
        return yield* runValidate(request.input, request.logLevel, io)
      case "create":
        return yield* runCreate(request.input, request.output, io)
      case "record-validation":
        return yield* runRecordValidation(request.input, request.output, request.logLevel, io)
      case "render":
        return yield* runRender(request.input, request.output, request.logLevel, io)
    }
  })

export const executeWithIO = (
  request: DocumentRequest
): Effect.Effect<ProcessResult, never, ApplicationIO | Stdio.Stdio> =>
  run(request).pipe(
    Effect.catchDefect(() =>
      Effect.succeed(commandError(request.command, { code: "internal-error" }, []))
    )
  )

export const execute = (
  request: DocumentRequest
): Effect.Effect<ProcessResult, never, Stdio.Stdio> =>
  run(request).pipe(
    Effect.provide(ApplicationIO.live),
    Effect.catchDefect(() =>
      Effect.succeed(commandError(request.command, { code: "internal-error" }, []))
    )
  )

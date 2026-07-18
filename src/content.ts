import { Effect, Result } from "effect"
import { isAbsolute, resolve } from "node:path"

import type { ContentWriteRequest, ProcessResult } from "./application.js"
import { exampleAsset, schemaAsset } from "./assets.js"
import { ApplicationIO } from "./io.js"

interface CommandSuggestion {
  readonly executable: "fs"
  readonly arguments: ReadonlyArray<string>
}

const suggestion = (...arguments_: ReadonlyArray<string>): CommandSuggestion => ({
  executable: "fs",
  arguments: arguments_
})

const result = (value: unknown, exitCode: 0 | 1): ProcessResult => ({
  stdout: Buffer.from(`${JSON.stringify(value)}\n`, "utf8"),
  stderr: Buffer.alloc(0),
  exitCode
})

const failure = (
  operation: ContentWriteRequest["command"],
  code: string,
  help: ReadonlyArray<CommandSuggestion>,
  path?: string,
  message = "The requested operation could not be completed."
): ProcessResult =>
  result(
    {
      error: { operation, code, message, ...(path === undefined ? {} : { path }) },
      help
    },
    1
  )

const run = (request: ContentWriteRequest): Effect.Effect<ProcessResult, never, ApplicationIO> =>
  Effect.gen(function*() {
    const io = yield* ApplicationIO
    const output = "output" in request ? request.output : undefined
    if (output === undefined || (request.command === "example" && request.name === null)) {
      throw new Error("Pathless content request escaped the CLI edge")
    }
    const destinationResult = yield* Effect.result(
      isAbsolute(output)
        ? Effect.succeed(output)
        : io.cwd.pipe(Effect.map((cwd) => resolve(cwd, output)))
    )
    if (Result.isFailure(destinationResult)) {
      return failure(
        request.command,
        "working-directory-unavailable",
        [],
        undefined,
        "The current working directory is unavailable."
      )
    }
    const bytes = request.command === "schema"
      ? schemaAsset(request.name)
      : exampleAsset(request.name)
    const help = request.command === "schema"
      ? [suggestion("schema", "--output", "<new-path>", request.name)]
      : [suggestion("example", "--output", "<new-path>", request.name)]
    const written = yield* Effect.result(io.writeFile(destinationResult.success, bytes))
    if (Result.isFailure(written)) {
      return failure(request.command, "write-failed", help, output)
    }
    if (written.success !== null) {
      return failure(request.command, written.success, help, output)
    }
    return result({ output: { status: "created", path: output } }, 0)
  })

export const executeContentWithIO = (
  request: ContentWriteRequest
): Effect.Effect<ProcessResult, never, ApplicationIO> =>
  run(request).pipe(
    Effect.catchDefect(() =>
      Effect.succeed(failure(request.command, "internal-error", []))
    )
  )

export const executeContent = (
  request: ContentWriteRequest
): Effect.Effect<ProcessResult> =>
  run(request).pipe(
    Effect.provide(ApplicationIO.live),
    Effect.catchDefect(() =>
      Effect.succeed(failure(request.command, "internal-error", []))
    )
  )

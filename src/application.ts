import { Context, Effect, Layer, Stdio } from "effect"

import type { ExampleName, SchemaName } from "./assets.js"
import type { LogLevel } from "./logger.js"

export interface ProcessResult {
  readonly stdout: Buffer
  readonly stderr: Buffer
  readonly exitCode: 0 | 1
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

export type ContentWriteRequest = Extract<
  ApplicationRequest,
  { readonly command: "schema" | "example" }
>

export type DocumentRequest = Extract<
  ApplicationRequest,
  { readonly command: "validate" | "create" | "record-validation" | "render" }
>

export interface ApplicationExecutorService {
  readonly execute: (
    request: ApplicationRequest
  ) => Effect.Effect<ProcessResult, never, Stdio.Stdio>
}

export const internalError = (request: ApplicationRequest): ProcessResult => ({
  stdout: Buffer.from(`${JSON.stringify({
    error: {
      operation: request.command,
      code: "internal-error",
      message: "The requested operation could not be completed."
    },
    help: []
  })}\n`, "utf8"),
  stderr: Buffer.alloc(0),
  exitCode: 1
})

const execute = (request: ApplicationRequest): Effect.Effect<ProcessResult, never, Stdio.Stdio> => {
  const loaded = request.command === "schema" || request.command === "example"
    ? Effect.tryPromise({
        try: () => import("./content.js"),
        catch: () => undefined
      }).pipe(Effect.flatMap(({ executeContent }) => executeContent(request)))
    : request.command === "validate" ||
        request.command === "create" ||
        request.command === "record-validation" ||
        request.command === "render"
      ? Effect.tryPromise({
          try: () => import("./process.js"),
          catch: () => undefined
        }).pipe(Effect.flatMap(({ execute: executeDocument }) => executeDocument(request)))
      : Effect.die("Pathless request escaped the CLI edge")
  return loaded.pipe(Effect.catchEager(() => Effect.succeed(internalError(request))))
}

export class ApplicationExecutor extends Context.Service<
  ApplicationExecutor,
  ApplicationExecutorService
>()("@cpai/fs/ApplicationExecutor") {
  static readonly live = Layer.succeed(ApplicationExecutor, { execute })
}

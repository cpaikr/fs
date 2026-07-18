import { Context, Data, Effect, Layer, Stdio, Stream } from "effect"
import { closeSync, openSync, readSync } from "node:fs"

import { inputLimits } from "./limits.js"
import type { WriteFailure } from "./writer.js"
import { outputEntryExists, writeNewFile } from "./writer.js"

export interface ApplicationIOService {
  readonly cwd: Effect.Effect<string, ApplicationIOError>
  readonly readFile: (path: string) => Effect.Effect<Buffer, ApplicationIOError>
  readonly readStdin: Effect.Effect<Buffer, ApplicationIOError, Stdio.Stdio>
  readonly outputExists: (path: string) => Effect.Effect<boolean, ApplicationIOError>
  readonly writeFile: (
    path: string,
    contents: Buffer
  ) => Effect.Effect<WriteFailure | null, ApplicationIOError>
}

type ApplicationIOOperation =
  | "working-directory"
  | "read-file"
  | "read-stdin"
  | "output-exists"
  | "write-file"

export class ApplicationIOError extends Data.TaggedError("ApplicationIOError")<{
  readonly operation: ApplicationIOOperation
  readonly code?: string
  readonly budget?: "input-bytes"
  readonly limit?: number
}> {}

const dependencyError = (
  operation: ApplicationIOOperation,
  error: unknown
): ApplicationIOError => {
  if (error instanceof ApplicationIOError) return error
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : undefined
  return new ApplicationIOError({ operation, ...(code === undefined ? {} : { code }) })
}

const byteLimitError = (operation: "read-file" | "read-stdin"): ApplicationIOError =>
  new ApplicationIOError({
    operation,
    budget: "input-bytes",
    limit: inputLimits.bytes
  })

const readBoundedFile = (path: string): Buffer => {
  const descriptor = openSync(path, "r")
  const chunks: Array<Buffer> = []
  let total = 0
  try {
    while (true) {
      const capacity = Math.min(65_536, inputLimits.bytes - total + 1)
      const chunk = Buffer.allocUnsafe(capacity)
      const count = readSync(descriptor, chunk, 0, capacity, null)
      if (count === 0) return Buffer.concat(chunks, total)
      total += count
      if (total > inputLimits.bytes) throw byteLimitError("read-file")
      chunks.push(Buffer.from(chunk.subarray(0, count)))
    }
  } finally {
    closeSync(descriptor)
  }
}

const readStdin = Effect.gen(function*() {
  const stdio = yield* Stdio.Stdio
  return yield* Stream.runFoldEffect(
    stdio.stdin,
    () => ({ chunks: [] as Array<Buffer>, total: 0 }),
    (state, bytes) => {
      const chunk = Buffer.from(bytes)
      const total = state.total + chunk.length
      if (total > inputLimits.bytes) return Effect.fail(byteLimitError("read-stdin"))
      state.chunks.push(chunk)
      return Effect.succeed({ chunks: state.chunks, total })
    }
  ).pipe(
    Effect.map(({ chunks, total }) => Buffer.concat(chunks, total)),
    Effect.mapError((error) => dependencyError("read-stdin", error))
  )
})

export class ApplicationIO extends Context.Service<ApplicationIO, ApplicationIOService>()(
  "@sjunepark/fs/ApplicationIO"
) {
  static readonly live = Layer.succeed(ApplicationIO, {
    cwd: Effect.try({
      try: () => process.cwd(),
      catch: (error) => dependencyError("working-directory", error)
    }),
    readFile: (path: string) =>
      Effect.try({
        try: () => readBoundedFile(path),
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
  })
}

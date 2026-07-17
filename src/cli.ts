import { Console, Data, Effect, Option, Runtime, Stdio, Stream } from "effect"
import {
  Argument,
  CliError,
  CliOutput,
  Command,
  Flag,
  GlobalFlag
} from "effect/unstable/cli"

import packageMetadata from "../package.json" with { type: "json" }
import { exampleNames, schemaNames, type ExampleName, type SchemaName } from "./assets.js"
import { type LogLevel } from "./logger.js"
import { execute, type ApplicationRequest, type ProcessResult } from "./process.js"

class ReportedExit extends Data.TaggedError("ReportedExit")<{
  readonly exitCode: 1 | 2
}> {
  override readonly [Runtime.errorReported] = false
  override get [Runtime.errorExitCode](): number {
    return this.exitCode
  }
}

const failWithUsage = (
  commandPath: ReadonlyArray<string>,
  error: CliError.NonShowHelpErrors
): Effect.Effect<never, CliError.ShowHelp> =>
  Effect.fail(new CliError.ShowHelp({ commandPath, errors: [error] }))

const writeResult = (result: ProcessResult): Effect.Effect<void, ReportedExit, Stdio.Stdio> =>
  Effect.gen(function*() {
    const stdio = yield* Stdio.Stdio
    yield* Stream.make(result.stdout).pipe(
      Stream.run(stdio.stdout({ endOnDone: false })),
      Effect.mapError(() => new ReportedExit({ exitCode: 1 }))
    )
    yield* Stream.make(result.stderr).pipe(
      Stream.run(stdio.stderr({ endOnDone: false })),
      Effect.mapError(() => new ReportedExit({ exitCode: 1 }))
    )
    if (result.exitCode === 1) return yield* new ReportedExit({ exitCode: 1 })
  })

const dispatch = (request: ApplicationRequest) =>
  Effect.gen(function*() {
    const result = yield* execute(request)
    yield* writeResult(result)
  })

const currentLogLevel: Effect.Effect<LogLevel, never, GlobalFlag.Setting.Identifier<"log-level">> =
  Effect.gen(function*() {
    const selected = yield* GlobalFlag.LogLevel
    return Option.match(selected, {
      onNone: () => "none" as const,
      onSome: (level): LogLevel => {
        switch (level) {
          case "All":
            return "trace"
          case "Trace":
            return "trace"
          case "Debug":
            return "debug"
          case "Info":
            return "info"
          case "Warn":
            return "warn"
          case "Error":
            return "error"
          case "Fatal":
            return "fatal"
          case "None":
            return "none"
        }
      }
    })
  })

const outputFlag = (description: string) =>
  Flag.string("output").pipe(
    Flag.filter(
      (path) => path.length > 0,
      () => "Expected a non-empty output path"
    ),
    Flag.withDescription(description),
    Flag.atMost(1)
  )

const firstOutput = (outputs: ReadonlyArray<string>): string | undefined => outputs[0]

const exactSchemaName = Argument.choice("name", schemaNames).pipe(
  Argument.withDescription(
    "Exactly one bundled schema name: document, validation-result, or snapshot-diff."
  ),
  Argument.variadic(),
  Argument.filter(
    (names) => names.length === 1,
    (names) => `Exactly one schema name is required; received ${names.join(", ") || "none"}`
  ),
  Argument.map((names) => names[0] as SchemaName)
)

const schema = Command.make(
  "schema",
  {
    output: outputFlag("Create the exact schema bytes at this new path."),
    name: exactSchemaName
  },
  ({ name, output }) => {
    const path = firstOutput(output)
    return dispatch({ command: "schema", name, ...(path === undefined ? {} : { output: path }) })
  }
).pipe(Command.withDescription("Read or copy an exact bundled FS JSON Schema."))

const exampleName = Argument.choice("name", exampleNames).pipe(
  Argument.withDescription(
    "Zero or one bundled example name: minimal or manufacturing-group."
  ),
  Argument.variadic(),
  Argument.filter(
    (names) => names.length <= 1,
    (names) => `At most one example name is accepted; received ${names.join(", ")}`
  )
)

const example = Command.make(
  "example",
  {
    output: outputFlag("Create the exact named example bytes at this new path."),
    name: exampleName
  },
  ({ name, output }) =>
    Effect.gen(function*() {
      const path = firstOutput(output)
      const selected = name[0] as ExampleName | undefined
      if (selected === undefined && path !== undefined) {
        return yield* failWithUsage(
          ["fs", "example"],
          new CliError.MissingArgument({ argument: "name" })
        )
      }
      yield* selected === undefined
        ? dispatch({ command: "example", name: null })
        : dispatch({
            command: "example",
            name: selected,
            ...(path === undefined ? {} : { output: path })
          })
    })
).pipe(Command.withDescription("List, read, or copy exact bundled FS examples."))

const exactDocument = Argument.string("document").pipe(
  Argument.filter(
    (path) => path.length > 0,
    () => "Expected a document path or - for standard input"
  ),
  Argument.withDescription("Exactly one document path or - for standard input."),
  Argument.variadic(),
  Argument.filter(
    (paths) => paths.length === 1,
    (paths) => `Exactly one document is required; received ${paths.join(", ") || "none"}`
  ),
  Argument.map((paths) => paths[0] as string)
)

const validate = Command.make(
  "validate",
  { document: exactDocument },
  ({ document }) =>
    Effect.gen(function*() {
      const logLevel = yield* currentLogLevel
      yield* dispatch({ command: "validate", input: document, logLevel })
    })
).pipe(Command.withDescription("Validate one complete FS document without modifying it."))

const exactCandidate = Argument.string("candidate").pipe(
  Argument.filter(
    (path) => path.length > 0,
    () => "Expected a candidate path or - for standard input"
  ),
  Argument.withDescription("Exactly one candidate path or - for standard input."),
  Argument.variadic(),
  Argument.filter(
    (paths) => paths.length === 1,
    (paths) => `Exactly one candidate is required; received ${paths.join(", ") || "none"}`
  ),
  Argument.map((paths) => paths[0] as string)
)

const create = Command.make(
  "create",
  {
    output: outputFlag("Create the validated candidate bytes at this new path."),
    candidate: exactCandidate
  },
  ({ output, candidate }) =>
    Effect.gen(function*() {
      const path = firstOutput(output)
      if (path === undefined) {
        return yield* failWithUsage(
          ["fs", "create"],
          new CliError.MissingOption({ option: "output" })
        )
      }
      yield* dispatch({ command: "create", input: candidate, output: path })
    })
).pipe(Command.withDescription("Validate and atomically copy exact candidate bytes to a new path."))

const recordValidation = Command.make(
  "record-validation",
  {
    output: outputFlag("Create the document with its current validation snapshot at this new path."),
    document: exactDocument
  },
  ({ output, document }) =>
    Effect.gen(function*() {
      const path = firstOutput(output)
      if (path === undefined) {
        return yield* failWithUsage(
          ["fs", "record-validation"],
          new CliError.MissingOption({ option: "output" })
        )
      }
      const logLevel = yield* currentLogLevel
      yield* dispatch({
        command: "record-validation",
        input: document,
        output: path,
        logLevel
      })
    })
).pipe(
  Command.withDescription(
    "Validate and atomically create a document containing its current validation snapshot."
  )
)

const noOperands = Argument.string("operand").pipe(
  Argument.withDescription("No operands are accepted."),
  Argument.variadic(),
  Argument.filter(
    (operands) => operands.length === 0,
    (operands) => `No operands are accepted; received ${operands.join(", ")}`
  )
)

const authoring = Command.make("authoring", { operands: noOperands }, () => dispatch({ command: "guide" })).pipe(
  Command.withDescription("Show the standalone authoring workflow for an author-resolved financial model.")
)

const guide = Command.make("guide", {}, () =>
  failWithUsage(["fs", "guide"], new CliError.MissingArgument({ argument: "topic" }))
).pipe(
  Command.withDescription("Read focused standalone FS guidance."),
  Command.withSubcommands([authoring])
)

const root = Command.make("fs", {}, () => dispatch({ command: "fs" })).pipe(
  Command.withDescription(
    "Inspect, validate, snapshot, and safely create FS documents. Diagnostic logging defaults to none."
  ),
  Command.withSubcommands([guide, schema, example, validate, create, recordValidation])
)

export const noColorOutput = CliOutput.layer(CliOutput.defaultFormatter({ colors: false }))

const runCommand = Command.runWith(root, { version: packageMetadata.version })

export const program = Effect.gen(function*() {
  const stdio = yield* Stdio.Stdio
  const args = yield* stdio.args
  yield* runCommand(args).pipe(
    Effect.catchIf(
      (error): error is CliError.CliError => CliError.isCliError(error),
      (error) =>
        error._tag === "ShowHelp"
          ? Effect.fail(new ReportedExit({ exitCode: 2 }))
          : Effect.gen(function*() {
              yield* runCommand([...args, "--help"]).pipe(Effect.ignore)
              const formatter = yield* CliOutput.Formatter
              yield* Console.error(formatter.formatError(error))
              return yield* new ReportedExit({ exitCode: 2 })
            })
    )
  )
})

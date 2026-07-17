import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import {
  authoringGuide,
  exampleAsset,
  exampleNames,
  helpAsset,
  schemaAsset,
  schemaNames,
  type ExampleName,
  type SchemaName
} from "./assets.js"
import {
  commandHelp,
  commandSuggestion,
  commandSuggestionWithOperand,
  parseArguments,
  type CommandName,
  type CommandSuggestion,
  type LogLevel,
  type UsageFailure
} from "./arguments.js"
import { decodeJson } from "./json.js"
import { DiagnosticLogger } from "./logger.js"
import { validateDocument } from "./validation/validate.js"
import { outputEntryExists, writeNewFile, type WriteFailure } from "./writer.js"

export interface ProcessResult {
  readonly stdout: Buffer
  readonly stderr: Buffer
  readonly exitCode: 0 | 1 | 2
}

export interface ProcessContext {
  readonly cwd: string
  readonly readStdin: () => Buffer
  readonly outputExists?: (path: string) => boolean
  readonly writeFile?: typeof writeNewFile
}

const empty = Buffer.alloc(0)

const jsonResult = (value: unknown, exitCode: 0 | 1 | 2, stderr: Buffer = empty): ProcessResult => ({
  stdout: Buffer.from(`${JSON.stringify(value)}\n`, "utf8"),
  stderr,
  exitCode
})

const bytesResult = (stdout: Buffer): ProcessResult => ({ stdout, stderr: empty, exitCode: 0 })

const commandError = (
  operation: CommandName | "fs",
  code: string,
  help: ReadonlyArray<CommandSuggestion>,
  exitCode: 1 | 2,
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
    exitCode,
    stderr
  )

const usageFailure = (failure: UsageFailure): ProcessResult =>
  commandError(failure.operation, failure.code, failure.help, 2, undefined, failure.message)

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
    { name: "create", access: "write" }
  ],
  help: [
    commandSuggestion("guide", "authoring"),
    commandSuggestion("schema", "document", "--version", "0.1"),
    commandSuggestion("example"),
    commandSuggestion("validate", "<document|->", "--format", "json")
  ]
} as const

const writeFailure = (
  operation: "schema" | "example" | "create",
  failure: WriteFailure,
  path: string,
  help: ReadonlyArray<CommandSuggestion>
): ProcessResult => commandError(operation, failure, help, 1, path)

const runGuide = (operands: ReadonlyArray<string>, help: boolean): ProcessResult => {
  if (operands.length > 1 || (operands.length === 1 && operands[0] !== "authoring")) {
    return commandError("guide", "unexpected-argument", commandHelp("guide"), 2)
  }
  if (help) return bytesResult(helpAsset(operands[0] === "authoring" ? "guide-authoring" : "guide"))
  if (operands.length === 1 && operands[0] === "authoring") return bytesResult(authoringGuide())
  return commandError("guide", "unexpected-argument", commandHelp("guide"), 2)
}

const runSchema = (
  operands: ReadonlyArray<string>,
  version: string | undefined,
  output: string | undefined,
  help: boolean,
  context: ProcessContext
): ProcessResult => {
  if (operands.length > 1) return commandError("schema", "unexpected-argument", commandHelp("schema"), 2)
  const name = operands[0]
  if (name !== undefined && !schemaNames.some((candidate) => candidate === name)) {
    return commandError("schema", "unknown-schema", commandHelp("schema"), 2)
  }
  if (version !== undefined && version !== "0.1") {
    return commandError(
      "schema",
      "unsupported-version",
      name === undefined
        ? commandHelp("schema")
        : [commandSuggestion("schema", name, "--version", "0.1")],
      2
    )
  }
  if (help) return bytesResult(helpAsset("schema"))
  if (name === undefined) {
    return commandError(
      "schema",
      "missing-argument",
      [commandSuggestion("schema", "<document|validation-result|snapshot-diff>")],
      2
    )
  }
  const bytes = schemaAsset(name as SchemaName)
  if (output === undefined) return bytesResult(bytes)
  const failure = (context.writeFile ?? writeNewFile)(resolve(context.cwd, output), bytes)
  if (failure !== null) {
    return writeFailure("schema", failure, output, [commandSuggestion("schema", name, "--output", "<new-path>")])
  }
  return jsonResult({ output: { status: "created", path: output } }, 0)
}

const examples = {
  examples: [
    {
      name: "minimal",
      purpose: "Smallest complete document with no calculation rules.",
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

const runExample = (
  operands: ReadonlyArray<string>,
  output: string | undefined,
  help: boolean,
  context: ProcessContext
): ProcessResult => {
  if (operands.length > 1) return commandError("example", "unexpected-argument", commandHelp("example"), 2)
  const name = operands[0]
  if (name !== undefined && !exampleNames.some((candidate) => candidate === name)) {
    return commandError("example", "unknown-example", commandHelp("example"), 2)
  }
  if (help) return bytesResult(helpAsset("example"))
  if (operands.length === 0) {
    if (output !== undefined) {
      return commandError(
        "example",
        "missing-argument",
        [commandSuggestion("example", "<minimal|manufacturing-group>", `--output=${output}`)],
        2
      )
    }
    return jsonResult(examples, 0)
  }
  if (name === undefined) throw new Error("Validated example name disappeared")
  const bytes = exampleAsset(name as ExampleName)
  if (output === undefined) return bytesResult(bytes)
  const failure = (context.writeFile ?? writeNewFile)(resolve(context.cwd, output), bytes)
  if (failure !== null) {
    return writeFailure("example", failure, output, [commandSuggestion("example", name, "--output", "<new-path>")])
  }
  return jsonResult({ output: { status: "created", path: output } }, 0)
}

const readInput = (
  input: string,
  operation: "validate" | "create",
  context: ProcessContext
): { readonly ok: true; readonly bytes: Buffer; readonly source: "path" | "stdin" } | ProcessResult => {
  if (input === "-") {
    try {
      return { ok: true, bytes: context.readStdin(), source: "stdin" }
    } catch {
      return commandError(operation, "input-unreadable", [], 1, "-")
    }
  }
  try {
    return { ok: true, bytes: readFileSync(resolve(context.cwd, input)), source: "path" }
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
        ? "input-not-found"
        : "input-unreadable"
    return commandError(
      operation,
      code,
      code === "input-not-found"
        ? operation === "validate"
          ? [commandSuggestion("validate", "<existing-document>", "--format", "json")]
          : [commandSuggestion("create", "<existing-candidate>", "--output", "<new-document>")]
        : [],
      1,
      input
    )
  }
}

const runValidate = (
  operands: ReadonlyArray<string>,
  logLevel: LogLevel,
  helpRequested: boolean,
  context: ProcessContext
): ProcessResult => {
  if (operands.length > 1) {
    return commandError("validate", "unexpected-argument", commandHelp("validate", operands[0]), 2)
  }
  if (helpRequested) return bytesResult(helpAsset("validate"))
  if (operands.length === 0) {
    return commandError(
      "validate",
      "missing-argument",
      [commandSuggestion("validate", "<existing-document>", "--format", "json")],
      2
    )
  }
  const input = operands[0]
  if (input === undefined) throw new Error("Validated operand disappeared")
  const logger = new DiagnosticLogger(logLevel)
  const read = readInput(input, "validate", context)
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
    return commandError("validate", "invalid-json", [], 1, input, decoded.message, logger.bytes())
  }
  const result = validateDocument(decoded.value)
  logger.emit("info", "validation-completed", "validate", {
    conformance: result.validation.conformance.status,
    calculations: result.validation.calculations.status,
    snapshot: result.snapshotDiff.status
  })
  const help =
    result.validation.conformance.status === "conforming" && result.snapshotDiff.status === "not-recorded"
      ? [commandSuggestionWithOperand("record-validation", input, "--output", "<new-document>")]
      : []
  return jsonResult(
    { validation: result.validation, snapshotDiff: result.snapshotDiff, help },
    result.validation.conformance.status === "conforming" ? 0 : 1,
    logger.bytes()
  )
}

const runCreate = (
  operands: ReadonlyArray<string>,
  output: string | undefined,
  help: boolean,
  context: ProcessContext
): ProcessResult => {
  if (operands.length > 1) {
    return commandError("create", "unexpected-argument", commandHelp("create", operands[0]), 2)
  }
  if (help) return bytesResult(helpAsset("create"))
  if (operands.length === 0) {
    return commandError("create", "missing-argument", commandHelp("create"), 2)
  }
  const input = operands[0]
  if (input === undefined) throw new Error("Validated candidate disappeared")
  if (output === undefined) {
    return commandError("create", "missing-argument", commandHelp("create", input), 2)
  }
  const destination = resolve(context.cwd, output)
  const outputHelp = commandHelp("create", input)
  try {
    if ((context.outputExists ?? outputEntryExists)(destination)) {
      return commandError("create", "output-exists", outputHelp, 1, output)
    }
  } catch {
    return commandError("create", "write-failed", outputHelp, 1, output)
  }

  const read = readInput(input, "create", context)
  if (!("ok" in read)) return read
  const decoded = decodeJson(read.bytes)
  if (!decoded.ok) return commandError("create", "invalid-json", [], 1, input, decoded.message)
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

  const failure = (context.writeFile ?? writeNewFile)(destination, read.bytes)
  if (failure !== null) return writeFailure("create", failure, output, outputHelp)
  return jsonResult(
    {
      validation: result.validation,
      snapshotDiff: result.snapshotDiff,
      output: { status: "created", path: output },
      help: []
    },
    0
  )
}

const run = (
  parsed: Extract<ReturnType<typeof parseArguments>, { readonly ok: true }>["value"],
  context: ProcessContext
): ProcessResult => {
  const { command, operands, help, logLevel, version, output, format } = parsed

  if (command === null) {
    if (help) return bytesResult(helpAsset("fs"))
    return jsonResult(discovery, 0)
  }
  if (command === "guide") return runGuide(operands, help)
  if (command === "schema") return runSchema(operands, version, output, help, context)
  if (command === "example") return runExample(operands, output, help, context)

  if (format !== undefined && format !== "json") {
    return commandError(command, "unsupported-format", commandHelp(command, operands[0]), 2)
  }
  if (command === "validate") return runValidate(operands, logLevel, help, context)
  if (command === "create") return runCreate(operands, output, help, context)
  return commandError(
    command,
    "internal-error",
    [],
    1,
    undefined,
    "This command is not available until validation initialization completes."
  )
}

export const execute = (
  args: ReadonlyArray<string>,
  context: ProcessContext = { cwd: process.cwd(), readStdin: () => empty }
): ProcessResult => {
  const parsed = parseArguments(args)
  if (!parsed.ok) return usageFailure(parsed.error)
  try {
    return run(parsed.value, context)
  } catch {
    return commandError(parsed.value.command ?? "fs", "internal-error", [], 1)
  }
}

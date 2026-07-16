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
import { commandHelp, parseArguments, type CommandName, type UsageFailure } from "./arguments.js"
import { writeNewFile, type WriteFailure } from "./writer.js"

export interface ProcessResult {
  readonly stdout: Buffer
  readonly stderr: Buffer
  readonly exitCode: 0 | 1 | 2
}

export interface ProcessContext {
  readonly cwd: string
  readonly readStdin: () => Buffer
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
  help: ReadonlyArray<string>,
  exitCode: 1 | 2,
  path?: string,
  message = "The requested operation could not be completed."
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
    exitCode
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
    "fs guide authoring",
    "fs schema document --version 0.1",
    "fs example",
    "fs validate <document|-> --format json"
  ]
} as const

const writeFailure = (
  operation: "schema" | "example",
  failure: WriteFailure,
  path: string,
  help: ReadonlyArray<string>
): ProcessResult => commandError(operation, failure, help, 1, path)

const runGuide = (operands: ReadonlyArray<string>, help: boolean): ProcessResult => {
  if (help) return bytesResult(helpAsset(operands[0] === "authoring" ? "guide-authoring" : "guide"))
  if (operands.length === 1 && operands[0] === "authoring") return bytesResult(authoringGuide())
  return commandError("guide", "unexpected-argument", ["fs guide authoring"], 2)
}

const runSchema = (
  operands: ReadonlyArray<string>,
  version: string | undefined,
  output: string | undefined,
  help: boolean,
  context: ProcessContext
): ProcessResult => {
  if (help) return bytesResult(helpAsset("schema"))
  if (operands.length === 0) {
    return commandError(
      "schema",
      "missing-argument",
      ["fs schema <document|validation-result|snapshot-diff>"],
      2
    )
  }
  if (operands.length > 1) return commandError("schema", "unexpected-argument", commandHelp("schema"), 2)
  const name = operands[0]
  if (!schemaNames.some((candidate) => candidate === name)) {
    return commandError("schema", "unknown-schema", ["fs schema document --version 0.1"], 2)
  }
  if (version !== undefined && version !== "0.1") {
    return commandError("schema", "unsupported-version", ["fs schema document --version 0.1"], 2)
  }
  const bytes = schemaAsset(name as SchemaName)
  if (output === undefined) return bytesResult(bytes)
  const failure = writeNewFile(resolve(context.cwd, output), bytes)
  if (failure !== null) return writeFailure("schema", failure, output, ["fs schema document --output <new-path>"])
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
  help: ["fs example minimal", "fs example manufacturing-group"]
} as const

const runExample = (
  operands: ReadonlyArray<string>,
  output: string | undefined,
  help: boolean,
  context: ProcessContext
): ProcessResult => {
  if (help) return bytesResult(helpAsset("example"))
  if (operands.length === 0) {
    if (output !== undefined) {
      return commandError(
        "example",
        "missing-argument",
        [`fs example <minimal|manufacturing-group> --output ${output}`],
        2
      )
    }
    return jsonResult(examples, 0)
  }
  if (operands.length > 1) return commandError("example", "unexpected-argument", commandHelp("example"), 2)
  const name = operands[0]
  if (!exampleNames.some((candidate) => candidate === name)) {
    return commandError("example", "unknown-example", ["fs example minimal"], 2)
  }
  const bytes = exampleAsset(name as ExampleName)
  if (output === undefined) return bytesResult(bytes)
  const failure = writeNewFile(resolve(context.cwd, output), bytes)
  if (failure !== null) return writeFailure("example", failure, output, ["fs example minimal --output <new-path>"])
  return jsonResult({ output: { status: "created", path: output } }, 0)
}

const run = (
  parsed: Extract<ReturnType<typeof parseArguments>, { readonly ok: true }>["value"],
  context: ProcessContext
): ProcessResult => {
  const { command, operands, help, version, output, format } = parsed

  if (command === null) {
    if (help) return bytesResult(helpAsset("fs"))
    return jsonResult(discovery, 0)
  }
  if (command === "guide") return runGuide(operands, help)
  if (command === "schema") return runSchema(operands, version, output, help, context)
  if (command === "example") return runExample(operands, output, help, context)
  if (help) return bytesResult(helpAsset(command))

  if (format !== undefined && format !== "json") {
    return commandError(command, "unsupported-format", commandHelp(command, operands[0]), 2)
  }
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

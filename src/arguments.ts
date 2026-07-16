import { parseArgs } from "node:util"

export const commandNames = ["guide", "schema", "example", "validate", "create"] as const
export type CommandName = (typeof commandNames)[number]

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "none"

export interface ParsedArguments {
  readonly command: CommandName | null
  readonly operands: ReadonlyArray<string>
  readonly help: boolean
  readonly logLevel: LogLevel
  readonly version: string | undefined
  readonly output: string | undefined
  readonly format: string | undefined
}

export interface UsageFailure {
  readonly operation: CommandName | "fs"
  readonly code: "unknown-command" | "unknown-flag" | "unexpected-argument" | "unsupported-log-level"
  readonly help: ReadonlyArray<string>
  readonly message: string
}

export type ParseResult =
  | { readonly ok: true; readonly value: ParsedArguments }
  | { readonly ok: false; readonly error: UsageFailure }

const isCommand = (value: string | undefined): value is CommandName =>
  commandNames.some((name) => name === value)

export const commandHelp = (
  operation: CommandName | "fs",
  operand?: string
): ReadonlyArray<string> => {
  switch (operation) {
    case "validate":
      return [`fs validate ${operand ?? "<document|->"} --format json`]
    case "create":
      return [`fs create ${operand ?? "<candidate|->"} --output <new-document>`]
    case "schema":
      return ["fs schema document --version 0.1"]
    case "example":
      return ["fs example minimal"]
    case "guide":
      return ["fs guide authoring"]
    case "fs":
      return ["fs --help"]
  }
}

const operationFromRaw = (args: ReadonlyArray<string>): CommandName | "fs" => {
  const candidate = args.find((argument) => !argument.startsWith("-"))
  return isCommand(candidate) ? candidate : "fs"
}

const normalizeLogLevel = (value: string | undefined): LogLevel | null => {
  if (value === undefined || value === "none") return "none"
  if (value === "all") return "trace"
  if (value === "warning") return "warn"
  if (["trace", "debug", "info", "warn", "error", "fatal"].includes(value)) {
    return value as LogLevel
  }
  return null
}

const allowedOptions: Readonly<Record<CommandName | "fs", ReadonlySet<string>>> = {
  fs: new Set(["help", "log-level"]),
  guide: new Set(["help", "log-level"]),
  schema: new Set(["help", "log-level", "version", "output"]),
  example: new Set(["help", "log-level", "output"]),
  validate: new Set(["help", "log-level", "format"]),
  create: new Set(["help", "log-level", "output"])
}

const parserOptions = {
  help: { type: "boolean", short: "h" },
  "log-level": { type: "string" },
  version: { type: "string" },
  output: { type: "string" },
  format: { type: "string" }
} as const

const parseRawArguments = (args: ReadonlyArray<string>) =>
  parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: true,
    tokens: true,
    options: parserOptions
  })

export const parseArguments = (args: ReadonlyArray<string>): ParseResult => {
  const rawOperation = operationFromRaw(args)
  let parsed: ReturnType<typeof parseRawArguments>
  try {
    parsed = parseRawArguments(args)
  } catch {
    return {
      ok: false,
      error: {
        operation: rawOperation,
        code: "unknown-flag",
        message: "An option is not supported for this command.",
        help: commandHelp(rawOperation, args.find((argument, index) => index > 0 && !argument.startsWith("-")))
      }
    }
  }

  const [candidate, ...operands] = parsed.positionals
  const command = candidate === undefined ? null : isCommand(candidate) ? candidate : null
  if (candidate !== undefined && command === null) {
    return {
      ok: false,
      error: {
        operation: "fs",
        code: "unknown-command",
        message: "The command is not recognized.",
        help: commandHelp("fs")
      }
    }
  }

  const operation = command ?? "fs"
  const optionTokens = parsed.tokens.filter((token) => token.kind === "option")
  const commandToken = parsed.tokens.find(
    (token) => token.kind === "positional" && token.value === command
  )
  const counts = new Map<string, number>()
  for (const token of optionTokens) {
    counts.set(token.name, (counts.get(token.name) ?? 0) + 1)
    if (!allowedOptions[operation].has(token.name)) {
      return {
        ok: false,
        error: {
          operation,
          code: "unknown-flag",
          message: "An option is not supported for this command.",
          help: commandHelp(operation, operands[0])
        }
      }
    }
    if (
      commandToken !== undefined &&
      !allowedOptions.fs.has(token.name) &&
      token.index < commandToken.index
    ) {
      return {
        ok: false,
        error: {
          operation: "fs",
          code: "unknown-flag",
          message: "A command-local option was supplied before the command.",
          help: commandHelp("fs")
        }
      }
    }
  }
  if ([...counts.values()].some((count) => count > 1)) {
    return {
      ok: false,
      error: {
        operation,
        code: "unexpected-argument",
        message: "An option was supplied more than once.",
        help: commandHelp(operation, operands[0])
      }
    }
  }

  const logLevel = normalizeLogLevel(parsed.values["log-level"])
  if (logLevel === null) {
    return {
      ok: false,
      error: {
        operation,
        code: "unsupported-log-level",
        message: "The requested log level is not supported.",
        help: commandHelp(operation, operands[0])
      }
    }
  }

  return {
    ok: true,
    value: {
      command,
      operands,
      help: parsed.values.help ?? false,
      logLevel,
      version: parsed.values.version,
      output: parsed.values.output,
      format: parsed.values.format
    }
  }
}

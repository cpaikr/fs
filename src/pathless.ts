import { authoringGuide, exampleAsset, schemaAsset } from "./assets.js"
import type { ApplicationRequest, ProcessResult } from "./application.js"

interface CommandSuggestion {
  readonly executable: "fs"
  readonly arguments: ReadonlyArray<string>
}

const commandSuggestion = (...arguments_: ReadonlyArray<string>): CommandSuggestion => ({
  executable: "fs",
  arguments: arguments_
})

const empty = Buffer.alloc(0)

const jsonResult = (value: unknown): ProcessResult => ({
  stdout: Buffer.from(`${JSON.stringify(value)}\n`, "utf8"),
  stderr: empty,
  exitCode: 0
})

const bytesResult = (stdout: Buffer): ProcessResult => ({ stdout, stderr: empty, exitCode: 0 })

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

export const runPathless = (request: ApplicationRequest): ProcessResult | undefined => {
  switch (request.command) {
    case "fs":
      return jsonResult(discovery)
    case "guide":
      return bytesResult(authoringGuide())
    case "schema":
      return request.output === undefined ? bytesResult(schemaAsset(request.name)) : undefined
    case "example":
      if (request.name === null) return jsonResult(examples)
      return request.output === undefined ? bytesResult(exampleAsset(request.name)) : undefined
    case "validate":
    case "create":
    case "record-validation":
    case "render":
      return undefined
  }
}

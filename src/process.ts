import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export interface ProcessResult {
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: 0 | 1 | 2
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

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

const exactAsset = (relativePath: string): string =>
  readFileSync(resolve(packageRoot, relativePath), "utf8")

export const execute = (args: ReadonlyArray<string>): ProcessResult => {
  if (args.length === 0) {
    return { stdout: `${JSON.stringify(discovery)}\n`, stderr: "", exitCode: 0 }
  }

  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    return { stdout: exactAsset("assets/help/fs.md"), stderr: "", exitCode: 0 }
  }

  return {
    stdout: `${JSON.stringify({
      error: {
        operation: "fs",
        code: "unknown-command",
        message: "The command is not recognized."
      },
      help: ["fs --help"]
    })}\n`,
    stderr: "",
    exitCode: 2
  }
}

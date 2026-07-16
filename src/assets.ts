import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const readAsset = (relativePath: string): Buffer =>
  readFileSync(resolve(packageRoot, relativePath))

export const helpAsset = (
  name: "fs" | "guide" | "guide-authoring" | "schema" | "example" | "validate" | "create"
): Buffer => readAsset(`assets/help/${name}.md`)

export const authoringGuide = (): Buffer => readAsset("assets/guide/authoring.md")

const schemaPaths = {
  document: "schema/fs-document.schema.json",
  "validation-result": "schema/validation-result.schema.json",
  "snapshot-diff": "schema/snapshot-diff.schema.json"
} as const

export type SchemaName = keyof typeof schemaPaths

export const schemaNames = Object.keys(schemaPaths) as ReadonlyArray<SchemaName>

export const schemaAsset = (name: SchemaName): Buffer => readAsset(schemaPaths[name])

const examplePaths = {
  minimal: "examples/minimal.json",
  "manufacturing-group": "examples/manufacturing-group.json"
} as const

export type ExampleName = keyof typeof examplePaths

export const exampleNames = Object.keys(examplePaths) as ReadonlyArray<ExampleName>

export const exampleAsset = (name: ExampleName): Buffer => readAsset(examplePaths[name])

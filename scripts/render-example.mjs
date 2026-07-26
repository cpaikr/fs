import { mkdtemp, rename, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const examplesDirectory = join(repositoryRoot, "examples")
const input = join(examplesDirectory, "manufacturing-group.json")
const output = join(examplesDirectory, "manufacturing-group.html")
const temporaryDirectory = await mkdtemp(join(examplesDirectory, ".render-"))
const temporaryOutput = join(temporaryDirectory, "manufacturing-group.html")

try {
  const rendered = spawnSync(
    process.execPath,
    [join(repositoryRoot, "dist/bin.js"), "render", "--output", temporaryOutput, input],
    { cwd: repositoryRoot, encoding: "utf8" }
  )

  if (rendered.error !== undefined) throw rendered.error
  if (rendered.status !== 0) {
    process.stdout.write(rendered.stdout)
    process.stderr.write(rendered.stderr)
    process.exitCode = rendered.status ?? 1
  } else {
    await rename(temporaryOutput, output)
    console.log("Rendered examples/manufacturing-group.html")
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}

import { mkdtemp, rename, rm } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const examplesDirectory = join(repositoryRoot, "examples")
const temporaryDirectory = await mkdtemp(join(examplesDirectory, ".render-"))
const examples = ["manufacturing-group", "minimal"]

try {
  for (const name of examples) {
    const input = join(examplesDirectory, `${name}.json`)
    const output = join(examplesDirectory, `${name}.html`)
    const temporaryOutput = join(temporaryDirectory, `${name}.html`)
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
      break
    }
    await rename(temporaryOutput, output)
    console.log(`Rendered examples/${name}.html`)
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}

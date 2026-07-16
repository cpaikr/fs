import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"

const temporaryDirectory = mkdtempSync(join(tmpdir(), "fs-pack-"))

try {
  const packed = spawnSync(
    "npm",
    ["pack", "--ignore-scripts", "--json", "--pack-destination", temporaryDirectory],
    { encoding: "utf8" }
  )
  if (packed.status !== 0) {
    throw new Error(packed.stderr || packed.stdout || "npm pack failed")
  }

  const [{ filename, files }] = JSON.parse(packed.stdout)
  const paths = files.map((entry) => entry.path).sort()
  const required = [
    "assets/guide/authoring.md",
    "assets/help/create.md",
    "assets/help/example.md",
    "assets/help/fs.md",
    "assets/help/guide-authoring.md",
    "assets/help/guide.md",
    "assets/help/schema.md",
    "assets/help/validate.md",
    "dist/bin.js",
    "examples/manufacturing-group.json",
    "examples/minimal.json",
    "package.json",
    "schema/fs-document.schema.json",
    "schema/snapshot-diff.schema.json",
    "schema/validation-result.schema.json"
  ]

  for (const path of required) {
    if (!paths.includes(path)) throw new Error(`packed file missing: ${path}`)
  }
  for (const path of paths) {
    if (path.startsWith("src/") || path.startsWith("test/") || path.startsWith("fixtures/")) {
      throw new Error(`development-only path was packed: ${path}`)
    }
  }

  if (!paths.includes("dist/process.js")) throw new Error("packed runtime module missing")

  const packageJson = JSON.parse(readFileSync("package.json", "utf8"))
  if (packageJson.bin?.fs !== "dist/bin.js") throw new Error("packed bin mapping drifted")
  if (!filename.endsWith(".tgz")) throw new Error("npm pack did not produce a tarball")

  const tarball = join(temporaryDirectory, filename)
  const installDirectory = join(temporaryDirectory, "install")
  const installed = spawnSync(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--prefix", installDirectory, tarball],
    { encoding: "utf8" }
  )
  if (installed.status !== 0) {
    throw new Error(installed.stderr || installed.stdout || "packed install failed")
  }

  const installedRoot = join(installDirectory, "node_modules", "@cpai", "fs")
  for (const path of required.filter((entry) => !entry.startsWith("dist/") && entry !== "package.json")) {
    const source = readFileSync(path)
    const packedAsset = readFileSync(join(installedRoot, path))
    if (!source.equals(packedAsset)) throw new Error(`packed bytes differ: ${path}`)
  }

  const installedBin = join(installedRoot, "dist", "bin.js")
  if (!readFileSync(installedBin, "utf8").startsWith("#!/usr/bin/env node\n")) {
    throw new Error("packed executable shebang is missing")
  }
  if (process.platform !== "win32" && (statSync(installedBin).mode & 0o111) === 0) {
    throw new Error("packed executable mode is not executable")
  }

  const shim = join(installDirectory, "node_modules", ".bin", process.platform === "win32" ? "fs.cmd" : "fs")
  if (!existsSync(shim)) throw new Error("installed fs shim is missing")
  const discovery = spawnSync(shim, [], { cwd: installDirectory, encoding: "utf8" })
  if (discovery.status !== 0 || discovery.stderr !== "") {
    throw new Error(discovery.stderr || "installed fs discovery failed")
  }
  const expectedDiscovery = JSON.parse(readFileSync("fixtures/cli/expected/discovery.json", "utf8"))
  if (JSON.stringify(JSON.parse(discovery.stdout)) !== JSON.stringify(expectedDiscovery)) {
    throw new Error("installed fs discovery differs from the accepted value")
  }

  const help = spawnSync(shim, ["--help"], { cwd: installDirectory })
  if (help.status !== 0 || !help.stdout.equals(readFileSync("assets/help/fs.md")) || help.stderr.length !== 0) {
    throw new Error("installed fs help bytes differ from the accepted asset")
  }

  const npx = process.platform === "win32" ? "npx.cmd" : "npx"
  const npmEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.toLowerCase().startsWith("npm_config_"))
  )
  const npxHelp = spawnSync(npx, ["--no-install", "fs", "--help"], {
    cwd: installDirectory,
    env: npmEnvironment
  })
  if (
    npxHelp.status !== 0 ||
    !npxHelp.stdout.equals(readFileSync("assets/help/fs.md")) ||
    npxHelp.stderr.length !== 0
  ) {
    throw new Error(
      `local npx fs help smoke failed (status=${String(npxHelp.status)}, stdout=${npxHelp.stdout.length}, stderr=${npxHelp.stderr.toString("utf8")})`
    )
  }

  process.stdout.write(`Installed and executed ${paths.length} packed file(s) with exact assets\n`)
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true })
}

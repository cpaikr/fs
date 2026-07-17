import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import { pathToFileURL } from "node:url"

const temporaryDirectory = mkdtempSync(join(tmpdir(), "fs-pack-"))
const npm = process.platform === "win32" ? "npm.cmd" : "npm"
const ansiEscape = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001b\\))/

const assertNativeHelp = (result, label) => {
  const stdout = result.stdout.toString("utf8")
  const requiredText = [
    "USAGE",
    "fs",
    "guide",
    "schema",
    "example",
    "validate",
    "create",
    "--help",
    "--version",
    "--completions",
    "--log-level"
  ]
  if (
    result.status !== 0 ||
    result.stderr.length !== 0 ||
    ansiEscape.test(stdout) ||
    requiredText.some((text) => !stdout.includes(text))
  ) {
    throw new Error(
      `${label} failed (status=${String(result.status)}, stdout=${stdout.length}, stderr=${result.stderr.toString("utf8")})`
    )
  }
}

try {
  const packed = spawnSync(
    npm,
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
    "dist/bin.js",
    "dist/cli.js",
    "dist/process.js",
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

  const packageJson = JSON.parse(readFileSync("package.json", "utf8"))
  if (packageJson.bin?.fs !== "dist/bin.js") throw new Error("packed bin mapping drifted")
  if (!filename.endsWith(".tgz")) throw new Error("npm pack did not produce a tarball")

  const tarball = join(temporaryDirectory, filename)
  const installDirectory = join(temporaryDirectory, "install")
  const installed = spawnSync(
    npm,
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
  assertNativeHelp(help, "installed fs native help smoke")

  const ttyHelp = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      [
        'Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: true })',
        `process.argv = [process.execPath, ${JSON.stringify(installedBin)}, "--help"]`,
        `await import(${JSON.stringify(pathToFileURL(installedBin).href)})`
      ].join(";")
    ],
    { cwd: installDirectory }
  )
  assertNativeHelp(ttyHelp, "installed fs color-capable terminal help smoke")

  const npx = process.platform === "win32" ? "npx.cmd" : "npx"
  const npmEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.toLowerCase().startsWith("npm_config_"))
  )
  const npxHelp = spawnSync(npx, ["--no-install", "fs", "--help"], {
    cwd: installDirectory,
    env: npmEnvironment
  })
  assertNativeHelp(npxHelp, "local npx fs native help smoke")

  process.stdout.write(`Installed and executed ${paths.length} packed file(s) with exact retained assets and native help\n`)
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true })
}

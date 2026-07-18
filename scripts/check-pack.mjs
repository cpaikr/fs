import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import spawn from "cross-spawn"
import { pathToFileURL } from "node:url"

const temporaryDirectory = mkdtempSync(join(tmpdir(), "fs-pack-"))
const npm = process.platform === "win32" ? "npm.cmd" : "npm"
const ansiEscape = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001b\\))/

const run = (command, args, options = {}) =>
  spawn.sync(command, args, options)

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
    "record-validation",
    "render",
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

const successfulJson = (result, label) => {
  if (result.status !== 0 || result.stderr !== "") {
    throw new Error(result.stderr || `${label} failed with status ${String(result.status)}`)
  }
  try {
    return JSON.parse(result.stdout)
  } catch {
    throw new Error(`${label} did not return JSON`)
  }
}

const assertJsonEqual = (actual, expected, label) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} differs from the accepted value`)
  }
}

const expectedReleaseMetadata = {
  name: "@cpai/fs",
  version: "0.1.0",
  keywords: ["financial-statements", "json-schema", "validation", "cli"],
  homepage: "https://cpaikr.github.io/fs/spec/0.1/",
  bugs: { url: "https://github.com/cpaikr/cpaikr.github.io/issues" },
  repository: { type: "git", url: "git+https://github.com/cpaikr/fs.git" },
  author: "CPAI",
  license: "Apache-2.0",
  type: "module",
  bin: { fs: "dist/bin.js" },
  engines: { node: "^22.17.0 || ^24.15.0" },
  publishConfig: { access: "public", registry: "https://registry.npmjs.org/" }
}

const assertReleaseMetadata = (manifest, label) => {
  for (const [field, expected] of Object.entries(expectedReleaseMetadata)) {
    assertJsonEqual(manifest[field], expected, `${label} ${field}`)
  }
}

try {
  const packed = run(
    npm,
    ["pack", "--json", "--pack-destination", temporaryDirectory],
    { encoding: "utf8" }
  )
  if (packed.status !== 0) {
    throw new Error(packed.stderr || packed.stdout || "npm pack failed")
  }

  // npm forwards prepack output before its JSON payload, so parse the final
  // JSON document rather than requiring the lifecycle to stay silent.
  const jsonStart = packed.stdout.lastIndexOf("\n[")
  const packJson = jsonStart === -1 ? packed.stdout : packed.stdout.slice(jsonStart + 1)
  const [{ filename, files }] = JSON.parse(packJson)
  const paths = files.map((entry) => entry.path).sort()
  const compiledModules = [
    "application",
    "assets",
    "bin",
    "cli",
    "content",
    "io",
    "json",
    "limits",
    "logger",
    "node-services",
    "pathless",
    "process",
    "record-validation",
    "render",
    "validation/calculate",
    "validation/decimal",
    "validation/identity",
    "validation/model",
    "validation/schema",
    "validation/semantic",
    "validation/snapshot",
    "validation/validate",
    "writer"
  ]
  const retainedAssets = [
    "LICENSE",
    "README.md",
    "assets/guide/authoring.md",
    "examples/README.md",
    "examples/manufacturing-group.json",
    "examples/minimal.json",
    "schema/fs-document.schema.json",
    "schema/snapshot-diff.schema.json",
    "schema/validation-result.schema.json"
  ]
  const expectedPaths = [
    ...retainedAssets,
    ...compiledModules.flatMap((module) => [`dist/${module}.js`, `dist/${module}.js.map`]),
    "package.json"
  ].sort()
  if (JSON.stringify(paths) !== JSON.stringify(expectedPaths)) {
    const missing = expectedPaths.filter((path) => !paths.includes(path))
    const unexpected = paths.filter((path) => !expectedPaths.includes(path))
    throw new Error(
      `packed inventory drifted (missing=${JSON.stringify(missing)}, unexpected=${JSON.stringify(unexpected)})`
    )
  }

  const packageJson = JSON.parse(readFileSync("package.json", "utf8"))
  assertReleaseMetadata(packageJson, "source package metadata")
  if (!filename.endsWith(".tgz")) throw new Error("npm pack did not produce a tarball")

  const tarball = join(temporaryDirectory, filename)
  const installDirectory = join(temporaryDirectory, "install")
  const installed = run(
    npm,
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--prefix", installDirectory, tarball],
    { encoding: "utf8" }
  )
  if (installed.status !== 0) {
    throw new Error(installed.stderr || installed.stdout || "packed install failed")
  }

  const installedRoot = join(installDirectory, "node_modules", "@cpai", "fs")
  const installedPackageJson = JSON.parse(readFileSync(join(installedRoot, "package.json"), "utf8"))
  assertReleaseMetadata(installedPackageJson, "installed package metadata")
  for (const path of retainedAssets) {
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
  const discovery = successfulJson(
    run(shim, [], { cwd: installDirectory, encoding: "utf8" }),
    "installed fs discovery"
  )
  const expectedDiscovery = JSON.parse(readFileSync("fixtures/cli/expected/discovery.json", "utf8"))
  assertJsonEqual(discovery, expectedDiscovery, "installed fs discovery")

  const noRollupsPath = join(process.cwd(), "fixtures", "valid", "no-rollups.json")
  const expectedValidation = JSON.parse(
    readFileSync("fixtures/calculation-results/no-rollups.json", "utf8")
  )
  const expectedNotRecorded = JSON.parse(
    readFileSync("fixtures/snapshot-diffs/not-recorded.json", "utf8")
  )
  const validation = successfulJson(
    run(shim, ["validate", noRollupsPath], { cwd: installDirectory, encoding: "utf8" }),
    "installed fs validate"
  )
  assertJsonEqual(validation.validation, expectedValidation, "installed fs validation result")
  assertJsonEqual(validation.snapshotDiff, expectedNotRecorded, "installed fs validation snapshot diff")

  const createdPath = join(temporaryDirectory, "installed-created.json")
  const creation = successfulJson(
    run(shim, ["create", "--output", createdPath, noRollupsPath], {
      cwd: installDirectory,
      encoding: "utf8"
    }),
    "installed fs create"
  )
  if (creation.output?.status !== "created" || creation.output.path !== createdPath) {
    throw new Error("installed fs create did not report the accepted output")
  }
  if (!readFileSync(createdPath).equals(readFileSync(noRollupsPath))) {
    throw new Error("installed fs create did not preserve candidate bytes")
  }

  const recordedPath = join(temporaryDirectory, "installed-recorded.json")
  const recording = successfulJson(
    run(shim, ["record-validation", "--output", recordedPath, noRollupsPath], {
      cwd: installDirectory,
      encoding: "utf8"
    }),
    "installed fs record-validation"
  )
  if (
    recording.snapshotDiff?.status !== "match" ||
    recording.output?.status !== "created" ||
    recording.output.path !== recordedPath
  ) {
    throw new Error("installed fs record-validation did not report the accepted output")
  }
  if (
    !readFileSync(recordedPath).equals(
      readFileSync("fixtures/cli/expected/record-validation/no-rollups.json")
    )
  ) {
    throw new Error("installed fs record-validation bytes differ from the accepted value")
  }

  const renderedPath = join(temporaryDirectory, "installed-render.html")
  const rendered = run(
    shim,
    [
      "render",
      "--output",
      renderedPath,
      join(installedRoot, "examples", "minimal.json")
    ],
    { cwd: installDirectory, encoding: "utf8" }
  )
  if (rendered.status !== 0 || rendered.stderr !== "") {
    throw new Error(rendered.stderr || "installed fs render failed")
  }
  if (!readFileSync(renderedPath).equals(readFileSync("fixtures/cli/expected/render/minimal.html"))) {
    throw new Error("installed fs render bytes differ from the accepted value")
  }

  const help = run(shim, ["--help"], { cwd: installDirectory })
  assertNativeHelp(help, "installed fs native help smoke")

  const ttyHelp = run(
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
  const npxHelp = run(npx, ["--no-install", "fs", "--help"], {
    cwd: installDirectory,
    env: npmEnvironment
  })
  assertNativeHelp(npxHelp, "local npx fs native help smoke")

  process.stdout.write(`Installed and executed ${paths.length} packed file(s) with exact retained assets and native help\n`)
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true })
}

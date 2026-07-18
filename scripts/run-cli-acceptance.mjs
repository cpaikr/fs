import spawn from "cross-spawn"
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { isDeepStrictEqual } from "node:util"
import { tmpdir } from "node:os"
import { dirname, join, resolve, sep } from "node:path"
import { pathToFileURL } from "node:url"

const fixtureRoot = resolve("fixtures/cli")
const manifest = JSON.parse(readFileSync(join(fixtureRoot, "manifest.json"), "utf8"))
const packageName = JSON.parse(readFileSync("package.json", "utf8")).name
const pattern = process.env.FS_CASE_PATTERN ? new RegExp(process.env.FS_CASE_PATTERN) : null
const selectedCases = manifest.cases.filter((path) => {
  if (pattern === null) return true
  const descriptor = JSON.parse(readFileSync(join(fixtureRoot, path), "utf8"))
  return pattern.test(descriptor.id)
})
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"

if (selectedCases.length === 0) throw new Error("acceptance case pattern selected no cases")

const run = (command, args, options = {}) => {
  const result = spawn.sync(command, args, {
    encoding: "utf8",
    ...options
  })
  if (result.status !== 0) {
    throw new Error(result.error?.message || result.stderr || result.stdout || `${command} failed`)
  }
  return result
}

const temporaryRoot = mkdtempSync(join(tmpdir(), "fs-acceptance-"))

const repositoryFile = (path) => resolve(fixtureRoot, path)

const pointerValue = (value, pointer) => {
  if (pointer === "") return value
  return pointer
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((current, part) => {
      if (current === null || typeof current !== "object" || !Object.hasOwn(current, part)) {
        throw new Error(`JSON Pointer does not resolve: ${pointer}`)
      }
      return current[part]
    }, value)
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"))

const generatedBytes = (segments) =>
  Buffer.from(segments.map(({ utf8, count }) => utf8.repeat(count)).join(""), "utf8")

const sourceBytes = (source) => {
  if (source.file) return readFileSync(repositoryFile(source.file))
  if (source.utf8 !== undefined) return Buffer.from(source.utf8, "utf8")
  return generatedBytes(source.generated)
}

const expectedEquality = (equality) => {
  if (Object.hasOwn(equality, "equals")) return equality.equals
  if (equality.equalsFile) {
    const value = readJson(repositoryFile(equality.equalsFile.file))
    return pointerValue(value, equality.equalsFile.pointer ?? "")
  }
  const selection = equality.equalsSelected
  const source = readJson(repositoryFile(selection.file))
  const candidates = pointerValue(source, selection.arrayPointer).filter((candidate) =>
    isDeepStrictEqual(pointerValue(candidate, selection.wherePointer), selection.whereEquals)
  )
  if (candidates.length !== 1) throw new Error("JSON selection did not resolve uniquely")
  return pointerValue(candidates[0], selection.valuePointer)
}

const matchJson = (buffer, matcher, context) => {
  let actual
  try {
    actual = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer))
  } catch (error) {
    throw new Error(`${context}: stdout is not one UTF-8 JSON value`, { cause: error })
  }

  for (const member of matcher.members) {
    const object = pointerValue(actual, member.pointer)
    if (object === null || typeof object !== "object" || Array.isArray(object)) {
      throw new Error(`${context}: members pointer is not an object: ${member.pointer}`)
    }
    const keys = Object.keys(object).sort()
    if (!isDeepStrictEqual(keys, [...member.equals].sort())) {
      throw new Error(`${context}: member set differs at ${member.pointer}`)
    }
  }
  for (const array of matcher.arrays ?? []) {
    const value = pointerValue(actual, array.pointer)
    if (!Array.isArray(value)) throw new Error(`${context}: array pointer is not an array`)
    if (array.equals !== undefined && value.length !== array.equals) {
      throw new Error(`${context}: array length differs at ${array.pointer}`)
    }
    if (array.minimum !== undefined && value.length < array.minimum) {
      throw new Error(`${context}: array is too short at ${array.pointer}`)
    }
  }
  for (const equality of matcher.equalities) {
    if (!isDeepStrictEqual(pointerValue(actual, equality.pointer), expectedEquality(equality))) {
      throw new Error(`${context}: JSON value differs at ${equality.pointer}`)
    }
  }
  for (const pointer of matcher.nonemptyStrings) {
    const value = pointerValue(actual, pointer)
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`${context}: expected nonempty string at ${pointer}`)
    }
  }
}

const matchBytes = (actual, matcher, context) => {
  const expected = matcher.equalsFile
    ? readFileSync(repositoryFile(matcher.equalsFile))
    : Buffer.from(matcher.equalsUtf8, "utf8")
  if (!actual.equals(expected)) throw new Error(`${context}: exact bytes differ`)
}

const matchJsonLines = (actual, matcher, context) => {
  if (matcher.equalsFile) return matchBytes(actual, matcher, context)
  const text = new TextDecoder("utf-8", { fatal: true }).decode(actual)
  if (!text.endsWith("\n")) throw new Error(`${context}: JSON Lines lacks trailing LF`)
  const records = text.slice(0, -1).split("\n").map((line) => JSON.parse(line))
  const available = [...records]
  for (const expected of matcher.contains) {
    const index = available.findIndex((record) => isDeepStrictEqual(record, expected))
    if (index === -1) {
      throw new Error(`${context}: required JSON Lines record is missing`)
    }
    available.splice(index, 1)
  }
  if (!matcher.allowAdditional && available.length !== 0) {
    throw new Error(`${context}: unexpected JSON Lines records`)
  }
}

const ansiPattern = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001b\\))/u

const matchNativeText = (actual, matcher, context) => {
  let text
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(actual)
  } catch (error) {
    throw new Error(`${context}: native CLI text is not UTF-8`, { cause: error })
  }
  for (const required of matcher.contains) {
    if (!text.includes(required)) {
      throw new Error(`${context}: required native CLI text is missing: ${JSON.stringify(required)}`)
    }
  }
  for (const excluded of matcher.excludes) {
    if (text.includes(excluded)) {
      throw new Error(`${context}: excluded native CLI text is present: ${JSON.stringify(excluded)}`)
    }
  }
  if (matcher.ansi === false && ansiPattern.test(text)) {
    throw new Error(`${context}: native CLI text contains ANSI sequences`)
  }
}

const matchStream = (actual, matcher, context) => {
  if (matcher.encoding === "bytes") return matchBytes(actual, matcher, context)
  if (matcher.encoding === "json") return matchJson(actual, matcher, context)
  if (matcher.encoding === "native-text") return matchNativeText(actual, matcher, context)
  return matchJsonLines(actual, matcher, context)
}

const walkTree = (root) => {
  const entries = new Map()
  const visit = (directory, prefix = "") => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`
      const absolute = join(directory, entry.name)
      if (entry.isDirectory()) {
        entries.set(relative, { type: "directory" })
        visit(absolute, relative)
      } else if (entry.isFile()) {
        entries.set(relative, { type: "file", bytes: readFileSync(absolute) })
      } else {
        entries.set(relative, { type: "other" })
      }
    }
  }
  visit(root)
  return entries
}

const parentDirectories = (paths) => {
  const directories = new Set()
  for (const path of paths) {
    let parent = dirname(path).split(sep).join("/")
    while (parent !== ".") {
      directories.add(parent)
      parent = dirname(parent).split(sep).join("/")
    }
  }
  return directories
}

const matchTree = (root, baseline, expectation, stdin, context) => {
  const actual = walkTree(root)
  const expectedFiles = [
    ...expectation.created.map((entry) => entry.path),
    ...expectation.unchanged
  ]
  const expectedDirectories = parentDirectories(expectedFiles)
  const actualPaths = [...actual.keys()].sort()
  const expectedPaths = [...expectedDirectories, ...expectedFiles].sort()
  if (!isDeepStrictEqual(actualPaths, expectedPaths)) {
    throw new Error(`${context}: filesystem inventory differs`)
  }

  for (const path of expectation.unchanged) {
    const before = baseline.get(path)
    const after = actual.get(path)
    if (before?.type !== "file" || after?.type !== "file" || !before.bytes.equals(after.bytes)) {
      throw new Error(`${context}: staged file changed: ${path}`)
    }
  }
  for (const file of expectation.created) {
    const after = actual.get(file.path)
    if (after?.type !== "file") throw new Error(`${context}: created file missing: ${file.path}`)
    const expected = file.equalsStdin
      ? stdin
      : readFileSync(repositoryFile(file.equalsFile))
    if (expected === null || !after.bytes.equals(expected)) {
      throw new Error(`${context}: created file bytes differ: ${file.path}`)
    }
  }
  for (const path of expectation.absent) {
    if (existsSync(join(root, path))) throw new Error(`${context}: path should be absent: ${path}`)
  }
}

try {
  const packed = run(npmCommand, [
    "pack",
    "--ignore-scripts",
    "--json",
    "--pack-destination",
    temporaryRoot
  ])
  const [{ filename }] = JSON.parse(packed.stdout)
  const installRoot = join(temporaryRoot, "install")
  run(npmCommand, [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--prefix",
    installRoot,
    join(temporaryRoot, filename)
  ])
  const entrypoint = join(installRoot, "node_modules", ...packageName.split("/"), "dist", "bin.js")

  const failures = []
  for (const casePath of selectedCases) {
    const descriptor = readJson(join(fixtureRoot, casePath))
    const caseRoot = join(temporaryRoot, "cases", descriptor.id)
    const workspace = join(caseRoot, "workspace")
    const home = join(caseRoot, "home")
    mkdirSync(workspace, { recursive: true })
    mkdirSync(home, { recursive: true })
    for (const staged of descriptor.workspace) {
      const destination = join(workspace, staged.to)
      mkdirSync(dirname(destination), { recursive: true })
      if (staged.copy !== undefined) {
        cpSync(repositoryFile(staged.copy), destination)
      } else {
        writeFileSync(destination, generatedBytes(staged.generated))
      }
    }
    const workspaceBefore = walkTree(workspace)
    const homeBefore = walkTree(home)
    const stdin = descriptor.stdin === null ? Buffer.alloc(0) : sourceBytes(descriptor.stdin)
    const environment = {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      TZ: "UTC",
      LANG: "C",
      LC_ALL: "C",
      NO_COLOR: "1",
      FORCE_COLOR: "0",
      TERM: "dumb"
    }
    delete environment.NODE_OPTIONS

    let invokedEntrypoint = entrypoint
    if (descriptor.workingDirectory === "unavailable") {
      invokedEntrypoint = join(caseRoot, "cwd-unavailable.mjs")
      const unavailable = [
        "process.cwd = () => {",
        "  const error = new Error('sensitive unavailable working directory detail')",
        "  error.code = 'ENOENT'",
        "  throw error",
        "}",
        `await import(${JSON.stringify(pathToFileURL(entrypoint).href)})`,
        ""
      ].join("\n")
      writeFileSync(invokedEntrypoint, unavailable)
    }

    const observed = spawn.sync(process.execPath, [invokedEntrypoint, ...descriptor.arguments], {
      cwd: workspace,
      env: environment,
      input: stdin,
      timeout: 15_000,
      maxBuffer: 16 * 1024 * 1024
    })
    try {
      if (observed.error) throw observed.error
      if (observed.signal !== null) throw new Error(`terminated by ${observed.signal}`)
      if (observed.status !== descriptor.expect.exitCode) {
        throw new Error(`exit code ${String(observed.status)} != ${descriptor.expect.exitCode}`)
      }
      matchStream(observed.stdout, descriptor.expect.stdout, `${descriptor.id} stdout`)
      matchStream(observed.stderr, descriptor.expect.stderr, `${descriptor.id} stderr`)
      matchTree(
        workspace,
        workspaceBefore,
        descriptor.expect.filesystem.workspace,
        stdin,
        `${descriptor.id} workspace`
      )
      matchTree(home, homeBefore, descriptor.expect.filesystem.home, null, `${descriptor.id} home`)
      process.stdout.write(`${descriptor.id} passed\n`)
    } catch (error) {
      failures.push(`${descriptor.id}: ${error.message}`)
    }
  }

  if (failures.length > 0) throw new Error(failures.join("\n"))
  process.stdout.write(`Passed ${selectedCases.length} packed CLI acceptance case(s)\n`)
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true })
}

import { spawn, spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { nodeWriterServices, writeNewFile } from "../dist/writer.js"

const script = fileURLToPath(import.meta.url)
const crashExit = 91
const outputExistsExit = 10
const crashPoints = ["after-open", "after-write", "after-sync", "after-close", "after-link"]

const failAfter = (point) => {
  const services = { ...nodeWriterServices }
  const wrap = (name) => (...arguments_) => {
    const result = nodeWriterServices[name](...arguments_)
    process.exit(crashExit)
    return result
  }
  if (point === "after-open") services.openExclusive = wrap("openExclusive")
  if (point === "after-write") services.write = wrap("write")
  if (point === "after-sync") services.sync = wrap("sync")
  if (point === "after-close") services.close = wrap("close")
  if (point === "after-link") services.link = wrap("link")
  return services
}

const childCrash = (point, destination, payload) => {
  writeNewFile(destination, Buffer.from(payload, "utf8"), failAfter(point))
  process.exitCode = 2
}

const childContend = (destination, payload, ready, release) => {
  const pause = new Int32Array(new SharedArrayBuffer(4))
  const services = {
    ...nodeWriterServices,
    exists: (path) => {
      if (path !== destination) return nodeWriterServices.exists(path)
      writeFileSync(ready, "", { flag: "wx" })
      while (!existsSync(release)) Atomics.wait(pause, 0, 0, 10)
      return false
    }
  }
  const failure = writeNewFile(destination, Buffer.from(payload, "utf8"), services)
  process.exitCode = failure === null ? 0 : failure === "output-exists" ? outputExistsExit : 2
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const temporaryEntries = (directory) =>
  readdirSync(directory).filter((entry) => entry.startsWith(".fs-") && entry.endsWith(".tmp"))

const runCrashCases = (root) => {
  const payload = "crash-safe payload\n"
  for (const point of crashPoints) {
    const directory = join(root, point)
    const destination = join(directory, "result.json")
    mkdirSync(directory)
    const child = spawnSync(process.execPath, [script, "child-crash", point, destination, payload], {
      encoding: "utf8",
      timeout: 15_000
    })
    assert(child.status === crashExit, `${point}: child exited ${String(child.status)}: ${child.stderr}`)

    const committed = point === "after-link"
    assert(nodeWriterServices.exists(destination) === committed, `${point}: destination commit boundary was wrong`)
    if (committed) {
      assert(readFileSync(destination, "utf8") === payload, `${point}: committed bytes differed`)
    }
    for (const entry of temporaryEntries(directory)) {
      const temporary = join(directory, entry)
      if (process.platform !== "win32") {
        assert((statSync(temporary).mode & 0o077) === 0, `${point}: temporary file was not private`)
      }
    }
  }
}

const spawnContender = (destination, payload, ready, release) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, "child-contend", destination, payload, ready, release], {
      stdio: ["ignore", "ignore", "pipe"]
    })
    let stderr = ""
    child.stderr.setEncoding("utf8")
    child.stderr.on("data", (chunk) => {
      stderr += chunk
    })
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      child.kill()
    }, 60_000)
    child.on("error", (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on("close", (code) => {
      clearTimeout(timeout)
      if (timedOut) reject(new Error("concurrent writer timed out"))
      else resolve({ code, stderr })
    })
  })

const waitForBarrier = async (readyPaths) => {
  const deadline = Date.now() + 30_000
  while (!readyPaths.every((path) => existsSync(path))) {
    if (Date.now() >= deadline) throw new Error("concurrent writers did not reach the preflight barrier")
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

const runContentionCase = async (root) => {
  const directory = join(root, "contention")
  const barrier = join(directory, "barrier")
  const destination = join(directory, "result.json")
  mkdirSync(barrier, { recursive: true })
  const payloads = Array.from({ length: 16 }, (_, index) => `contender-${index}\n`)
  const readyPaths = payloads.map((_, index) => join(barrier, `ready-${index}`))
  const release = join(barrier, "release")
  const contenders = payloads.map((payload, index) =>
    spawnContender(destination, payload, readyPaths[index], release)
  )
  const settledPromise = Promise.allSettled(contenders)
  const earlyFailure = new Promise((resolve) => {
    for (const contender of contenders) contender.catch(resolve)
  })
  let barrierFailure
  try {
    await Promise.race([
      waitForBarrier(readyPaths),
      earlyFailure.then((error) => {
        throw error
      })
    ])
  } catch (error) {
    barrierFailure = error
  } finally {
    writeFileSync(release, "")
  }
  const settled = await settledPromise
  if (barrierFailure !== undefined) throw barrierFailure
  const rejected = settled.find((result) => result.status === "rejected")
  if (rejected !== undefined) throw rejected.reason
  const results = settled.map((result) => result.value)
  const winner = results.findIndex(({ code }) => code === 0)
  assert(winner >= 0, "contention did not produce a winner")
  assert(results.filter(({ code }) => code === 0).length === 1, "contention produced more than one winner")
  assert(
    results.filter(({ code }) => code === outputExistsExit).length === payloads.length - 1,
    `contention produced unexpected exits: ${JSON.stringify(results)}`
  )
  assert(readFileSync(destination, "utf8") === payloads[winner], "contention destination did not belong to the winner")
  assert(temporaryEntries(directory).length === 0, "normal contention left temporary files behind")
}

const role = process.argv[2]
if (role === "child-crash") {
  childCrash(process.argv[3], process.argv[4], process.argv[5])
} else if (role === "child-contend") {
  childContend(process.argv[3], process.argv[4], process.argv[5], process.argv[6])
} else {
  const root = mkdtempSync(join(tmpdir(), "fs-writer-integration-"))
  try {
    runCrashCases(root)
    await runContentionCase(root)
    process.stdout.write(`Passed ${crashPoints.length} crash points and 16 concurrent writers.\n`)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

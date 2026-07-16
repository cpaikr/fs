#!/usr/bin/env node

import { runMain } from "@effect/platform-node/NodeRuntime"
import { Effect } from "effect"
import { readFileSync } from "node:fs"

import { execute } from "./process.js"

runMain(
  Effect.sync(() => {
    const arguments_ = process.argv.slice(2)
    const result = execute(arguments_, {
      cwd: process.cwd(),
      readStdin: () => readFileSync(0)
    })
    process.stdout.write(result.stdout)
    process.stderr.write(result.stderr)
    process.exitCode = result.exitCode
  }),
  { disableErrorReporting: true }
)

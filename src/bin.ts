#!/usr/bin/env node

import { runMain } from "@effect/platform-node/NodeRuntime"
import { Effect } from "effect"

import { execute } from "./process.js"

runMain(
  Effect.sync(() => {
    const result = execute(process.argv.slice(2))
    process.stdout.write(result.stdout)
    process.stderr.write(result.stderr)
    process.exitCode = result.exitCode
  }),
  { disableErrorReporting: true }
)

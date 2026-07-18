#!/usr/bin/env node

import { runMain } from "@effect/platform-node-shared/NodeRuntime"
import { Effect, Layer } from "effect"

import { ApplicationExecutor } from "./application.js"
import { noColorOutput, program } from "./cli.js"
import { nodeServices } from "./node-services.js"

const mainLayer = nodeServices.pipe(
  Layer.merge(noColorOutput),
  Layer.merge(ApplicationExecutor.live)
)

runMain(
  program.pipe(Effect.provide(mainLayer)),
  { disableErrorReporting: true }
)

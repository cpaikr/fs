#!/usr/bin/env node

import { NodeServices } from "@effect/platform-node"
import { runMain } from "@effect/platform-node/NodeRuntime"
import { Effect, Layer } from "effect"

import { noColorOutput, program } from "./cli.js"
import { ApplicationIO } from "./process.js"

const mainLayer = ApplicationIO.live.pipe(
  Layer.provideMerge(NodeServices.layer),
  Layer.merge(noColorOutput)
)

runMain(
  program.pipe(Effect.provide(mainLayer)),
  { disableErrorReporting: true }
)

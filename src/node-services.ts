import * as NodeChildProcessSpawner from "@effect/platform-node-shared/NodeChildProcessSpawner"
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as NodePath from "@effect/platform-node-shared/NodePath"
import * as NodeStdio from "@effect/platform-node-shared/NodeStdio"
import * as NodeTerminal from "@effect/platform-node-shared/NodeTerminal"
import { Layer } from "effect"

const baseServices = Layer.mergeAll(
  NodeFileSystem.layer,
  NodePath.layer,
  NodeStdio.layer,
  NodeTerminal.layer
)

export const nodeServices = NodeChildProcessSpawner.layer.pipe(
  Layer.provideMerge(baseServices)
)

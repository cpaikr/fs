import { describe, expect, it } from "vitest"

import type { LogLevel } from "../src/arguments.js"
import { DiagnosticLogger } from "../src/logger.js"

const levels = ["trace", "debug", "info", "warn", "error", "fatal"] as const

describe("diagnostic logger", () => {
  it.each(["trace", "debug", "info", "warn", "error", "fatal", "none"] as const)(
    "applies the %s threshold deterministically",
    (threshold: LogLevel) => {
      const logger = new DiagnosticLogger(threshold)
      for (const level of levels) logger.emit(level, `${level}-event`, "validate", { sequence: 1 })

      const records = logger
        .bytes()
        .toString("utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { readonly level: string })
      const start = threshold === "none" ? levels.length : levels.indexOf(threshold)
      expect(records.map((record) => record.level)).toEqual(levels.slice(start))
    }
  )

  it("emits exact compact JSON Lines with a final newline", () => {
    const logger = new DiagnosticLogger("info")
    logger.emit("info", "validation-completed", "validate", { conformance: "conforming" })

    expect(logger.bytes().toString("utf8")).toBe(
      '{"level":"info","event":"validation-completed","operation":"validate","conformance":"conforming"}\n'
    )
  })
})

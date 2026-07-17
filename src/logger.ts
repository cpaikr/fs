export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "none"

type EmittedLevel = Exclude<LogLevel, "none">

const ranks: Readonly<Record<EmittedLevel, number>> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5
}

export class DiagnosticLogger {
  private readonly records: Array<Record<string, string | number | boolean>> = []

  constructor(private readonly threshold: LogLevel) {}

  emit(level: EmittedLevel, event: string, operation: string, context: Record<string, string | number | boolean>): void {
    if (this.threshold === "none" || ranks[level] < ranks[this.threshold]) return
    this.records.push({ level, event, operation, ...context })
  }

  bytes(): Buffer {
    return this.records.length === 0
      ? Buffer.alloc(0)
      : Buffer.from(`${this.records.map((record) => JSON.stringify(record)).join("\n")}\n`, "utf8")
  }
}

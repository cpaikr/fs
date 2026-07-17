import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { decodeJson } from "../src/json.js"

describe("JSON boundary", () => {
  it.each(["malformed-json", "trailing-content", "duplicate-members"])(
    "rejects %s before schema validation",
    (name) => {
      expect(decodeJson(readFileSync(`fixtures/raw-input/${name}.json.txt`)).ok).toBe(false)
    }
  )

  it("accepts the deliberately noncanonical candidate", () => {
    expect(decodeJson(readFileSync("fixtures/raw-input/noncanonical-valid.json")).ok).toBe(true)
  })

  it("rejects invalid UTF-8", () => {
    expect(decodeJson(Buffer.from([0xc3, 0x28]))).toEqual({
      ok: false,
      message: "Input is not valid UTF-8."
    })
  })

  it("rejects numeric lexemes that cannot cross the runtime boundary", () => {
    expect(decodeJson(Buffer.from("{\"scale\":9007199254740993}"))).toMatchObject({ ok: false })
    expect(decodeJson(Buffer.from("{\"value\":1e9999}"))).toMatchObject({ ok: false })
    expect(decodeJson(Buffer.from("{\"scale\":1.0000000000000001}"))).toMatchObject({ ok: false })
    expect(decodeJson(Buffer.from("{\"scale\":9007199254740991.1}"))).toMatchObject({ ok: false })
    expect(decodeJson(Buffer.from("{\"scale\":1e-400}"))).toMatchObject({ ok: false })
    expect(decodeJson(Buffer.from("{\"scale\":9007199254740992}"))).toMatchObject({ ok: true })
    expect(decodeJson(Buffer.from("{\"scale\":1.0}"))).toMatchObject({ ok: true })
    expect(decodeJson(Buffer.from("{\"value\":1.5}"))).toMatchObject({ ok: true })
  })
})

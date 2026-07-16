# fs schema

Read or copy an exact bundled FS JSON Schema.

## Usage

`fs schema <name> [--version <version>] [--output <path>] [--log-level <level>]`

The required name is `document`, `validation-result`, or `snapshot-diff`.
`--version` defaults to `0.1`. Without `--output`, schema bytes go to standard
output. With it, the command creates a new file without overwriting or creating
parents. Use `--help` or `-h` for this reference.

Logging defaults to `none`; levels are `all`, `trace`, `debug`, `info`, `warn`,
`warning`, `error`, `fatal`, and `none`.

## Examples

```sh
fs schema document
fs schema validation-result --version 0.1
fs schema snapshot-diff --output snapshot-diff.schema.json
```

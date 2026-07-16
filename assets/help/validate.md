# fs validate

Validate one complete FS document without modifying it.

## Usage

`fs validate <document|-> [--format json] [--log-level <level>]`

The required input is a path or `-` for standard input. `--format` defaults to
`json`, the only V0 result encoding. Use `--help` or `-h` for this reference.
Logging defaults to `none`; levels are `all`, `trace`, `debug`, `info`, `warn`,
`warning`, `error`, `fatal`, and `none`.

Structural nonconformance exits `1`. Calculation inconsistency and snapshot
mismatch are successful validation results and exit `0`.

## Examples

```sh
fs validate statement.fs.json
fs validate statement.fs.json --format json
fs validate - --format json
```

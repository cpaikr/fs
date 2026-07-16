# fs

Inspect, validate, and safely create FS V0 financial-statement documents.

## Usage

`fs [--log-level <level>]`

`fs <command> ... [--log-level <level>]`

No arguments return JSON discovery. Use `--help` or `-h` for this reference.
Logging defaults to `none`; levels are `all`, `trace`, `debug`, `info`, `warn`,
`warning`, `error`, `fatal`, and `none`.

## Commands

- `guide authoring`: show the standalone authoring workflow.
- `schema`: read or copy a bundled JSON Schema.
- `example`: list, read, or copy bundled examples.
- `validate`: validate a document without modifying it.
- `create`: validate and atomically copy exact candidate bytes to a new path.

## Examples

```sh
fs
fs validate statement.fs.json --format json
fs create candidate.json --output statement.fs.json
```

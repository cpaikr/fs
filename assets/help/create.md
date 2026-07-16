# fs create

Validate a candidate and atomically copy its exact bytes to a new path.

## Usage

`fs create <candidate|-> --output <document> [--log-level <level>]`

The candidate is a path or `-` for standard input. `--output` is required.
Use `--help` or `-h` for this reference. Logging defaults to `none`; levels are
`all`, `trace`, `debug`, `info`, `warn`, `warning`, `error`, `fatal`, and
`none`.

The candidate must be structurally conforming but may have inconsistent
calculations. The command never overwrites, creates parent directories,
reserializes JSON, or exposes a partial output.

## Examples

```sh
fs create candidate.json --output statement.fs.json
fs create - --output statement.fs.json
```

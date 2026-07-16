# fs example

List, read, or copy exact bundled FS examples.

## Usage

`fs example [--log-level <level>]`

`fs example <name> [--output <path>] [--log-level <level>]`

With no name, list examples; that form does not accept `--output`. A named
example writes exact JSON bytes to standard output unless `--output` requests
a new file. The names are `minimal` and `manufacturing-group`. Use `--help` or
`-h` for this reference.

Logging defaults to `none`; levels are `all`, `trace`, `debug`, `info`, `warn`,
`warning`, `error`, `fatal`, and `none`.

## Examples

```sh
fs example
fs example minimal
fs example manufacturing-group --output manufacturing-group.json
```

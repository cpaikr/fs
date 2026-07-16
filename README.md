# fs

Status: design phase. `fs` is a working title.

`fs` is a public format for clean, structured financial statements. It gives
people and agents one predictable artifact to produce after extracting or
authoring financial data, regardless of whether the source was a PDF,
spreadsheet, website, or manual entry.

The core product is a standalone JSON document and its validation semantics.
It is not an extraction system, accounting taxonomy, or financial-policy
engine.

## Documentation

- [Authoring guide](docs/authoring.md) defines how people and agents encode an
  author-resolved financial model.
- [Domain language](CONTEXT.md) defines the project's canonical terms.
- [Project proposal](docs/project-proposal.md) defines the product and its
  boundaries.
- [Semantic specification](docs/semantic-spec.md) is the normative V0 artifact
  and calculation contract.
- [Roadmap](ROADMAP.md) records confirmed decisions, evidence, and
  implementation order.
- [CLI design](docs/cli.md) defines command scenarios whose artifact-dependent
  outputs are fixed by the language-neutral fixtures.
- [CLI acceptance contract](docs/cli-acceptance.md) defines deterministic
  process fixtures, result encoding, exit codes, and filesystem effects.
- [V0 CLI delivery plan](docs/plans/cli-v0.md) defines the selected runtime and
  distribution, phases, gates, validation, and next implementation action.

## Current Work

The V0 artifact semantics are defined from representative JSON examples. The
newly confirmed invalid-snapshot result and numeric scale bound still require
schema and fixture alignment. The [authoring guide](docs/authoring.md) defines
how people and agents apply the contract without turning FS into an extraction
or accounting policy system.
The [semantic specification](docs/semantic-spec.md) defines the normative model
and canonical JSON mapping; [`examples/`](examples/) and [`schema/`](schema/)
contain its current evidence and machine-readable shape. Language-neutral
[conformance and result fixtures](fixtures/) provide the current consumer
evidence. The deterministic reference CLI acceptance protocol is now
defined. The selected implementation stack is strict TypeScript on Node.js with
Effect 4, `effect/unstable/cli`, and Effect logging, distributed as an npm
package with a zero-global-install `npx` path. pnpm is repository tooling only;
Bun is not required. No CLI implementation exists yet. The next phase applies
the confirmed decisions to their remaining contract artifacts and inspects the
exact candidate Effect CLI/runtime/logging source and public exports. It then
adds acceptance fixtures starting with `fs validate`. Runtime and packaging
behavior will be verified by retained tests against production code; no
throwaway CLI implementation is required.

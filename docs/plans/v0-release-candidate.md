# V0 Release Candidate Plan

Status: Active. Roadmap step 11 pre-publication work is in progress.

This plan owns live step-11 progress, validation, blockers, and the next
action. The [semantic specification](../semantic-spec.md) owns artifact
meaning, the [CLI design](../cli/design.md) owns command intent, the
[CLI acceptance contract](../cli/acceptance.md) owns observable process
behavior, and the [roadmap](../../ROADMAP.md) owns strategic sequence. The
[completed step-10 plan](statement-item-row-refactor.md) remains the verified
starting point.

## Milestone

Prepare the complete `@cpai/fs@0.1.0` release candidate on `dev`. Replace
placeholder schema identifiers, resolve the optional document `$schema`
contract, publish exact versioned schemas to the approved public host, complete
package and release metadata and configuration, and prove the packed package
across every supported operating system and Node.js line.

Stop with an unpublished release candidate. Do not change `cpaikr/fs`
visibility, merge or promote `dev` to `main`, publish to npm, create a tag or
GitHub release, or mark Roadmap step 11 complete.

## Fixed Decisions

- The npm identity is `@cpai/fs`; V0 uses package version `0.1.0` and artifact
  `formatVersion: "0.1"`.
- The owner confirms control of the CPAI npm scope. Credentials must not be
  committed or supplied to release-candidate validation.
- V0 is licensed under Apache-2.0, selected by the owner for permissive use
  with an explicit patent grant.
- The public schema host is the dedicated public
  `cpaikr/cpaikr.github.io` repository served by HTTPS GitHub Pages. The
  private `cpaikr/fs` repository stays private during this milestone.
- The immutable V0 schema base is
  `https://cpaikr.github.io/fs/schema/0.1/`. The document, validation-result,
  and snapshot-diff schemas each receive an absolute canonical `$id` under
  that base.
- An FS document may carry an optional top-level `$schema` property. When
  present, its value is exactly the document schema's canonical URL. It aids
  discovery only: full validation continues to use the bundled schema and
  semantic validator without network access.
- Published V0 schema bytes must exactly match the reviewed repository
  schemas. After V0 publication, the `0.1` URLs are immutable; an incompatible
  schema requires a new versioned path.
- The same public Pages site serves the normative semantic specification at
  `https://cpaikr.github.io/fs/spec/0.1/`; packaged guidance must not route
  public users into the private source repository.
- Delivery uses two substantial sequential PRs into `dev`: first the schema
  publication contract, then release metadata and cross-platform candidate
  verification. Each branch starts from updated `dev`; the PRs are not
  stacked.
- Cross-platform CI uses Blacksmith 2-vCPU Ubuntu and Windows runners. Because
  Blacksmith does not offer a 2-vCPU macOS runner, macOS uses its smallest
  supported 6-vCPU runner while retaining both supported Node.js lines.

## Phase State

- [x] Phase 0: establish the active plan, public host, decisions, and baseline.
- [x] Phase 1: align canonical schema identifiers and optional `$schema`
  across semantic prose, schemas, models, fixtures, examples, generated
  guidance, tests, and checks.
- [x] Phase 2: merge the reviewed schema slice; publish its exact schema bytes
  and versioned semantic specification; verify every public HTTPS resource
  before starting later work.
- [x] Phase 3: complete npm package, licensing, repository, support, and
  release configuration without publishing.
- [ ] Phase 4: make packed-package verification release-grade across every
  supported operating system and Node.js line.
- [ ] Phase 5: complete review and a requirement-by-requirement release
  candidate audit on updated `dev` while leaving Roadmap step 11 open.

## Current State

PR #9 merged Phases 0 and 1 into `dev` as merge commit `11bd7d2`, preserving
the slice's individual commits. Pages commit `63b13ad` publishes the exact
merged document, validation-result, and snapshot-diff schemas and the
versioned semantic specification. Every public resource returns HTTPS 200;
the schemas use `application/json`, allow cross-origin reads, and are
byte-identical to the repository files. AJV validates all maintained result
and diff fixtures against the downloaded schemas and their relative
cross-schema references.

The second slice defines Apache-2.0 licensing and complete public npm
metadata, replaces private and unpacked README routes with public resources,
and adds an npm publication dry run. Packed-package verification now executes
the real `prepack` lifecycle, requires an exact inventory, verifies retained
asset bytes and installed metadata, and exercises the installed CLI. The
cross-platform matrix remains the proof boundary for Phase 4; its new
release-candidate job waits for every OS/Node cell and documentation gate
before running npm's publication dry run.

## Known Temporary Drift

None.

## Validation

The clean step-10 baseline is recorded in the
[completed plan](statement-item-row-refactor.md). The Phase-0 planning slice
passes `./scripts/check-docs.sh`, including Markdown, links, maintained
guidance, schemas, examples, fixtures, and the CLI descriptor matrix.
`git diff --check` also passes. Every later contract or documentation slice
must repeat those gates; implementation and package slices must additionally
pass the full repository gate.

The Phase-1 schema cutover passes focused schema and recording tests, then the
full `pnpm verify` gate: TypeScript, strict Effect diagnostics, unit and
boundary tests, packed-process acceptance, writer integration, and installed
tarball smoke. `./scripts/check-docs.sh` passes with exact generated guidance,
canonical-ID and optional-pointer assertions, every schema and fixture, and
the complete CLI descriptor matrix. `git diff --check` passes. Fresh contract
review applied two wording and example clarity fixes and then found no
remaining material correctness, design, validation, or plan-coverage gap.

PR #9 received completed Codex and CodeRabbit review. Codex reported no
finding. CodeRabbit's three findings are fixed in `6aa8991`, validated with the
focused and full gates, replied to, and resolved. Its final CI run
`29623796785` passed documentation and all six Blacksmith OS/Node matrix cells
on head `c4ed1fc`. A final local code-review pass found no material issue in
the runner migration.

Pages deployment `29624021568` succeeded for commit `63b13ad`. Direct
downloads confirmed the public schemas' status, content type, CORS header,
byte identity, and cross-file reference behavior before this second branch
started from updated `dev`.

The Phase-3 and local Phase-4 slice passes `pnpm release:check`: documentation
and fixture contracts, TypeScript, strict Effect diagnostics, 163 tests, all
121 packed-process acceptance cases, writer crash and concurrency integration,
the exact 44-file installed tarball, and npm's publication dry run. The
Apache-2.0 file matches the canonical Apache text, workflow YAML parses, and
`git diff --check` passes. Independent implementation and design review found
no Bucket-I or Bucket-II issue; the remaining risk is intentionally delegated
to the PR's exact-head Blacksmith matrix and dependent dry-run job.

## Blockers

None.

## Next Action

Complete local release-gate validation and review, then open the second PR and
prove its exact head through every Blacksmith OS/Node matrix cell, the
documentation gate, and the dependent npm publication dry run.

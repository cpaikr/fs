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
- CPAI owns the npm scope. Authenticated ownership evidence is still required
  before the final candidate gate; credentials must not be committed.
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

## Phase State

- [x] Phase 0: establish the active plan, public host, decisions, and baseline.
- [x] Phase 1: align canonical schema identifiers and optional `$schema`
  across semantic prose, schemas, models, fixtures, examples, generated
  guidance, tests, and checks.
- [ ] Phase 2: merge the reviewed schema slice; publish its exact schema bytes
  and versioned semantic specification; verify every public HTTPS resource
  before starting later work.
- [ ] Phase 3: complete npm package, licensing, repository, support, and
  release configuration without publishing.
- [ ] Phase 4: make packed-package verification release-grade across every
  supported operating system and Node.js line.
- [ ] Phase 5: complete review and a requirement-by-requirement release
  candidate audit on updated `dev` while leaving Roadmap step 11 open.

## Current State

The completed step-10 state on `dev` is the baseline. This active plan and its
documentation-index route are established. The dedicated public
`cpaikr/cpaikr.github.io` repository now exists and GitHub Pages is enabled at
`https://cpaikr.github.io/` with enforced HTTPS. It does not yet publish FS
schemas. The Phase-1 source cutover assigns all three shipped schema IDs,
removes the unnecessary internal CLI descriptor ID, permits only the optional
exact document pointer, preserves it through recording, and aligns the owning
prose, generated guidance, example, invalid fixture, tests, and checks.
The public semantic specification is deployed from Pages commit `ac0d330` and
returns HTTPS 200 at its versioned URL.

The first PR owns Phases 0 and 1. After it is reviewed and merged, the
reviewed schema bytes will be copied to the public host and verified before a
fresh second branch starts from updated `dev`.

## Known Temporary Drift

- Public schema URLs do not serve the repository schemas yet.

This drift is confined to the reviewed publication boundary. It must be closed
immediately after the first PR merges and before the second branch starts.

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

## Blockers

The repository contains no licensing decision or license file. The owner must
select the public release license before Phase 3 can complete; no license will
be inferred.

## Next Action

Complete the Phase-1 PR's required reviews and merge it into `dev`, then
publish and verify the exact schema bytes before starting Phase 2.

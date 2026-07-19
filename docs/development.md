# Development

This guide owns source-repository setup, local execution, and validation
commands. The completed [V0 release plan](plans/v0-release-candidate.md) records
release evidence; future active plans own their live status and next action.

## Prerequisites

Use a Node.js version allowed by [`package.json`](../package.json) and the
package-manager version declared there. Enable that pinned pnpm release with
Corepack before installing dependencies:

```sh
corepack enable
package_manager="$(node -p 'require("./package.json").packageManager')"
corepack prepare "$package_manager" --activate
pnpm install --frozen-lockfile --ignore-scripts
```

Dependencies and Effect packages are intentionally pinned. Update them only as
one reviewed dependency change with the lockfile.

## Run locally

Build the package, then invoke the same executable that the npm package ships:

```sh
pnpm build
node dist/bin.js --help
node dist/bin.js validate examples/minimal.json
```

The CLI reads bundled assets relative to the built package root. Running the
compiled entry point is therefore the representative local boundary.

## Validate changes

Use the narrowest relevant command while iterating, then run the complete gate
for a reviewable implementation slice:

```sh
# Targeted checks while iterating:
pnpm typecheck
pnpm check:effect
pnpm test
pnpm check:docs
pnpm audit:prod

# Implementation-only and complete repository gates:
pnpm verify
pnpm check
git diff --check
```

`pnpm verify` covers type and Effect diagnostics, unit tests, packed-process
acceptance, writer integration, and installed-package checks. `pnpm check`
adds the documentation and contract-artifact gate. `pnpm release:check` also
runs npm's publication dry run; it does not publish the package.
`pnpm audit:prod` is the explicit production-dependency vulnerability gate.

`pnpm check:docs` invokes the repository-required `./scripts/check-docs.sh`.
Its executables are exact lockfile dependencies and require the repository's
frozen, lifecycle-disabled install. Run it after changing documentation,
schemas, examples, or fixtures.

## CI change scope

CI always runs its documentation and contract-artifact gate. A fail-closed
changed-path classifier in [the CI workflow](../.github/workflows/ci.yml)
allows guidance-only changes to skip the supported-runtime matrix, production
dependency audit, and npm publication check. Any path outside the workflow's
explicit safe set, an unavailable comparison commit, or an empty comparison
runs the complete CI gate.

The expensive jobs use job-level conditions so skipped jobs conclude
successfully for required-check purposes. Keep this classification inside the
workflow rather than adding workflow trigger path filters, which can leave a
required workflow check pending when no run is created.

## Documentation and generated guidance

The [documentation index](README.md) identifies the owner for each contract.
Change the owning document first and update summaries by reference.

`docs/authoring.md` owns the authoring decision boundary and durable policy.
`content/guide/authoring.md.template` owns the exact portable operational
procedure shared by the bundled authoring guide and repository-distributed
Agent Skill.
`scripts/render-guide.mjs` owns Skill-only routing, frontmatter, OpenAI
metadata, and the exact npm command and availability note. The renderer exposes
the installed and version-pinned forms:

```sh
node scripts/render-guide.mjs --installed > assets/guide/authoring.md
package_version="$(node -p 'require("./package.json").version')"
node scripts/render-guide.mjs --skill-version "$package_version" \
  > skills/author-fs/SKILL.md
```

After regenerating the maintained files, run `pnpm check:docs`. It also checks
the package-facing README's pinned identity and version against `package.json`.
Do not edit generated guidance independently of the template.

## Package boundary

Use `pnpm pack:check` to run the real prepack lifecycle, inspect the exact
tarball inventory and retained asset bytes, install the tarball in isolation,
and exercise its CLI. Use `pnpm release:check` only for an authorized release
candidate validation; publication, tagging, and release creation are separate
actions.

The dependent CI publication check runs npm's publication dry run while the
package version is unpublished. Once that version exists, it compares the
local dry-run pack SHA-1 and SHA-512 integrity with npm. Matching bytes confirm
the published artifact; changed bytes confirm packing still succeeds and
require Release Please to assign the next version before publication.

## Release management

Release Please owns package version changes, the release manifest,
`CHANGELOG.md`, release tags, and GitHub releases. Conventional Commits on
`main` supply its release inputs. Do not edit generated release artifacts
manually.

The Release Please workflow deliberately separates preparation from release:

- a push to `main` creates or updates the release PR without tagging; and
- a manual workflow dispatch creates the tag and GitHub release without
  opening a release PR, but only after it verifies the repository is public
  and the manifest version is already available from npm.

Merge a release PR only after its version, changelog, package boundary, and CI
are reviewed. Make the repository public, publish and verify that exact package
version, then dispatch the workflow against `main` so a failed publication
cannot leave a successful GitHub release behind.

The initial manifest starts at `0.0.0`. The setup commit carries the one-time
`Release-As: 0.1.0` input because the already-verified V0 package metadata is
`0.1.0`. Before `1.0.0`, features bump the patch version and breaking changes
bump the minor version.

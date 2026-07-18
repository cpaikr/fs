# Development

This guide owns source-repository setup, local execution, and validation
commands. The [active release plan](plans/v0-release-candidate.md) owns live
release status and the next action.

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

## Documentation and generated guidance

The [documentation index](README.md) identifies the owner for each contract.
Change the owning document first and update summaries by reference.

`content/guide/authoring.md.template` is the maintained source for the bundled
authoring guide and repository-distributed Agent Skill. The renderer exposes
the exact installed and version-pinned forms:

```sh
node scripts/render-guide.mjs --installed > assets/guide/authoring.md
package_version="$(node -p 'require("./package.json").version')"
node scripts/render-guide.mjs --skill-version "$package_version" \
  > skills/author-fs/SKILL.md
```

After regenerating the maintained files, run `pnpm check:docs`. Do not edit
generated guidance independently of the template.

## Package boundary

Use `pnpm pack:check` to run the real prepack lifecycle, inspect the exact
tarball inventory and retained asset bytes, install the tarball in isolation,
and exercise its CLI. Use `pnpm release:check` only for an authorized release
candidate validation; publication, tagging, and release creation are separate
actions.

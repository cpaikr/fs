#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = resolve(
  repositoryRoot,
  "content/guide/authoring.md.template",
);
const installedPath = resolve(repositoryRoot, "assets/guide/authoring.md");
const packagePath = resolve(repositoryRoot, "package.json");
const skillPath = resolve(
  repositoryRoot,
  ".agents/skills/author-fs/SKILL.md",
);
const skillMetadataPath = resolve(
  repositoryRoot,
  ".agents/skills/author-fs/agents/openai.yaml",
);
const placeholder = "{{FS_COMMAND}}";
const skillFrontmatter = `---
name: author-fs
description: >-
  Encode and validate complete FS financial-statement documents from
  author-resolved models. Use when an agent must create or repair an FS JSON
  document without inferring missing financial meanings, values, taxonomy,
  calculations, or source mappings.
---

`;
const skillMetadata = `interface:
  display_name: "Author FS Documents"
  short_description: "Encode and validate resolved financial statements"
  default_prompt: "Use $author-fs to encode this resolved financial model as a conforming FS document."
`;

const isNumericIdentifier = (value) =>
  /^(?:0|[1-9][0-9]*)$/.test(value);
const isSemVerIdentifier = (value) => /^[0-9A-Za-z-]+$/.test(value);

const isExactSemVer = (value) => {
  const plus = value.indexOf("+");
  if (plus !== -1 && value.indexOf("+", plus + 1) !== -1) return false;

  const versionAndPreRelease = plus === -1 ? value : value.slice(0, plus);
  const build = plus === -1 ? undefined : value.slice(plus + 1);
  const hyphen = versionAndPreRelease.indexOf("-");
  const core =
    hyphen === -1
      ? versionAndPreRelease
      : versionAndPreRelease.slice(0, hyphen);
  const preRelease =
    hyphen === -1 ? undefined : versionAndPreRelease.slice(hyphen + 1);

  const coreIdentifiers = core.split(".");
  if (
    coreIdentifiers.length !== 3 ||
    !coreIdentifiers.every(isNumericIdentifier)
  ) {
    return false;
  }

  if (preRelease !== undefined) {
    const identifiers = preRelease.split(".");
    if (
      identifiers.some(
        (identifier) =>
          !isSemVerIdentifier(identifier) ||
          (/^[0-9]+$/.test(identifier) && !isNumericIdentifier(identifier)),
      )
    ) {
      return false;
    }
  }

  if (
    build !== undefined &&
    build.split(".").some((identifier) => !isSemVerIdentifier(identifier))
  ) {
    return false;
  }

  return true;
};

const render = (command) => {
  const template = readFileSync(templatePath, "utf8");
  if (!template.includes(placeholder)) {
    throw new Error(`Guide template does not contain ${placeholder}`);
  }
  const rendered = template.replaceAll(placeholder, command);
  if (rendered.includes("{{")) {
    throw new Error("Guide template contains an unresolved placeholder");
  }
  return rendered;
};

const renderSkill = (version) => {
  if (!isExactSemVer(version)) {
    throw new Error("The package version must be an exact npm version");
  }
  return skillFrontmatter + render(`npx -y @cpai/fs@${version}`);
};

const packageVersion = () => {
  const value = JSON.parse(readFileSync(packagePath, "utf8")).version;
  if (typeof value !== "string" || !isExactSemVer(value)) {
    throw new Error("package.json version must be an exact npm version");
  }
  return value;
};

const arguments_ = process.argv.slice(2);

if (arguments_.length === 1 && arguments_[0] === "--check-installed") {
  const expected = render("fs");
  const actual = readFileSync(installedPath, "utf8");
  if (actual !== expected) {
    process.stderr.write(
      "assets/guide/authoring.md is stale; render the installed guide\n",
    );
    process.exitCode = 1;
  }
} else if (arguments_.length === 1 && arguments_[0] === "--installed") {
  process.stdout.write(render("fs"));
} else if (arguments_.length === 1 && arguments_[0] === "--check-skill") {
  const expected = renderSkill(packageVersion());
  const actual = readFileSync(skillPath, "utf8");
  if (actual !== expected) {
    process.stderr.write(
      ".agents/skills/author-fs/SKILL.md is stale; render the Agent Skill\n",
    );
    process.exitCode = 1;
  }
  const actualMetadata = readFileSync(skillMetadataPath, "utf8");
  if (actualMetadata !== skillMetadata) {
    process.stderr.write(
      ".agents/skills/author-fs/agents/openai.yaml is stale\n",
    );
    process.exitCode = 1;
  }
} else if (arguments_.length === 1 && arguments_[0] === "--npx-template") {
  process.stdout.write(render("npx -y @cpai/fs@<version>"));
} else if (arguments_.length === 2 && arguments_[0] === "--npx-version") {
  const version = arguments_[1];
  if (!isExactSemVer(version)) {
    process.stderr.write("The package version must be an exact npm version\n");
    process.exitCode = 2;
  } else {
    process.stdout.write(render(`npx -y @cpai/fs@${version}`));
  }
} else if (arguments_.length === 2 && arguments_[0] === "--skill-version") {
  try {
    process.stdout.write(renderSkill(arguments_[1]));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
} else {
  process.stderr.write(
    "Usage: render-guide.mjs --check-installed | --check-skill | " +
      "--installed | --npx-template | --npx-version <version> | " +
      "--skill-version <version>\n",
  );
  process.exitCode = 2;
}

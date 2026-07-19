#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = resolve(
  repositoryRoot,
  "content/guide/authoring.md.template",
);
const installedPath = resolve(repositoryRoot, "assets/guide/authoring.md");
const readmePath = resolve(repositoryRoot, "README.md");
const packagePath = resolve(repositoryRoot, "package.json");
const skillPath = resolve(
  repositoryRoot,
  "skills/author-fs/SKILL.md",
);
const skillMetadataPath = resolve(
  repositoryRoot,
  "skills/author-fs/agents/openai.yaml",
);
const commandPlaceholder = "{{FS_COMMAND}}";
const versionNotePlaceholder = "{{FS_VERSION_NOTE}}";
const sourceIntakePlaceholder = "{{FS_SOURCE_INTAKE}}";
const skillName = "author-fs";
const skillDescription =
  "Author FS documents from resolved financial models or source materials " +
  "that must first be explored and resolved. Use when converting financial " +
  "statements from spreadsheets, PDFs, images, webpages, or other imperfect " +
  "inputs into a conforming FS JSON document, or repairing structural " +
  "diagnostics after the financial model is resolved.";
const skillDisplayName = "Author FS Documents";
const skillShortDescription = "Resolve source statements, then encode or repair FS";
const skillDefaultPrompt =
  "Use $author-fs to resolve these financial source materials when needed, " +
  "then encode or repair them as a conforming FS document.";
const skillFrontmatter = `---
name: ${skillName}
description: ${JSON.stringify(skillDescription)}
---

`;
const skillMetadata = `interface:
  display_name: ${JSON.stringify(skillDisplayName)}
  short_description: ${JSON.stringify(skillShortDescription)}
  default_prompt: ${JSON.stringify(skillDefaultPrompt)}
`;

const validateSkillDefinition = () => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skillName) || skillName.length > 64) {
    throw new Error("Agent Skill name must be a kebab-case name of at most 64 characters");
  }
  if (basename(dirname(skillPath)) !== skillName) {
    throw new Error("Agent Skill directory must match its name");
  }
  if (skillDescription.length === 0 || skillDescription.length > 1024) {
    throw new Error("Agent Skill description must contain at most 1024 characters");
  }
  if (skillShortDescription.length < 25 || skillShortDescription.length > 64) {
    throw new Error("Agent Skill short description must contain 25-64 characters");
  }
  if (!skillDefaultPrompt.includes(`$${skillName}`)) {
    throw new Error("Agent Skill default prompt must name the Skill");
  }
};

validateSkillDefinition();

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

const render = (command, versionNote = "", sourceIntake = "") => {
  const template = readFileSync(templatePath, "utf8");
  for (const placeholder of [
    commandPlaceholder,
    versionNotePlaceholder,
    sourceIntakePlaceholder,
  ]) {
    if (!template.includes(placeholder)) {
      throw new Error(`Guide template does not contain ${placeholder}`);
    }
  }
  const rendered = template
    .replaceAll(commandPlaceholder, command)
    .replaceAll(versionNotePlaceholder, versionNote)
    .replaceAll(sourceIntakePlaceholder, sourceIntake);
  if (rendered.includes("{{")) {
    throw new Error("Guide template contains an unresolved placeholder");
  }
  return rendered;
};

const packageMetadata = () => {
  const manifest = JSON.parse(readFileSync(packagePath, "utf8"));
  if (
    typeof manifest.name !== "string" ||
    !/^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/.test(manifest.name)
  ) {
    throw new Error("package.json name must be an exact scoped npm package name");
  }
  if (typeof manifest.version !== "string" || !isExactSemVer(manifest.version)) {
    throw new Error("package.json version must be an exact npm version");
  }
  return { name: manifest.name, version: manifest.version };
};

const checkReadmePackageIdentity = ({ name, version }) => {
  const readme = readFileSync(readmePath, "utf8");
  const exactPackage = `${name}@${version}`;
  const packageCommands = [
    ...readme.matchAll(
      /(?:npx -y|npm install --global)\s+(@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*@[0-9A-Za-z.+-]+)/gu,
    ),
  ].map((match) => match[1]);
  if (
    !readme.startsWith(`# \`${name}\`\n`) ||
    !readme.includes(`\`${name}\` is`) ||
    packageCommands.length === 0 ||
    packageCommands.some((specifier) => specifier !== exactPackage)
  ) {
    throw new Error("README.md package identity or version is stale");
  }
};

const renderSkill = (name, version) => {
  if (!isExactSemVer(version)) {
    throw new Error("The package version must be an exact npm version");
  }
  const exactPackage = `${name}@${version}`;
  const versionNote =
    `This Skill uses \`${exactPackage}\`.\n` +
    "Its pinned commands are the package-availability check: continue only when\n" +
    "they resolve from npm. Report a block instead of substituting an unpinned\n" +
    "tag or another version.\n\n";
  const sourceIntake =
    "## Resolve Source Material When Needed\n\n" +
    "When the supplied material is not already an author-resolved financial\n" +
    "model, read the [source-input guide](guides/resolving-inputs.md) before\n" +
    "encoding. Use it to recover the prerequisite model; it does not extend\n" +
    "the FS artifact boundary.\n\n";
  return (
    skillFrontmatter +
    render(`npx -y ${exactPackage}`, versionNote, sourceIntake)
  );
};

const arguments_ = process.argv.slice(2);
const package_ = packageMetadata();

if (arguments_.length === 1 && arguments_[0] === "--check-installed") {
  const expected = render("fs");
  const actual = readFileSync(installedPath, "utf8");
  if (actual !== expected) {
    process.stderr.write(
      "assets/guide/authoring.md is stale; render the installed guide\n",
    );
    process.exitCode = 1;
  }
} else if (arguments_.length === 1 && arguments_[0] === "--check-readme") {
  checkReadmePackageIdentity(package_);
} else if (arguments_.length === 1 && arguments_[0] === "--installed") {
  process.stdout.write(render("fs"));
} else if (arguments_.length === 1 && arguments_[0] === "--check-skill") {
  const expected = renderSkill(package_.name, package_.version);
  const actual = readFileSync(skillPath, "utf8");
  if (actual !== expected) {
    process.stderr.write(
      "skills/author-fs/SKILL.md is stale; render the Agent Skill\n",
    );
    process.exitCode = 1;
  }
  const actualMetadata = readFileSync(skillMetadataPath, "utf8");
  if (actualMetadata !== skillMetadata) {
    process.stderr.write(
      "skills/author-fs/agents/openai.yaml is stale\n",
    );
    process.exitCode = 1;
  }
} else if (arguments_.length === 1 && arguments_[0] === "--npx-template") {
  process.stdout.write(render(`npx -y ${package_.name}@<version>`));
} else if (arguments_.length === 2 && arguments_[0] === "--npx-version") {
  const version = arguments_[1];
  if (!isExactSemVer(version)) {
    process.stderr.write("The package version must be an exact npm version\n");
    process.exitCode = 2;
  } else {
    process.stdout.write(render(`npx -y ${package_.name}@${version}`));
  }
} else if (arguments_.length === 2 && arguments_[0] === "--skill-version") {
  try {
    process.stdout.write(renderSkill(package_.name, arguments_[1]));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
} else {
  process.stderr.write(
    "Usage: render-guide.mjs --check-installed | --check-readme | " +
      "--check-skill | " +
      "--installed | --npx-template | --npx-version <version> | " +
      "--skill-version <version>\n",
  );
  process.exitCode = 2;
}

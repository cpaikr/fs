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
const sourceReviewPlaceholder = "{{FS_SOURCE_REVIEW}}";
const skillName = "author-fs";
const skillDescription =
  "Organize financial statements into conforming FS documents. Use when " +
  "source statements in spreadsheets, PDFs, images, webpages, or other " +
  "imperfect inputs must be explored and resolved before encoding, when an " +
  "FS JSON document must be compared with source material, when an " +
  "already-resolved financial model must be encoded, or when an existing FS " +
  "JSON document needs structural repair.";
const skillDisplayName = "Author FS Documents";
const skillShortDescription = "Create, compare, and repair conforming FS documents";
const skillDefaultPrompt =
  "Use $author-fs to create, compare, or repair an FS document from the " +
  "supplied materials.";
// Release Please owns package.json. Keep package-facing guidance pinned to the
// package version that will first ship the target artifact contract.
const targetPackageVersion = "0.2.0";
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

const render = (
  command,
  versionNote = "",
  sourceIntake = "",
  sourceReview = "",
) => {
  const template = readFileSync(templatePath, "utf8");
  for (const placeholder of [
    commandPlaceholder,
    versionNotePlaceholder,
    sourceIntakePlaceholder,
    sourceReviewPlaceholder,
  ]) {
    if (!template.includes(placeholder)) {
      throw new Error(`Guide template does not contain ${placeholder}`);
    }
  }
  const rendered = template
    .replaceAll(commandPlaceholder, command)
    .replaceAll(versionNotePlaceholder, versionNote)
    .replaceAll(sourceIntakePlaceholder, sourceIntake)
    .replaceAll(sourceReviewPlaceholder, sourceReview);
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

const checkReadmePackageIdentity = ({ name }) => {
  const readme = readFileSync(readmePath, "utf8");
  const exactPackage = `${name}@${targetPackageVersion}`;
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
    "## Choose the Authoring Branch\n\n" +
    "Choose one branch before resolving the encoding inputs:\n\n" +
    "- **Source material conversion:** Use this branch when the user supplies\n" +
    "  financial statements or asks to organize, structure, or convert statements\n" +
    "  without an already-resolved model. Inventory the source artifacts available\n" +
    "  in the task, then read the\n" +
    "  [source-input guide](guides/resolving-inputs.md). If no source material is\n" +
    "  accessible, request it. Use the guide to resolve the prerequisite model,\n" +
    "  continue through create preparation and reference validation, then complete\n" +
    "  its mandatory source-fidelity comparison before creating the deliverable.\n" +
    "- **Source comparison:** Use this branch when the user supplies an existing FS\n" +
    "  JSON document and source material, or asks to double-check, validate, or\n" +
    "  compare FS JSON against a source. Preserve the document unchanged, inventory\n" +
    "  the source artifacts, and read the source-input guide. Skip **Resolve Inputs**\n" +
    "  and the create or repair choice in Step 2: load the contract, validate the\n" +
    "  unchanged document in Step 3, and then complete the mandatory source-fidelity\n" +
    "  comparison. Do not repair or reinterpret the document unless the user also\n" +
    "  asks for changes.\n" +
    "- **Resolved model:** When all prerequisite financial choices are already\n" +
    "  supplied, continue with the create branch.\n" +
    "- **Existing FS JSON without a source-comparison request:** Continue with the\n" +
    "  repair branch. Preserve its financial choices and validate the unchanged\n" +
    "  candidate first.\n\n";
  const sourceReview =
    "\n### Mandatory Source-Fidelity Comparison for Skill Source Routes\n\n" +
    "Apply this section after the complete FS JSON candidate exists and Step 3\n" +
    "reports conforming status, for both source material conversion and explicit\n" +
    "source comparison. Render the exact candidate to a fresh scratch path:\n\n" +
    "```sh\n" +
    `npx -y ${exactPackage} render --output candidate-review.html candidate.json\n` +
    "```\n\n" +
    "When rendering succeeds, follow the source-input guide's source-fidelity gate.\n" +
    "Compare the rendered HTML with the original source using judgment; do not\n" +
    "substitute a scripted diff, deterministic matcher, or JSON-to-source\n" +
    "comparison. The validator and rendered HTML answer different questions: retain\n" +
    "deterministic validation for FS conformance and use the visual review for\n" +
    "source fidelity.\n\n" +
    "For a conversion, correct supported discrepancies, repeat validation, and\n" +
    "render every revision to a new scratch path. Continue to Step 4 only after the\n" +
    "comparison passes. Never change financial meaning merely to make a conforming\n" +
    "candidate render. For an explicit comparison of an existing document, do not\n" +
    "silently change it. Report discrepancies with useful evidence; if none are found,\n" +
    "report that concisely. Keep the review HTML and other intermediate evidence\n" +
    "internal unless the user requests them or they help explain a discrepancy. If the\n" +
    "unchanged document cannot validate or render, report that blocker rather\n" +
    "than claiming the comparison is complete.\n";
  return (
    skillFrontmatter +
    render(`npx -y ${exactPackage}`, versionNote, sourceIntake, sourceReview)
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
  const expected = renderSkill(package_.name, targetPackageVersion);
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

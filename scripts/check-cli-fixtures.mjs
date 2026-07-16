#!/usr/bin/env node

import {
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";

const repositoryRoot = realpathSync(
  resolve(dirname(fileURLToPath(import.meta.url)), ".."),
);
const fixtureRoot = resolve(repositoryRoot, "fixtures/cli");
const caseRoot = resolve(fixtureRoot, "cases");
const manifestPath = resolve(fixtureRoot, "manifest.json");

const fail = (message) => {
  throw new Error(message);
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const listJsonFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return listJsonFiles(path);
      return entry.isFile() && entry.name.endsWith(".json") ? [path] : [];
    })
    .sort();

const normalizeRepositoryFile = (reference, context) => {
  if (
    reference.includes("\\") ||
    reference.includes("\0") ||
    isAbsolute(reference) ||
    /^[A-Za-z]:/u.test(reference) ||
    reference.startsWith("//")
  ) {
    return fail(`${context}: repository file must be a slash-only relative path`);
  }
  const candidate = resolve(fixtureRoot, reference);
  let real;
  try {
    real = realpathSync(candidate);
  } catch {
    return fail(`${context}: missing file ${reference}`);
  }
  const withinRepository =
    real === repositoryRoot || real.startsWith(`${repositoryRoot}${sep}`);
  if (!withinRepository || !lstatSync(real).isFile()) {
    return fail(`${context}: reference must be a repository file: ${reference}`);
  }
  return real;
};

const decodePointerToken = (token, context) => {
  if (/~(?:[^01]|$)/.test(token)) fail(`${context}: invalid JSON Pointer escape`);
  return token.replaceAll("~1", "/").replaceAll("~0", "~");
};

const resolvePointer = (value, pointer, context) => {
  if (pointer === "") return value;
  if (!pointer.startsWith("/")) fail(`${context}: invalid JSON Pointer ${pointer}`);
  return pointer
    .slice(1)
    .split("/")
    .map((token) => decodePointerToken(token, context))
    .reduce((current, token) => {
      if (
        current === null ||
        typeof current !== "object" ||
        !Object.hasOwn(current, token)
      ) {
        fail(`${context}: JSON Pointer does not resolve: ${pointer}`);
      }
      return current[token];
    }, value);
};

const validatePointerSyntax = (pointer, context) => {
  if (pointer === "") return;
  if (!pointer.startsWith("/")) fail(`${context}: invalid JSON Pointer ${pointer}`);
  pointer
    .slice(1)
    .split("/")
    .forEach((token) => decodePointerToken(token, context));
};

const jsonEqual = (left, right) => isDeepStrictEqual(left, right);

const assertUnique = (values, context) => {
  if (new Set(values).size !== values.length) fail(`${context}: duplicate value`);
};

const assertWorkspacePath = (path, context) => {
  if (!/^[A-Za-z0-9_-][A-Za-z0-9._-]*(?:\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/u.test(path)) {
    fail(`${context}: unsafe workspace path ${path}`);
  }
};

const assertNoPathCollisions = (paths, context) => {
  const folded = paths.map((path) => path.toLowerCase());
  for (let index = 0; index < folded.length; index += 1) {
    for (let other = index + 1; other < folded.length; other += 1) {
      if (
        folded[index] === folded[other] ||
        folded[index].startsWith(`${folded[other]}/`) ||
        folded[other].startsWith(`${folded[index]}/`)
      ) {
        fail(`${context}: colliding paths ${paths[index]} and ${paths[other]}`);
      }
    }
  }
};

const pointerForMember = (pointer, member) => {
  const encoded = member.replaceAll("~", "~0").replaceAll("/", "~1");
  return `${pointer}/${encoded}`;
};

const validateJsonMatcher = (matcher, context) => {
  const arrays = matcher.arrays ?? [];
  const memberPointers = matcher.members.map(({ pointer }) => pointer);
  const equalityPointers = matcher.equalities.map(({ pointer }) => pointer);
  const arrayPointers = arrays.map(({ pointer }) => pointer);
  const valuePointers = [
    ...arrayPointers,
    ...equalityPointers,
    ...matcher.nonemptyStrings,
  ];
  [...memberPointers, ...valuePointers].forEach((pointer) =>
    validatePointerSyntax(pointer, context),
  );
  assertUnique(memberPointers, `${context} members`);
  assertUnique(arrayPointers, `${context} arrays`);
  assertUnique(equalityPointers, `${context} equalities`);
  assertUnique(matcher.nonemptyStrings, `${context} nonempty strings`);
  if (!memberPointers.includes("")) {
    fail(`${context}: JSON matcher must fix the root member set`);
  }
  assertUnique(
    [...memberPointers.filter((pointer) => pointer !== ""), ...valuePointers],
    `${context} assertion pointers`,
  );

  const assertedPointers = new Set([...memberPointers, ...valuePointers]);
  for (const memberSet of matcher.members) {
    for (const member of memberSet.equals) {
      const childPointer = pointerForMember(memberSet.pointer, member);
      if (!assertedPointers.has(childPointer)) {
        fail(`${context}: object member is not value-constrained: ${childPointer}`);
      }
    }
  }

  for (const equality of matcher.equalities) {
    if (equality.equalsFile) {
      const path = normalizeRepositoryFile(
        equality.equalsFile.file,
        `${context} ${equality.pointer}`,
      );
      const json = readJson(path);
      if (equality.equalsFile.pointer !== undefined) {
        resolvePointer(
          json,
          equality.equalsFile.pointer,
          `${context} equalsFile`,
        );
      }
    }
    if (equality.equalsSelected) {
      const selection = equality.equalsSelected;
      const path = normalizeRepositoryFile(
        selection.file,
        `${context} ${equality.pointer}`,
      );
      const json = readJson(path);
      const candidates = resolvePointer(
        json,
        selection.arrayPointer,
        `${context} selection array`,
      );
      if (!Array.isArray(candidates)) {
        fail(`${context}: selected value must be an array`);
      }
      const matches = candidates.filter((candidate) =>
        jsonEqual(
          resolvePointer(
            candidate,
            selection.wherePointer,
            `${context} selection predicate`,
          ),
          selection.whereEquals,
        ),
      );
      if (matches.length !== 1) {
        fail(`${context}: JSON selection must match exactly one value`);
      }
      resolvePointer(
        matches[0],
        selection.valuePointer,
        `${context} selection value`,
      );
    }
  }
};

const validateByteReference = (value, context) => {
  if (value?.file !== undefined) {
    normalizeRepositoryFile(value.file, context);
  }
  if (value?.equalsFile !== undefined) {
    normalizeRepositoryFile(value.equalsFile, context);
  }
};

const logLevels = new Set(["trace", "debug", "info", "warn", "error", "fatal"]);
const forbiddenLogFields = new Set([
  "timestamp",
  "time",
  "fiberId",
  "runtimeId",
  "span",
  "spans",
  "document",
  "documentContents",
  "rawMessage",
  "dependencyMessage",
  "cause",
  "stack",
]);

const validateLogRecord = (record, context) => {
  if (
    record === null ||
    Array.isArray(record) ||
    typeof record !== "object" ||
    !logLevels.has(record.level) ||
    typeof record.event !== "string" ||
    record.event.length === 0 ||
    typeof record.operation !== "string" ||
    record.operation.length === 0
  ) {
    fail(`${context}: log record is missing its stable fields`);
  }
  for (const field of Object.keys(record)) {
    if (forbiddenLogFields.has(field)) {
      fail(`${context}: forbidden log field ${field}`);
    }
  }
  for (const [field, value] of Object.entries(record)) {
    if (
      !["level", "event", "operation"].includes(field) &&
      !["string", "number", "boolean"].includes(typeof value)
    ) {
      fail(`${context}: log context field ${field} must be a bounded scalar`);
    }
  }
};

const validateJsonLinesFile = (reference, context) => {
  const path = normalizeRepositoryFile(reference, context);
  const contents = readFileSync(path, "utf8");
  if (!contents.endsWith("\n")) {
    fail(`${context}: exact JSON Lines must end with LF`);
  }
  const lines = contents.slice(0, -1).split("\n");
  if (lines.length === 0 || lines.some((line) => line.length === 0)) {
    fail(`${context}: exact JSON Lines cannot contain empty records`);
  }
  for (const line of lines) {
    const record = JSON.parse(line);
    validateLogRecord(record, context);
    if (
      JSON.stringify(record) !== line
    ) {
      fail(`${context}: JSON Lines records must be compact objects`);
    }
  }
};

const validateTree = (tree, context) => {
  const created = tree.created.map(({ path }) => path);
  const all = [...created, ...tree.unchanged, ...tree.absent];
  all.forEach((path) => assertWorkspacePath(path, context));
  assertUnique(all, `${context} filesystem states`);
  assertNoPathCollisions(all, `${context} filesystem states`);
  for (const file of tree.created) {
    if (file.equalsFile !== undefined) {
      normalizeRepositoryFile(file.equalsFile, `${context} created ${file.path}`);
    }
  }
};

const manifest = readJson(manifestPath);
if (manifest.formatVersion !== "0.1" || !Array.isArray(manifest.cases)) {
  fail("fixtures/cli/manifest.json has an invalid shape");
}
assertUnique(manifest.cases, "CLI manifest paths");
const sortedManifest = [...manifest.cases].sort();
if (!jsonEqual(manifest.cases, sortedManifest)) {
  fail("CLI manifest paths must be in lexical order");
}

const actualCases = listJsonFiles(caseRoot).map((path) =>
  relative(fixtureRoot, path).split(sep).join("/"),
);
if (!jsonEqual(manifest.cases, actualCases)) {
  fail("CLI manifest coverage differs from cases on disk");
}

const identifiers = [];
for (const caseReference of manifest.cases) {
  const casePath = resolve(fixtureRoot, caseReference);
  const descriptor = readJson(casePath);
  const context = `CLI case ${descriptor.id ?? caseReference}`;
  identifiers.push(descriptor.id);

  const stagedPaths = descriptor.workspace.map(({ copy, to }) => {
    normalizeRepositoryFile(copy, `${context} workspace`);
    assertWorkspacePath(to, `${context} workspace`);
    return to;
  });
  assertUnique(stagedPaths, `${context} staged paths`);
  validateByteReference(descriptor.stdin, `${context} stdin`);

  if (descriptor.expect.stdout.encoding === "json") {
    validateJsonMatcher(descriptor.expect.stdout, `${context} stdout`);
  } else {
    validateByteReference(descriptor.expect.stdout, `${context} stdout`);
  }
  validateByteReference(descriptor.expect.stderr, `${context} stderr`);
  if (descriptor.expect.stderr.encoding === "json-lines") {
    if (descriptor.expect.stderr.equalsFile !== undefined) {
      validateJsonLinesFile(
        descriptor.expect.stderr.equalsFile,
        `${context} stderr`,
      );
    } else if (
      descriptor.expect.stderr.contains.length === 0 ||
      descriptor.expect.stderr.contains.some(
        (record) => Object.keys(record).length === 0,
      )
    ) {
      fail(`${context}: JSON Lines matcher records cannot be empty`);
    } else {
      descriptor.expect.stderr.contains.forEach((record) =>
        validateLogRecord(record, `${context} stderr`),
      );
    }
  }

  const workspaceState = descriptor.expect.filesystem.workspace;
  const homeState = descriptor.expect.filesystem.home;
  validateTree(workspaceState, `${context} workspace`);
  validateTree(homeState, `${context} home`);
  for (const stagedPath of stagedPaths) {
    if (!workspaceState.unchanged.includes(stagedPath)) {
      fail(`${context}: staged file must be expected unchanged: ${stagedPath}`);
    }
  }
  for (const unchangedPath of workspaceState.unchanged) {
    if (!stagedPaths.includes(unchangedPath)) {
      fail(`${context}: unchanged file was not staged: ${unchangedPath}`);
    }
  }
  assertNoPathCollisions(
    [
      ...stagedPaths,
      ...workspaceState.created.map(({ path }) => path),
      ...workspaceState.absent,
    ],
    `${context} initial and final workspace`,
  );
  if (
    homeState.created.length > 0 ||
    homeState.unchanged.length > 0 ||
    homeState.absent.length > 0
  ) {
    fail(`${context}: fixed empty home must remain empty`);
  }
  for (const file of workspaceState.created) {
    if (file.equalsStdin === true && descriptor.stdin === null) {
      fail(`${context}: created file cannot equal absent stdin`);
    }
  }
}

assertUnique(identifiers, "CLI case identifiers");
process.stdout.write(`Validated ${identifiers.length} CLI acceptance case(s)\n`);

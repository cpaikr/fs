import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const packageSpec = `${packageJson.name}@${packageJson.version}`;
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const arguments_ = process.argv.slice(2);
const requirePublishedMatch = arguments_.includes("--require-published-match");

if (arguments_.some((argument) => argument !== "--require-published-match")) {
  throw new Error("Usage: node scripts/check-publication.mjs [--require-published-match]");
}

const run = (args, options = {}) =>
  spawnSync(npm, args, {
    encoding: "utf8",
    ...options,
  });

const writeFailure = (result) => {
  if (result.stdout) process.stderr.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
};

const registryResult = run([
  "view",
  packageSpec,
  "dist.shasum",
  "dist.integrity",
  "--json",
]);

if (registryResult.status !== 0) {
  const output = `${registryResult.stdout ?? ""}\n${registryResult.stderr ?? ""}`;
  if (!/\bE404\b|404 Not Found/.test(output)) {
    writeFailure(registryResult);
    process.exit(registryResult.status ?? 1);
  }

  if (requirePublishedMatch) {
    throw new Error(`${packageSpec} is unpublished; refusing to create a GitHub release.`);
  }

  console.log(`${packageSpec} is unpublished; running npm's publication dry run.`);
  const publishResult = run(["publish", "--dry-run"], { stdio: "inherit" });
  process.exit(publishResult.status ?? 1);
}

const registryDist = JSON.parse(registryResult.stdout.trim());
const registryShasum = registryDist["dist.shasum"];
const registryIntegrity = registryDist["dist.integrity"];
if (
  typeof registryShasum !== "string" ||
  registryShasum.length === 0 ||
  typeof registryIntegrity !== "string" ||
  registryIntegrity.length === 0
) {
  throw new Error(`npm returned incomplete integrity metadata for ${packageSpec}`);
}

const prepackResult = run(["run", "prepack"], { stdio: "inherit" });
if (prepackResult.status !== 0) process.exit(prepackResult.status ?? 1);

const packResult = run([
  "pack",
  "--dry-run",
  "--json",
  "--ignore-scripts",
]);
if (packResult.status !== 0) {
  writeFailure(packResult);
  process.exit(packResult.status ?? 1);
}

const packOutput = JSON.parse(packResult.stdout);
const packed = Array.isArray(packOutput)
  ? packOutput[0]
  : (packOutput[packageJson.name] ?? Object.values(packOutput)[0]);

if (packed?.name !== packageJson.name || packed?.version !== packageJson.version) {
  throw new Error(`npm packed an unexpected package identity for ${packageSpec}`);
}

const shasumMatches = packed.shasum === registryShasum;
const integrityMatches = packed.integrity === registryIntegrity;
if (shasumMatches !== integrityMatches) {
  throw new Error(`npm returned inconsistent integrity metadata for ${packageSpec}`);
}

if (shasumMatches) {
  console.log(`Verified ${packageSpec} against npm SHA-1 and SHA-512 integrity.`);
} else if (requirePublishedMatch) {
  throw new Error(
    `Packed ${packageSpec} does not match npm SHA-1 and SHA-512 integrity; refusing to create a GitHub release.`,
  );
} else {
  console.log(
    `Packed ${packageSpec} successfully; its bytes have moved beyond the published version, so Release Please must assign the next version before publication.`,
  );
}

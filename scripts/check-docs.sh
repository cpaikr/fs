#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

echo "Linting Markdown"
npx --yes markdownlint-cli2@0.18.1 '**/*.md' '#node_modules' '#dist'

echo "Checking Markdown links"
while IFS= read -r -d '' document; do
  npx --yes markdown-link-check@3.13.7 \
    --quiet \
    --config scripts/markdown-link-check.json \
    "$document"
done < <(
  find . \
    -path './.git' -prune -o \
    -path './node_modules' -prune -o \
    -name '*.md' -print0
)

echo "Checking maintained CLI content"
node scripts/render-guide.mjs --check-installed
npx_guide="$(node scripts/render-guide.mjs --npx-version 0.1.0)"
for expected_command in \
  'schema document' \
  'example' \
  'example minimal' \
  'validate candidate.json' \
  'create --output statement.fs.json candidate.json'; do
  if [[ "$npx_guide" != *"npx -y @cpai/fs@0.1.0 $expected_command"* ]]; then
    echo "Pinned npx guide rendering lost an expected command" >&2
    exit 1
  fi
done
for removed_command in \
  'schema document --version' \
  'validate candidate.json --format' \
  'create candidate.json --output'; do
  if [[ "$npx_guide" == *"$removed_command"* ]]; then
    echo "Pinned npx guide retained a removed command form" >&2
    exit 1
  fi
done
if [[ "$npx_guide" == *'{{'* ]]; then
  echo "Pinned npx guide rendering contains an unresolved placeholder" >&2
  exit 1
fi
node scripts/render-guide.mjs --npx-version 1.0.0+build.1 >/dev/null
for invalid_version in latest 1.0.0-.. 1.0.0-01; do
  if node scripts/render-guide.mjs \
    --npx-version "$invalid_version" >/dev/null 2>&1; then
    echo "Pinned npx guide rendering accepted $invalid_version" >&2
    exit 1
  fi
done
if ! diff -u \
  <(
    printf '%s\n' \
      'assets/help/create.md' \
      'assets/help/example.md' \
      'assets/help/fs.md' \
      'assets/help/guide-authoring.md' \
      'assets/help/guide.md' \
      'assets/help/schema.md' \
      'assets/help/validate.md'
  ) \
  <(
    find assets/help -mindepth 1 -maxdepth 1 -print \
      | LC_ALL=C sort
  ); then
  echo "Help asset inventory differs from the accepted command surface" >&2
  exit 1
fi

echo "Parsing JSON artifacts"
find . \
  -path './.git' -prune -o \
  -path './node_modules' -prune -o \
  -path './fixtures/raw-input' -prune -o \
  -name '*.json' -print0 \
  | xargs -0 jq empty

ajv=(npx --yes ajv-cli@5.0.0 validate --spec=draft2020)

echo "Checking fixture manifest"
jq -e '
  .formatVersion == "0.1" and
  (.validDocuments | type) == "array" and
  (.invalidDocuments | type) == "array" and
  all(.validDocuments[];
    ((.document | type) == "string") and
    ((.document | length) > 0) and
    ((.calculationStatus == "not-defined") or
      (.calculationStatus == "not-evaluated") or
      (.calculationStatus == "consistent") or
      (.calculationStatus == "inconsistent"))) and
  all(.invalidDocuments[];
    ((.document | type) == "string") and
    ((.document | length) > 0) and
    ((.layer == "schema") or (.layer == "semantic")) and
    ((.code | type) == "string") and
    ((.code | length) > 0) and
    ((.path | type) == "string") and
    ((.path | length) > 0)) and
  (([.validDocuments[].document] | length) ==
    ([.validDocuments[].document] | unique | length)) and
  (([.invalidDocuments[].document] | length) ==
    ([.invalidDocuments[].document] | unique | length))
' fixtures/manifest.json >/dev/null

temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/fs-docs.XXXXXX")"
trap 'rm -rf "$temporary_directory"' EXIT

echo "Checking raw process inputs"
find fixtures/raw-input -type f -print \
  | LC_ALL=C sort >"$temporary_directory/actual-raw-inputs"
printf '%s\n' \
  'fixtures/raw-input/duplicate-members.json.txt' \
  'fixtures/raw-input/malformed-json.json.txt' \
  'fixtures/raw-input/noncanonical-valid.json' \
  'fixtures/raw-input/trailing-content.json.txt' \
  >"$temporary_directory/expected-raw-inputs"
if ! cmp -s \
  "$temporary_directory/expected-raw-inputs" \
  "$temporary_directory/actual-raw-inputs"; then
  echo "Raw process input inventory differs from the expected contract" >&2
  diff -u \
    "$temporary_directory/expected-raw-inputs" \
    "$temporary_directory/actual-raw-inputs" >&2 || true
  exit 1
fi

if jq -s empty fixtures/raw-input/malformed-json.json.txt >/dev/null 2>&1; then
  echo "Malformed raw input unexpectedly parses as a JSON value stream" >&2
  exit 1
fi
if ! jq -s -e 'length == 2' \
  fixtures/raw-input/trailing-content.json.txt >/dev/null 2>&1; then
  echo "Trailing-content raw input must contain two complete JSON values" >&2
  exit 1
fi
if ! jq empty fixtures/raw-input/duplicate-members.json.txt >/dev/null 2>&1; then
  echo "Duplicate-member raw input must otherwise be valid JSON" >&2
  exit 1
fi
duplicate_format_versions="$(
  jq --stream -c \
    'select(length == 2 and .[0] == ["formatVersion"])' \
    fixtures/raw-input/duplicate-members.json.txt \
    | wc -l \
    | tr -d '[:space:]'
)"
if [[ "$duplicate_format_versions" != '2' ]]; then
  echo "Duplicate-member raw input no longer contains its duplicate key" >&2
  exit 1
fi
if ! "${ajv[@]}" \
  -s schema/fs-document.schema.json \
  -d fixtures/raw-input/noncanonical-valid.json >/dev/null; then
  echo "Noncanonical raw input must remain a conforming document" >&2
  exit 1
fi
if [[ "$(head -n 1 fixtures/raw-input/noncanonical-valid.json)" != '' ]] ||
  [[ "$(wc -l <fixtures/raw-input/noncanonical-valid.json | tr -d '[:space:]')" != '2' ]]; then
  echo "Noncanonical raw input must retain leading whitespace and compact JSON" >&2
  exit 1
fi

echo "Checking CLI acceptance fixtures"
"${ajv[@]}" \
  -s fixtures/cli/case.schema.json \
  -d 'fixtures/cli/cases/**/*.json'
node scripts/check-cli-fixtures.mjs

jq -r '.validDocuments[].document' fixtures/manifest.json \
  | LC_ALL=C sort >"$temporary_directory/manifest-valid"
{
  find examples -type f -name '*.json' -print | sed 's#^#../#'
  find fixtures/valid -type f -name '*.json' -print | sed 's#^fixtures/##'
} | LC_ALL=C sort >"$temporary_directory/actual-valid"

jq -r '.invalidDocuments[].document' fixtures/manifest.json \
  | LC_ALL=C sort >"$temporary_directory/manifest-invalid"
find fixtures/invalid -type f -name '*.json' -print \
  | sed 's#^fixtures/##' \
  | LC_ALL=C sort >"$temporary_directory/actual-invalid"

if ! cmp -s \
  "$temporary_directory/manifest-valid" \
  "$temporary_directory/actual-valid"; then
  echo "Valid fixture manifest coverage differs from the filesystem" >&2
  diff -u \
    "$temporary_directory/manifest-valid" \
    "$temporary_directory/actual-valid" >&2 || true
  exit 1
fi

if ! cmp -s \
  "$temporary_directory/manifest-invalid" \
  "$temporary_directory/actual-invalid"; then
  echo "Invalid fixture manifest coverage differs from the filesystem" >&2
  diff -u \
    "$temporary_directory/manifest-invalid" \
    "$temporary_directory/actual-invalid" >&2 || true
  exit 1
fi

jq -r '.invalidDocuments[] | [.document, .layer] | @tsv' \
  fixtures/manifest.json >"$temporary_directory/invalid.tsv"

echo "Validating conforming documents"
"${ajv[@]}" \
  -s schema/fs-document.schema.json \
  -d 'examples/*.json'
"${ajv[@]}" \
  -s schema/fs-document.schema.json \
  -d 'fixtures/valid/*.json'

echo "Checking invalid-fixture schema classification"
while IFS=$'\t' read -r document layer; do
  if "${ajv[@]}" \
    -s schema/fs-document.schema.json \
    -d "fixtures/$document" >/dev/null 2>&1; then
    ajv_status=0
  else
    ajv_status=$?
  fi

  case "$ajv_status" in
  0)
    schema_valid=true
    ;;
  1)
    schema_valid=false
    ;;
  *)
    echo "AJV failed for fixtures/$document with exit $ajv_status" >&2
    exit "$ajv_status"
    ;;
  esac

  if [[ "$layer" == 'schema' && "$schema_valid" == true ]]; then
    echo "Expected schema failure: fixtures/$document" >&2
    exit 1
  fi

  if [[ "$layer" == 'semantic' && "$schema_valid" == false ]]; then
    echo "Expected schema success before semantic failure: fixtures/$document" >&2
    exit 1
  fi
done <"$temporary_directory/invalid.tsv"

echo "Validating expected results"
"${ajv[@]}" \
  -s schema/validation-result.schema.json \
  -r schema/fs-document.schema.json \
  -d 'fixtures/calculation-results/*.json'
"${ajv[@]}" \
  -s schema/snapshot-diff.schema.json \
  -r schema/fs-document.schema.json \
  -d 'fixtures/snapshot-diffs/*.json'

echo "Documentation checks passed"

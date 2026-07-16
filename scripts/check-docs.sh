#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

echo "Linting Markdown"
npx --yes markdownlint-cli2@0.18.1 '**/*.md'

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

echo "Parsing JSON artifacts"
find . \
  -path './.git' -prune -o \
  -path './node_modules' -prune -o \
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

#!/usr/bin/env bash
# Self-test an assignment the same way the publish flow does: run its reference
# solution against its own test file. Usage: scripts/selftest.sh <assignmentDir>
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="$(cd "$1" && pwd)"
META="$DIR/assignment.json"

lang=$(node -e "process.stdout.write(require('$META').language)")
entry=$(node -e "process.stdout.write(require('$META').entry)")
testFile=$(node -e "process.stdout.write(require('$META').testFile)")
reference=$(node -e "process.stdout.write(require('$META').reference)")

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

if [ "$lang" = "ts" ] || [ "$lang" = "js" ]; then
  cp "$DIR/$reference" "$work/$entry.ts"
  cp "$DIR/$testFile" "$work/$testFile"
  ( cd "$work" && "$ROOT/node_modules/.bin/vitest" run --root "$work" "$testFile" )
elif [ "$lang" = "cs" ]; then
  TPL="$ROOT/packages/server/src/runner/csharp-template"
  cp "$TPL/project.csproj" "$work/project.csproj"
  cp "$TPL/Harness.cs" "$work/Harness.cs"
  cp "$DIR/$reference" "$work/$entry.cs"
  cp "$DIR/$testFile" "$work/$testFile"
  ( cd "$work" && dotnet run --project "$work/project.csproj" )
else
  echo "unknown language: $lang" >&2
  exit 1
fi

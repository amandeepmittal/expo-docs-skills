#!/usr/bin/env bash
# Runs each expo/docs upstream sync generator listed in manifest.json and reports,
# per source, whether it produced a *real* change worth syncing.
#
# Several generators (Expo Skills, EAS CLI, Expo MCP) stamp a
# `fetchedAt` timestamp into their data JSON on every run, so a no-op run still
# shows a diff. Those timestamp-only diffs are NOT mergeable: this script reverts
# them and reports the source as NOSYNC. A change counts only if the diff has lines
# beyond the ignore pattern (default `fetchedAt`, override via `ignoreDiffPattern`).
#
# Read-only on git history; the only working-tree write is reverting a generator's
# own timestamp-only output. Never commits, branches, stashes, or pushes. Requires a
# clean working tree so changes can be attributed to a sync.
#
# Output is a stream of prefixed lines the SKILL.md interprets:
#   HEAD <sha> branch=<b> repo=<path>  ignore=<pattern>
#   DIRTY <msg>                        working tree not clean / bad repo -> stop
#   CHANGED <label> (<title>)          real change   (followed by "  FILE <path>" lines)
#   NOSYNC  <label> (<reason>)         nothing new, or only the timestamp moved (reverted)
#   SKIPPED <label> (<reason>)         could not run (e.g. MCP not yet authorized via OAuth)
#   FAILED  <label> (<title>; see <log>)   sync errored
#   SUMMARY changed=<n> nosync=<n> skipped=<n> failed=<n>
set -uo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$SKILL_DIR/manifest.json"

# Resolve docs repo: arg -> config.json -> default.
DOCS_REPO="${1:-}"
if [ -z "$DOCS_REPO" ] && [ -f "$SKILL_DIR/config.json" ]; then
  DOCS_REPO="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("docs_repo",""))' "$SKILL_DIR/config.json" 2>/dev/null)"
fi
[ -z "$DOCS_REPO" ] && DOCS_REPO="$HOME/Documents/GitHub/expo/docs"
DOCS_REPO="${DOCS_REPO/#\~/$HOME}"

IGNORE="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("ignoreDiffPattern","fetchedAt"))' "$MANIFEST" 2>/dev/null)"
[ -z "$IGNORE" ] && IGNORE="fetchedAt"

if [ ! -d "$DOCS_REPO" ] || ! git -C "$DOCS_REPO" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "DIRTY  not a git checkout: $DOCS_REPO (set docs_repo in config.json or pass it as an argument)"
  exit 1
fi
cd "$DOCS_REPO"

# Porcelain emits repo-root-relative paths, while git diff/checkout pathspecs resolve
# from CWD. When DOCS_REPO is a subdirectory of the repo (e.g. a monorepo's docs/),
# the two differ, so anchor path-consuming git calls to the repo root.
REPO_ROOT="$(git rev-parse --show-toplevel)"

if [ -n "$(git status --porcelain)" ]; then
  echo "DIRTY  working tree at $DOCS_REPO is not clean; commit or stash first, then re-run"
  exit 2
fi

echo "HEAD  $(git rev-parse --short HEAD)  branch=$(git rev-parse --abbrev-ref HEAD)  repo=$DOCS_REPO  ignore=$IGNORE"

before="$(mktemp)"; after="$(mktemp)"
trap 'rm -f "$before" "$after"' EXIT
: > "$before"

changed=0; nosync=0; skipped=0; failed=0

# Returns 0 (real) if the working-tree diff for $1 has content lines beyond $IGNORE.
# Capture to a variable and test emptiness rather than piping into `grep -q`: under
# `set -o pipefail`, the -q short-circuit can SIGPIPE an upstream grep and make the
# pipeline report non-zero, which would misclassify a real change as timestamp-only.
has_real_diff() {
  local body
  body="$(git -C "$REPO_ROOT" diff -- "$1" | grep -E '^[-+]' | grep -vE '^(\+\+\+|---)' | grep -vE "$IGNORE")"
  [ -n "$body" ]
}

while IFS=$'\t' read -r label script title authfile; do
  [ -z "$label" ] && continue

  # Some syncs need credentials cached outside the repo (e.g. the MCP OAuth token).
  # Resolve a leading ~ and skip-with-instructions if the cache is absent, rather than
  # letting the generator block on an interactive browser authorization mid-run.
  if [ -n "$authfile" ]; then
    resolved_auth="${authfile/#\~/$HOME}"
    if [ ! -f "$resolved_auth" ]; then
      echo "SKIPPED  $label  ($title not authorized; run \`pnpm $script\` once to authorize in a browser, then re-run)"
      skipped=$((skipped + 1))
      continue
    fi
  fi

  log="/tmp/docs-upstream-sync-$label.log"
  if ! pnpm "$script" >"$log" 2>&1; then
    # Absorb any partial writes into the baseline so they are not misattributed
    # to the next sync. Leave them in the tree for the user to inspect.
    git status --porcelain | LC_ALL=C sort >"$after"; cp "$after" "$before"
    echo "FAILED  $label  ($title; see $log)"
    failed=$((failed + 1))
    continue
  fi

  git status --porcelain | LC_ALL=C sort >"$after"
  delta="$(comm -13 "$before" "$after")"

  if [ -z "$delta" ]; then
    echo "NOSYNC  $label  ($title up to date)"
    nosync=$((nosync + 1))
    cp "$after" "$before"
    continue
  fi

  # Classify this sync's files: a real change vs. timestamp-only noise.
  real=0
  realfiles=""
  revertfiles=""
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    st="${line:0:2}"
    p="${line:3}"
    revertfiles="$revertfiles$p"$'\n'
    if [[ "$st" == *"?"* ]]; then
      real=1; realfiles="$realfiles$p"$'\n'          # untracked = new content = real
    elif has_real_diff "$p"; then
      real=1; realfiles="$realfiles$p"$'\n'
    fi
  done <<<"$delta"

  if [ "$real" = 1 ]; then
    echo "CHANGED  $label  ($title)"
    printf '%s' "$realfiles" | sed '/^$/d; s/^/  FILE /'
    changed=$((changed + 1))
    cp "$after" "$before"
  else
    # Only the timestamp moved: discard this generator's own no-op output.
    printf '%s' "$revertfiles" | sed '/^$/d' | while IFS= read -r rp; do
      git -C "$REPO_ROOT" checkout -- "$rp" 2>/dev/null || true
    done
    echo "NOSYNC  $label  ($title — only $IGNORE bumped, reverted)"
    nosync=$((nosync + 1))
    git status --porcelain | LC_ALL=C sort >"$before"
  fi
done < <(python3 -c '
import json, sys
m = json.load(open(sys.argv[1]))
for s in m.get("syncs", []):
    print("\t".join([s["label"], s["script"], s.get("title", s["label"]), s.get("authFile", "")]))
' "$MANIFEST")

echo "SUMMARY  changed=$changed nosync=$nosync skipped=$skipped failed=$failed"

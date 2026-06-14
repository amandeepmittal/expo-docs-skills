#!/usr/bin/env bash
# docs-ja-sync :: detect_drift.sh
#
# Deterministic drift detector between the English Expo tutorial (source of
# truth) and its translations. Reads manifest.json for each page's
# syncedFromCommit watermark and diffs syncedFromCommit..HEAD in the docs repo.
# Emits prefixed lines for the skill to parse. Makes NO edits and runs NO
# network calls; it only reads git history of the local checkout.
#
# Usage: bash detect_drift.sh [docs_repo]
#   docs_repo resolves from: $1, else config.json next to manifest, else
#   ~/Documents/GitHub/expo/docs.
#
# Output line grammar (one token-prefixed record per line):
#   REPO <path>
#   HEAD <shortsha> <YYYY-MM-DD>
#   BASELINE <shortsha>
#   WIRING_BASE <shortsha>
#   DRIFT <locale> <source_path> <commit_count>      # page changed upstream
#     LOG <source_path> <shortsha> <subject>         # one per upstream commit
#   INSYNC <locale> <source_path>                    # watermark == upstream
#   JA_MISSING <locale> <target_path>                # tracked but no target file
#   NEW_EN <source_path>                             # EN page under source_root not tracked
#   ORPHAN_JA <target_path>                          # translation with no EN counterpart
#   I18N_WIRING <clean|changed>                      # common/i18n.ts since wiring watermark
#   SUMMARY drift=<n> insync=<n> new_en=<n> orphan_ja=<n>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST="$SKILL_DIR/manifest.json"

if [ ! -f "$MANIFEST" ]; then
  echo "ERROR manifest_not_found $MANIFEST"
  exit 2
fi

# --- Resolve docs repo -------------------------------------------------------
REPO="${1:-}"
if [ -z "$REPO" ] && [ -f "$SKILL_DIR/config.json" ]; then
  REPO="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("docs_repo",""))' "$SKILL_DIR/config.json")"
fi
if [ -z "$REPO" ]; then
  REPO="$HOME/Documents/GitHub/expo/docs"
fi
if ! git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR repo_not_git $REPO"
  exit 2
fi

HEAD_SHORT="$(git -C "$REPO" rev-parse --short HEAD)"
HEAD_DATE="$(git -C "$REPO" log -1 --format=%cs HEAD)"
BASELINE="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["baseline_commit"])' "$MANIFEST")"
WIRING_BASE="$(python3 -c 'import json,sys; m=json.load(open(sys.argv[1])); print(m.get("wiring_synced_commit", m["baseline_commit"]))' "$MANIFEST")"
WIRING_FILE="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("wiring_file","common/i18n.ts"))' "$MANIFEST")"
SOURCE_ROOT="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("source_root","pages/tutorial"))' "$MANIFEST")"

# Translations mirror the source tree under pages/ja/. e.g. source_root
# "pages/tutorial" -> "pages/ja/tutorial".
JA_ROOT="pages/ja/${SOURCE_ROOT#pages/}"

echo "REPO $REPO"
echo "HEAD $HEAD_SHORT $HEAD_DATE"
echo "BASELINE ${BASELINE:0:11}"
echo "WIRING_BASE ${WIRING_BASE:0:11}"

# --- Per-page drift ----------------------------------------------------------
# Membership of tracked source paths kept as newline-delimited string (portable
# to bash 3.2, which lacks associative arrays).
TRACKED_SRC=""
DRIFT_N=0
INSYNC_N=0

while IFS=$'\t' read -r loc src sha troot; do
  [ -n "$src" ] || continue
  TRACKED_SRC="$TRACKED_SRC$src
"
  rel="${src#"$SOURCE_ROOT/"}"
  tgt="$troot/$rel"

  count="$(git -C "$REPO" rev-list --count "${sha}..HEAD" -- "$src" 2>/dev/null || echo 0)"
  if [ "$count" -gt 0 ]; then
    echo "DRIFT $loc $src $count"
    git -C "$REPO" log --format='%h %s' "${sha}..HEAD" -- "$src" 2>/dev/null \
      | while IFS= read -r line; do echo "LOG $src $line"; done
    DRIFT_N=$((DRIFT_N + 1))
  else
    echo "INSYNC $loc $src"
    INSYNC_N=$((INSYNC_N + 1))
  fi

  if [ ! -f "$REPO/$tgt" ]; then
    echo "JA_MISSING $loc $tgt"
  fi
done < <(python3 - "$MANIFEST" <<'PY'
import json, sys
m = json.load(open(sys.argv[1]))
for loc, info in m.get("locales", {}).items():
    troot = info.get("target_root", "")
    for src, meta in info.get("pages", {}).items():
        print(f"{loc}\t{src}\t{meta.get('syncedFromCommit','')}\t{troot}")
PY
)

# Path prefixes to suppress from NEW_EN (sub-tracks intentionally untranslated).
IGNORE_PREFIXES="$(python3 -c 'import json,sys; print("\n".join(json.load(open(sys.argv[1])).get("ignore_new_en",[])))' "$MANIFEST")"

is_ignored() {
  # $1 = path; true if it starts with any ignore prefix.
  [ -n "$IGNORE_PREFIXES" ] || return 1
  while IFS= read -r pfx; do
    [ -n "$pfx" ] || continue
    case "$1" in "$pfx"*) return 0 ;; esac
  done <<EOF
$IGNORE_PREFIXES
EOF
  return 1
}

# --- New English pages under source_root that nothing tracks -----------------
NEW_EN_N=0
while IFS= read -r enpath; do
  case "$enpath" in *.mdx) ;; *) continue ;; esac
  if printf '%s' "$TRACKED_SRC" | grep -qxF "$enpath"; then continue; fi
  if is_ignored "$enpath"; then continue; fi
  echo "NEW_EN $enpath"
  NEW_EN_N=$((NEW_EN_N + 1))
done < <(git -C "$REPO" ls-files "$SOURCE_ROOT/")

# --- Translations with no English counterpart (deleted/renamed upstream) -----
ORPHAN_N=0
while IFS= read -r japath; do
  case "$japath" in *.mdx) ;; *) continue ;; esac
  enpath="$SOURCE_ROOT/${japath#"$JA_ROOT"/}"
  if [ ! -f "$REPO/$enpath" ]; then
    echo "ORPHAN_JA $japath"
    ORPHAN_N=$((ORPHAN_N + 1))
  fi
done < <(git -C "$REPO" ls-files "$JA_ROOT/")

# --- i18n wiring drift -------------------------------------------------------
if git -C "$REPO" diff --quiet "${WIRING_BASE}..HEAD" -- "$WIRING_FILE" 2>/dev/null; then
  echo "I18N_WIRING clean"
else
  echo "I18N_WIRING changed"
fi

echo "SUMMARY drift=$DRIFT_N insync=$INSYNC_N new_en=$NEW_EN_N orphan_ja=$ORPHAN_N"

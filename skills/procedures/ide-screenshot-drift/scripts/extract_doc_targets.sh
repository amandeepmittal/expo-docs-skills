#!/usr/bin/env bash
set -euo pipefail

# Prints the ContentSpotlight image targets currently referenced by the env-setup instruction partials,
# plus the pages that import each partial (CONSUMER lines). The partials are shared: as of 2026-06 they
# render on get-started/set-up-your-environment AND workflow/android-studio-emulator, so a fix to a
# partial propagates to every consumer page, and a new consumer page should show up here, not surprise us.
# The skill diffs TARGET lines against manifest.json to catch docs changes the manifest does not know about.
# Usage: extract_doc_targets.sh <expo-docs-repo-path>

repo="$1"
dir="$repo/scenes/get-started/set-up-your-environment/instructions"

if [[ ! -d "$dir" ]]; then
  echo "MISSING_DIR $dir"
  exit 1
fi

partials=(_androidStudioInstructions.mdx _androidEmulatorInstructions.mdx _xcodeInstructions.mdx _androidStudioEnvironmentInstructions.mdx)

for f in "${partials[@]}"; do
  if [[ ! -f "$dir/$f" ]]; then
    echo "MISSING_PARTIAL $f"
    continue
  fi
  grep -o 'src="[^"]*"' "$dir/$f" | sed -e 's/^src="//' -e 's/"$//' -e "s|^|TARGET $f |" || true
done

# Consumer pages: every page or scene that imports one of the partials.
for f in "${partials[@]}"; do
  base="${f%.mdx}"
  grep -rl --include='*.mdx' --include='*.tsx' "instructions/${base}" "$repo/pages" "$repo/scenes" 2>/dev/null \
    | grep -v "/instructions/${f}$" \
    | sed -e "s|^$repo/||" -e "s|^|CONSUMER $f |" || true
done

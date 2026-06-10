#!/usr/bin/env bash
set -euo pipefail

# Deterministic prose gate: compares the Android API level the docs claim is required
# against the latest Expo SDK row of the docs' own compatibility table (the data behind
# /versions/latest/#support-for-android-and-ios-versions). The oracle is never "newest
# platform Android Studio offers". Usage: check_required_sdk.sh <docs_repo>

docs_repo="$1"
table="$docs_repo/ui/components/SDKTables/sdk-versions.json"
partial="$docs_repo/scenes/get-started/set-up-your-environment/instructions/_androidStudioInstructions.mdx"

required=""
if [[ -f "$table" ]]; then
  required=$(python3 -c "
import json
row = json.load(open('$table'))['sdkVersions'][0]
print('LATEST_EXPO_SDK', row['sdk'])
print('REQUIRED_SDK', row['compileSdkVersion'])
print('REQUIRED_XCODE', row.get('xcode', 'UNKNOWN'))
" 2>/dev/null) || required=""
fi

# Fallback when the table is missing: the gradle plugin default in the expo monorepo.
if [[ -z "$required" ]]; then
  plugin="$(dirname "$docs_repo")/packages/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin/src/main/kotlin/expo/modules/plugin/ExpoRootProjectPlugin.kt"
  fallback=$(grep -oE 'getVersionOrDefault\("compileSdk", "[0-9]+"\)' "$plugin" 2>/dev/null | grep -oE '[0-9]+' | head -1 || true)
  [[ -n "$fallback" ]] && required="REQUIRED_SDK $fallback (gradle-plugin fallback, table missing)"
fi

if [[ -z "$required" ]]; then
  echo "REQUIRED_SDK UNKNOWN"
  echo "SDK_CLAIM_GATE UNKNOWN"
  exit 0
fi
echo "$required"

sdk=$(echo "$required" | grep '^REQUIRED_SDK' | awk '{print $2}')
documented=$(grep -oE 'Android SDK Platform [0-9]+' "$partial" | grep -oE '[0-9]+' | sort -u | tr '\n' ' ' | xargs || true)
echo "DOC_SDK ${documented:-UNKNOWN}"

if [[ "$documented" == "$sdk" ]]; then
  echo "SDK_CLAIM_GATE PASS"
else
  echo "SDK_CLAIM_GATE DRIFT"
fi

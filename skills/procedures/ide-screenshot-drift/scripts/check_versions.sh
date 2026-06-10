#!/usr/bin/env bash
set -uo pipefail

# Deterministic preflight: platform check + installed vs latest stable IDE versions.
# Emits prefixed lines (PLATFORM / AS_* / XCODE_*) for the skill to parse. Never installs anything.

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "PLATFORM FAIL not-macos"
  exit 0
fi
echo "PLATFORM OK macos"

if ! command -v python3 >/dev/null 2>&1; then
  echo "DEPS FAIL python3-missing"
  exit 0
fi
echo "DEPS OK python3"

compare_versions() {
  # PASS if installed >= latest on their shared dotted-numeric prefix, STALE otherwise
  python3 - "$1" "$2" <<'PY'
import sys
def parse(v):
    parts = []
    for x in v.split('.'):
        digits = ''.join(c for c in x if c.isdigit())
        if digits:
            parts.append(int(digits))
    return parts
a, b = parse(sys.argv[1]), parse(sys.argv[2])
n = min(len(a), len(b))
print('PASS' if a[:n] >= b[:n] else 'STALE')
PY
}

# Android Studio: human version lives in product-info.json dataDirectoryName ("AndroidStudio2025.1.2");
# the "version" key is the AI- build string, so it is only a last resort
AS_APP="/Applications/Android Studio.app"
as_installed=""
if [[ -d "$AS_APP" ]]; then
  if [[ -f "$AS_APP/Contents/Resources/product-info.json" ]]; then
    as_installed=$(python3 -c "
import json
d = json.load(open('$AS_APP/Contents/Resources/product-info.json'))
v = d.get('dataDirectoryName', '').replace('AndroidStudio', '')
print(v if v else d.get('version', ''))" 2>/dev/null)
  fi
  if [[ -z "$as_installed" ]]; then
    as_installed=$(plutil -extract CFBundleShortVersionString raw "$AS_APP/Contents/Info.plist" 2>/dev/null)
  fi
fi

if [[ -n "$as_installed" ]]; then
  echo "AS_INSTALLED $as_installed"
else
  echo "AS_INSTALLED MISSING"
fi

as_latest=$(curl -fsSL --max-time 30 "https://jb.gg/android-studio-releases-list.json" 2>/dev/null | python3 -c "
import json, sys
d = json.load(sys.stdin)
items = d.get('content', {}).get('item', [])
rel = [i for i in items if i.get('channel', '').lower() == 'release']
print(rel[0].get('version', '') if rel else '')
" 2>/dev/null)

if [[ -n "$as_latest" ]]; then
  echo "AS_LATEST $as_latest"
else
  echo "AS_LATEST UNKNOWN"
fi

if [[ -z "$as_installed" ]]; then
  echo "AS_GATE MISSING"
elif [[ -z "$as_latest" ]]; then
  echo "AS_GATE UNKNOWN"
else
  echo "AS_GATE $(compare_versions "$as_installed" "$as_latest")"
fi

# Xcode: installed version from xcodebuild, falling back to Info.plist
xcode_installed=$(xcodebuild -version 2>/dev/null | head -1 | awk '{print $2}')
if [[ -z "$xcode_installed" && -d "/Applications/Xcode.app" ]]; then
  xcode_installed=$(plutil -extract CFBundleShortVersionString raw "/Applications/Xcode.app/Contents/Info.plist" 2>/dev/null)
fi

if [[ -n "$xcode_installed" ]]; then
  echo "XCODE_INSTALLED $xcode_installed"
else
  echo "XCODE_INSTALLED MISSING"
fi

xcode_latest=$(curl -fsSL --max-time 30 "https://xcodereleases.com/data.json" 2>/dev/null | python3 -c "
import json, sys
entries = json.load(sys.stdin)
for e in entries:
    rel = e.get('version', {}).get('release', {})
    if rel.get('release') is True:
        print(e.get('version', {}).get('number', ''))
        break
" 2>/dev/null)

if [[ -n "$xcode_latest" ]]; then
  echo "XCODE_LATEST $xcode_latest"
else
  echo "XCODE_LATEST UNKNOWN"
fi

if [[ -z "$xcode_installed" ]]; then
  echo "XCODE_GATE MISSING"
elif [[ -z "$xcode_latest" ]]; then
  echo "XCODE_GATE UNKNOWN"
else
  echo "XCODE_GATE $(compare_versions "$xcode_installed" "$xcode_latest")"
fi

#!/usr/bin/env bash
set -euo pipefail

# Opt-in updater: CLEAN-replaces Android Studio with the latest stable release.
# NEVER run automatically on a STALE gate; only on an explicit user request in the session.
# Everything goes to Trash (recoverable), nothing is rm'd: the app, IDE config/caches/logs,
# ~/.android (AVDs + adb keys; devices will re-prompt USB-debugging auth), and
# ~/Library/Android (the SDK). The first launch afterwards shows the SDK Components Setup
# wizard, exactly like the fresh-machine state the env-setup docs describe.

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "FAIL not-macos"
  exit 1
fi
if ! command -v trash >/dev/null 2>&1; then
  echo "FAIL trash-not-installed"
  exit 1
fi

arch=$(uname -m)
want="mac"
if [[ "$arch" == "arm64" ]]; then
  want="mac_arm"
fi

info=$(curl -fsSL --max-time 60 "https://jb.gg/android-studio-releases-list.json" | python3 -c "
import json, sys
want = sys.argv[1]
d = json.load(sys.stdin)
items = [i for i in d.get('content', {}).get('item', []) if i.get('channel', '').lower() == 'release']
if not items:
    sys.exit(1)
it = items[0]
suffix = '-' + want + '.dmg'
for l in it.get('download', []):
    if l.get('link', '').endswith(suffix):
        print(it.get('version', ''), l.get('link', ''), l.get('checksum', ''))
        break
" "$want")

version=$(echo "$info" | awk '{print $1}')
url=$(echo "$info" | awk '{print $2}')
checksum=$(echo "$info" | awk '{print $3}')

if [[ -z "$version" || -z "$url" ]]; then
  echo "FAIL no-release-info"
  exit 1
fi
echo "LATEST $version"
echo "URL $url"

dmg="/tmp/android-studio-$version.dmg"
echo "DOWNLOADING $dmg"
# -C - resumes a partial download if a previous run timed out
curl -fL -C - --retry 3 -o "$dmg" "$url"

if [[ -n "$checksum" ]]; then
  actual=$(shasum -a 256 "$dmg" | awk '{print $1}')
  if [[ "$actual" != "$checksum" ]]; then
    echo "FAIL checksum-mismatch expected=$checksum actual=$actual"
    exit 1
  fi
  echo "CHECKSUM OK"
else
  echo "CHECKSUM SKIPPED none-published"
fi

if pgrep -xq "Android Studio" 2>/dev/null || pgrep -fq "Android Studio.app" 2>/dev/null; then
  echo "QUITTING running-instance"
  osascript -e 'quit app "Android Studio"' || true
  sleep 5
fi

mount=$(hdiutil attach -nobrowse -readonly "$dmg" | grep -o '/Volumes/.*' | head -1)
if [[ -z "$mount" ]]; then
  echo "FAIL dmg-mount"
  exit 1
fi

src=$(find "$mount" -maxdepth 1 -name "*.app" | head -1)
if [[ -z "$src" ]]; then
  hdiutil detach "$mount" -quiet || true
  echo "FAIL no-app-in-dmg"
  exit 1
fi

if [[ -d "/Applications/Android Studio.app" ]]; then
  echo "TRASHING old /Applications/Android Studio.app"
  trash "/Applications/Android Studio.app"
fi

echo "INSTALLING $src"
ditto "$src" "/Applications/Android Studio.app"
hdiutil detach "$mount" -quiet || true

# stop adb so nothing holds files in ~/.android during the trash
if command -v adb >/dev/null 2>&1; then
  adb kill-server 2>/dev/null || true
fi

for d in \
  "$HOME/Library/Application Support/Google/AndroidStudio"* \
  "$HOME/Library/Caches/Google/AndroidStudio"* \
  "$HOME/Library/Logs/Google/AndroidStudio"* \
  "$HOME/.android" \
  "$HOME/Library/Android"; do
  if [[ -e "$d" ]]; then
    echo "TRASHING $d"
    trash "$d"
  fi
done

installed=$(python3 -c "
import json
d = json.load(open('/Applications/Android Studio.app/Contents/Resources/product-info.json'))
v = d.get('dataDirectoryName', '').replace('AndroidStudio', '')
print(v if v else d.get('version', ''))" 2>/dev/null)
echo "UPDATED $installed"

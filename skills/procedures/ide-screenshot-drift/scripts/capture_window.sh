#!/usr/bin/env bash
set -euo pipefail

# Captures the frontmost window of an app to a PNG via window bounds + screencapture.
# Works even when CleanShot X owns the screenshot hotkeys. Usage: capture_window.sh "Android Studio" /path/out.png [process-name]
# Pass process-name when System Events registers the process under a different name than the app (Android Studio runs as "studio").
# Needs Accessibility (System Events) and Screen Recording permission for the terminal running it.

app="$1"
out="$2"
proc="${3:-$1}"

mkdir -p "$(dirname "$out")"
osascript -e "tell application \"$app\" to activate" >/dev/null
sleep 1.5

bounds=$(osascript <<EOF
tell application "System Events"
  tell (first process whose name is "$proc")
    set p to position of front window
    set s to size of front window
    return (item 1 of p as text) & "," & (item 2 of p as text) & "," & (item 1 of s as text) & "," & (item 2 of s as text)
  end tell
end tell
EOF
)

if [[ -z "$bounds" ]]; then
  echo "CAPTURE_FAIL $app no-front-window"
  exit 1
fi

screencapture -x -o -R"$bounds" "$out"
echo "CAPTURED $app $out"

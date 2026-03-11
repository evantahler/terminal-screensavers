#!/bin/bash
#
# Capture a screenshot of each screensaver running in Ghostty.
#
# Usage:  bash scripts/capture-screenshots.sh [screensaver-name]
#
# Requirements:
#   - Ghostty.app installed
#   - Screen Recording permission granted to your terminal
#   - Must be run from the project root in a real terminal (not a sandboxed agent)
#
# Pass a single screensaver name to capture just that one, or run with no args
# to capture all screensavers.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DELAY="${DELAY:-15}"
OUTPUT_DIR="${OUTPUT_DIR:-$PROJECT_DIR/screenshots}"

SCREENSAVERS=(
  matrix-rain
  starfield
  pipes
  bouncing-logo
  game-of-life
  fire
  aquarium
  mystify
  fireworks
  digital-clock
  bonsai
  maze
  lava-lamp
  dna-helix
)

# If a single name was passed, capture only that one
if [[ $# -gt 0 ]]; then
  SCREENSAVERS=("$1")
fi

mkdir -p "$OUTPUT_DIR"

# --- helper: find the frontmost Ghostty window ID via Swift ---
get_ghostty_window_id() {
  swift - <<'SWIFT'
import CoreGraphics
let windows = CGWindowListCopyWindowInfo(
  [.optionOnScreenOnly, .excludeDesktopElements],
  kCGNullWindowID
) as? [[String: Any]] ?? []

// Find the frontmost (lowest layer, most recent) Ghostty window
var bestId: UInt32 = 0
var bestOrder: Int = Int.max
for w in windows {
  guard let owner = w["kCGWindowOwnerName"] as? String,
        owner == "Ghostty",
        let wid = w["kCGWindowNumber"] as? UInt32,
        let order = w["kCGWindowLayer"] as? Int else { continue }
  if order <= bestOrder {
    bestOrder = order
    bestId = wid
  }
}
if bestId != 0 { print(bestId) }
SWIFT
}

# --- pre-flight checks ---
if ! [ -d "/Applications/Ghostty.app" ]; then
  echo "Error: Ghostty.app not found in /Applications" >&2
  exit 1
fi

# Quick screencapture sanity check
TEST_FILE=$(mktemp /tmp/screencapture-test-XXXX.png)
if ! screencapture -x "$TEST_FILE" 2>/dev/null || ! [ -s "$TEST_FILE" ]; then
  rm -f "$TEST_FILE"
  echo "Error: screencapture failed. Grant Screen Recording permission to your terminal" >&2
  echo "  System Settings → Privacy & Security → Screen Recording → enable your terminal app" >&2
  exit 1
fi
rm -f "$TEST_FILE"

echo "Capturing ${#SCREENSAVERS[@]} screensaver(s) with ${DELAY}s delay..."
echo "Output: $OUTPUT_DIR"
echo ""

for name in "${SCREENSAVERS[@]}"; do
  echo "▸ $name — launching Ghostty..."

  # Record existing Ghostty window IDs so we can find the new one
  BEFORE_IDS=$(swift - <<'SWIFT'
import CoreGraphics
let ws = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
for w in ws {
  if let o = w["kCGWindowOwnerName"] as? String, o == "Ghostty", let id = w["kCGWindowNumber"] as? UInt32 {
    print(id)
  }
}
SWIFT
  )

  # Open a new Ghostty window running the screensaver
  open -na Ghostty.app --args -e /bin/bash -c "cd '$PROJECT_DIR' && bun run dev $name"

  echo "  waiting ${DELAY}s for render..."
  sleep "$DELAY"

  # Find the new window ID (one that wasn't in BEFORE_IDS)
  WINDOW_ID=$(swift - "$BEFORE_IDS" <<'SWIFT'
import CoreGraphics
import Foundation
let before = Set(CommandLine.arguments.dropFirst().first?.split(separator: "\n").map { String($0) } ?? [])
let ws = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
for w in ws {
  if let o = w["kCGWindowOwnerName"] as? String, o == "Ghostty",
     let id = w["kCGWindowNumber"] as? UInt32 {
    if !before.contains(String(id)) {
      print(id)
      break
    }
  }
}
SWIFT
  )

  if [[ -z "$WINDOW_ID" ]]; then
    # Fallback: use the frontmost Ghostty window
    WINDOW_ID=$(get_ghostty_window_id)
  fi

  if [[ -z "$WINDOW_ID" ]]; then
    echo "  ✗ could not find Ghostty window — skipping"
    continue
  fi

  OUT_FILE="$OUTPUT_DIR/$name.png"
  if screencapture -x -o -l "$WINDOW_ID" "$OUT_FILE" 2>/dev/null && [ -s "$OUT_FILE" ]; then
    echo "  ✓ saved $OUT_FILE"
  else
    echo "  ✗ screencapture -l failed, trying region fallback..."
    # Get window bounds and use -R
    BOUNDS=$(swift - "$WINDOW_ID" <<'SWIFT'
import CoreGraphics
import Foundation
let targetId = UInt32(CommandLine.arguments[1]) ?? 0
let ws = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
for w in ws {
  if let id = w["kCGWindowNumber"] as? UInt32, id == targetId,
     let b = w["kCGWindowBounds"] as? [String: Any],
     let x = b["X"] as? Int, let y = b["Y"] as? Int,
     let w2 = b["Width"] as? Int, let h = b["Height"] as? Int {
    print("\(x),\(y),\(w2),\(h)")
    break
  }
}
SWIFT
    )
    if [[ -n "$BOUNDS" ]]; then
      if screencapture -x -R "$BOUNDS" "$OUT_FILE" 2>/dev/null && [ -s "$OUT_FILE" ]; then
        echo "  ✓ saved $OUT_FILE (region fallback)"
      else
        echo "  ✗ region capture also failed — skipping"
      fi
    else
      echo "  ✗ could not determine window bounds — skipping"
    fi
  fi

  # Close the Ghostty window — send a keystroke to exit the screensaver, then close
  osascript -e 'tell application "Ghostty" to activate' \
            -e 'delay 0.5' \
            -e 'tell application "System Events" to keystroke " "' \
            -e 'delay 1' \
            -e 'tell application "Ghostty" to close front window' 2>/dev/null || true
  sleep 2
done

echo ""
echo "Done! Screenshots saved to $OUTPUT_DIR/"

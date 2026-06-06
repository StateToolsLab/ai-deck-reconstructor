#!/bin/bash

set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
LAUNCHER="$APP_DIR/AI_Deck_Reconstructor.command"
DESKTOP_LINK="$HOME/Desktop/AI Deck Reconstructor.command"
DESKTOP_ALIAS="$HOME/Desktop/AI Deck Reconstructor"

echo ""
echo "AI Deck Reconstructor — Installer"
echo "=================================="
echo ""

if [[ "$(uname)" == "Darwin" ]]; then
  OS_VER="$(sw_vers -productVersion)"
  echo "✅ macOS: $OS_VER"
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ Python3 was not found."
  echo "Please install Python3 and run this installer again."
  read -p "Press Enter to close..."
  exit 1
fi

echo "✅ Python3: $(python3 --version)"

if [[ "$(uname)" == "Darwin" ]]; then
  if command -v brew >/dev/null 2>&1; then
    echo "✅ Homebrew: OK"

    if ! command -v pdftoppm >/dev/null 2>&1; then
      echo "⚠ poppler was not found. PDF import requires poppler."
      read -p "Install poppler with Homebrew now? [y/N]: " answer
      if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
        brew install poppler
      else
        echo "⚠ Skipped poppler installation. PDF import may not work."
      fi
    else
      echo "✅ poppler: OK"
    fi
  else
    echo "⚠ Homebrew was not found."
    echo "PDF import requires poppler. Install Homebrew/poppler manually if PDF import is needed."
  fi
else
  if ! command -v pdftoppm >/dev/null 2>&1; then
    echo "⚠ poppler was not found."
    echo "On Linux, install it with: sudo apt install poppler-utils"
  else
    echo "✅ poppler: OK"
  fi
fi

chmod +x "$LAUNCHER"

if [[ "$(uname)" == "Darwin" ]]; then
  rm -f "$DESKTOP_LINK"
  rm -f "$DESKTOP_ALIAS"

  osascript <<APPLESCRIPT
tell application "Finder"
  set targetFile to POSIX file "$LAUNCHER" as alias
  set desktopFolder to POSIX file "$HOME/Desktop" as alias
  make new alias file at desktopFolder to targetFile with properties {name:"AI Deck Reconstructor"}
end tell
APPLESCRIPT

  DESKTOP_SHORTCUT="$DESKTOP_ALIAS"
else
  ln -sf "$LAUNCHER" "$DESKTOP_LINK"
  DESKTOP_SHORTCUT="$DESKTOP_LINK"
fi

echo ""
echo "=================================="
echo "✅ Installation complete"
echo "=================================="
echo ""
echo "Desktop shortcut created:"
echo "$DESKTOP_SHORTCUT"
echo ""
echo "NDLOCR-Lite is required for OCR."
echo "Recommended local layout:"
echo ""
echo "  parent-folder/"
echo "  ├── ai-deck-reconstructor/"
echo "  └── ndlocr-lite/"
echo ""
echo "If NDLOCR-Lite is placed at ../ndlocr-lite, the launcher will try to install it into the virtual environment automatically."
echo ""
echo "You can now double-click:"
echo "$(basename "$DESKTOP_SHORTCUT")"
echo ""
read -p "Press Enter to close..."

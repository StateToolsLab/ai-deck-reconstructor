#!/bin/bash

set -e

SOURCE="${BASH_SOURCE[0]}"
while [ -L "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ "$SOURCE" != /* ]] && SOURCE="$DIR/$SOURCE"
done

APP_DIR="$(cd -P "$(dirname "$SOURCE")" >/dev/null 2>&1 && pwd)"
VENV="$APP_DIR/.venv"
PYTHON="$VENV/bin/python"
PIP="$VENV/bin/pip"
PORT="5050"
URL="http://127.0.0.1:$PORT"
export PATH="$VENV/bin:$PATH"

echo ""
echo "AI Deck Reconstructor"
echo "====================="
echo ""
echo "App directory:"
echo "$APP_DIR"
echo ""

cd "$APP_DIR"

if [ ! -f "$PYTHON" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv "$VENV"
fi

echo "Installing / updating Python dependencies..."
"$PIP" install --upgrade pip >/dev/null
"$PIP" install -r requirements.txt

if [ -d "$APP_DIR/../ndlocr-lite" ]; then
  if [ -f "$APP_DIR/../ndlocr-lite/pyproject.toml" ] || [ -f "$APP_DIR/../ndlocr-lite/setup.py" ]; then
    echo "Installing local NDLOCR-Lite package from ../ndlocr-lite ..."
    "$PIP" install -e "$APP_DIR/../ndlocr-lite"
  else
    echo "Found ../ndlocr-lite, but no pyproject.toml or setup.py was found."
    echo "Skipping editable package installation."
  fi
else
  echo "⚠ NDLOCR-Lite folder was not found at ../ndlocr-lite."
  echo "OCR may not work until NDLOCR-Lite is installed and configured."
fi

if [[ "$(uname)" == "Darwin" ]]; then
  (sleep 2; open "$URL" >/dev/null 2>&1) &
fi

echo ""
echo "Starting local server..."
echo "$URL"
echo ""
echo "Press Ctrl+C in this window to stop the server."
echo ""

exec "$PYTHON" -m flask --app ui.app run --host 127.0.0.1 --port "$PORT"

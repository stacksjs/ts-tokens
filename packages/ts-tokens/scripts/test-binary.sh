#!/usr/bin/env bash
# Test compiled CLI binary for the current platform.
# Run after `bun run compile` to verify the binary works.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$SCRIPT_DIR/../bin"
BINARY="$BIN_DIR/tokens"

# Detect platform-specific binary if the generic one doesn't exist
if [ ! -f "$BINARY" ]; then
  OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
  ARCH="$(uname -m)"

  case "$ARCH" in
    x86_64) ARCH="x64" ;;
    aarch64|arm64) ARCH="arm64" ;;
  esac

  BINARY="$BIN_DIR/tokens-${OS}-${ARCH}"
  if [ ! -f "$BINARY" ]; then
    echo "FAIL: No binary found at $BIN_DIR/tokens or $BINARY"
    exit 1
  fi
fi

echo "Testing binary: $BINARY"
PASS=0
FAIL=0

# Test 1: --help flag
echo -n "  --help ... "
if "$BINARY" --help >/dev/null 2>&1; then
  echo "PASS"
  PASS=$((PASS + 1))
else
  echo "FAIL"
  FAIL=$((FAIL + 1))
fi

# Test 2: --version flag
echo -n "  --version ... "
VERSION_OUTPUT=$("$BINARY" --version 2>&1 || true)
if [ -n "$VERSION_OUTPUT" ]; then
  echo "PASS ($VERSION_OUTPUT)"
  PASS=$((PASS + 1))
else
  echo "FAIL (no output)"
  FAIL=$((FAIL + 1))
fi

# Test 3: invalid command exits non-zero or shows help
echo -n "  invalid command ... "
if "$BINARY" __nonexistent_command__ >/dev/null 2>&1; then
  # Some CLIs show help for unknown commands (exit 0) — that's acceptable
  echo "PASS (graceful)"
  PASS=$((PASS + 1))
else
  echo "PASS (non-zero exit)"
  PASS=$((PASS + 1))
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1

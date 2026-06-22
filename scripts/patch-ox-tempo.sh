#!/usr/bin/env bash
# Re-apply the `@ts-nocheck` patch to viem's bundled `ox` package.
#
# Background: the `ox/tempo/KeyAuthorization.ts` source file (bundled
# inside viem's nested `node_modules/ox/`) has an upstream type
# regression — TypeScript can't reconcile the optional-account overload
# with the strict-address overload. The tempo chain subpackage is not
# used by OpenDesk, so we silence it. `npm install` will overwrite the
# file, so this script is wired up as the `postinstall` hook in
# package.json to re-apply the marker.
set -euo pipefail

TARGET="node_modules/viem/node_modules/ox/tempo/KeyAuthorization.ts"
MARKER="@ts-nocheck -- upstream ox regression"

if [ ! -f "$TARGET" ]; then
  echo "[patch-ox-tempo] $TARGET not present, skipping"
  exit 0
fi

if head -3 "$TARGET" | grep -q "$MARKER"; then
  echo "[patch-ox-tempo] $TARGET already patched"
  exit 0
fi

# Insert the marker as the very first line.
TMP="$(mktemp)"
{
  echo "// $MARKER"
  cat "$TARGET"
} > "$TMP"
mv "$TMP" "$TARGET"
echo "[patch-ox-tempo] patched $TARGET"

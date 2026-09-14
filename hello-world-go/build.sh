#!/usr/bin/env bash
# Build script to compile the Go "Hello, World!" program into a standalone
# executable binary named "hello-world" (or "hello-world.exe" on Windows).
#
# Usage:
#   ./build.sh                # builds for the current OS/architecture
#   GOOS=linux GOARCH=amd64 ./build.sh   # cross-compile example
#
# Requires the Go toolchain (https://go.dev/dl/) to be installed.

set -euo pipefail

OUTPUT_NAME="hello-world"

if [[ "${GOOS:-}" == "windows" ]]; then
  OUTPUT_NAME="hello-world.exe"
fi

echo "Building ${OUTPUT_NAME}..."
go build -o "${OUTPUT_NAME}" main.go
echo "Build complete: ./${OUTPUT_NAME}"
echo "Run it with: ./${OUTPUT_NAME}"

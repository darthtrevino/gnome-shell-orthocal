#!/bin/sh

set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BUILD_DIR="$ROOT/build"
ID=com.github.darthtrevino.orthocal

mkdir -p "$BUILD_DIR"
rm -f "$BUILD_DIR/$ID.plasmoid"

cd "$ROOT/plasma"
zip -qr "$BUILD_DIR/$ID.plasmoid" metadata.json contents

echo "$BUILD_DIR/$ID.plasmoid"

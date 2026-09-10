#!/bin/sh

set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BUILD_DIR="$ROOT/build"

cd "$ROOT"
glib-compile-schemas --strict schemas
trap 'rm -f schemas/gschemas.compiled' EXIT

mkdir -p "$BUILD_DIR"
gnome-extensions pack --force --out-dir="$BUILD_DIR" .

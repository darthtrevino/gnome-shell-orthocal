#!/bin/sh

set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
UUID=orthocal@darthtrevino.github.com

"$ROOT/scripts/build.sh"
gnome-extensions install --force "$ROOT/build/$UUID.shell-extension.zip"

#!/bin/sh

set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ID=com.github.darthtrevino.orthocal

"$ROOT/scripts/plasma-build.sh" >/dev/null

if kpackagetool6 --type Plasma/Applet --show "$ID" >/dev/null 2>&1; then
    kpackagetool6 --type Plasma/Applet --upgrade "$ROOT/build/$ID.plasmoid"
else
    kpackagetool6 --type Plasma/Applet --install "$ROOT/build/$ID.plasmoid"
fi

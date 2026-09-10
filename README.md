# Orthocal GNOME Shell Extension

Orthocal adds an Orthodox calendar indicator to the GNOME top bar using data
from [Orthocal.info](https://orthocal.info).

The panel shows a three-bar Orthodox cross with an optional fasting rule beside
it. Its menu includes the liturgical day, feasts, fasting guidance, saints,
expandable saint lives, full-text scripture readings, service notes, and a link
to the full day on Orthocal.info.

## Requirements

- GNOME Shell 50
- GJS with Soup 3
- `gnome-extensions`
- `glib-compile-schemas`

## Install

```sh
./scripts/install.sh
gnome-extensions enable orthocal@darthtrevino.github.com
```

Log out and back in if GNOME Shell has not discovered a newly installed
extension. On Wayland, GNOME Shell cannot be restarted in place.

Open the settings with:

```sh
gnome-extensions prefs orthocal@darthtrevino.github.com
```

## Development

```sh
./scripts/build.sh
```

The packaged extension is written to:

```text
build/orthocal@darthtrevino.github.com.shell-extension.zip
```

The extension checks for a date rollover every 15 minutes and refreshes from the
API at the configured interval. It caches the current day's response under the
user cache directory. If the network is unavailable, valid cached data for the
selected calendar and current date remains visible.

## Data source

Orthocal.info provides calendar data for Slavic/OCA and Greek/Antiochian
traditions, Gregorian and Julian calendars, and KJV or LXX2012+WEB scripture
translations.

## License

MIT

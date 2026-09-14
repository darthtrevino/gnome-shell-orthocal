# Orthocal Desktop Widgets

Orthocal adds an Orthodox calendar indicator to your desktop panel using data
from [Orthocal.info](https://orthocal.info). Two ports live in this repository:

- **GNOME Shell extension** (repository root)
- **KDE Plasma 6 widget** ([`plasma/`](plasma))

Both show a three-bar Orthodox cross with an optional fasting rule beside it.
The popup includes the liturgical day, feasts, fasting guidance, saints,
expandable saint lives, full-text scripture readings, service notes, and a link
to the full day on Orthocal.info.

## GNOME Shell

### Requirements

- GNOME Shell 50
- GJS with Soup 3
- `gnome-extensions`
- `glib-compile-schemas`

### Install

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

### Development

```sh
./scripts/build.sh
```

The packaged extension is written to:

```text
build/orthocal@darthtrevino.github.com.shell-extension.zip
```

## KDE Plasma

### Requirements

- Plasma 6.0 or newer
- `kpackagetool6`
- `zip`

### Install

```sh
./scripts/plasma-install.sh
```

Then add the *Orthocal* widget to a panel or the desktop
(right click → *Add Widgets…*). Settings live in the widget's own
configuration dialog (right click → *Configure Orthocal…*).

To remove it:

```sh
kpackagetool6 --type Plasma/Applet --remove com.github.darthtrevino.orthocal
```

### Development

```sh
./scripts/plasma-build.sh
```

The packaged widget is written to:

```text
build/com.github.darthtrevino.orthocal.plasmoid
```

Preview it without touching your panel:

```sh
plasmawindowed com.github.darthtrevino.orthocal
```

The widget caches the day's response in its own Plasma configuration, so
plasmashell must be restarted (or the widget re-added) to pick up a reinstalled
version.

## Behavior

Both ports check for a date rollover every 15 minutes and refresh from the API
at the configured interval. The GNOME extension caches the current day's
response under the user cache directory; the Plasma widget caches it in the
widget configuration. If the network is unavailable, valid cached data for the
selected calendar and current date remains visible.

## Data source

Orthocal.info provides calendar data for Slavic/OCA and Greek/Antiochian
traditions, Gregorian and Julian calendars, and KJV or LXX2012+WEB scripture
translations.

## License

MIT

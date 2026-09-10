import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import Soup from 'gi://Soup?version=3.0';
import St from 'gi://St';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const API_BASE_URL = 'https://orthocal.info/api';
const SITE_BASE_URL = 'https://orthocal.info';
const DATE_CHECK_SECONDS = 15 * 60;

export default class OrthocalExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._session = new Soup.Session({
            user_agent: `${this.metadata.name}/${this.metadata.version}`,
            timeout: 15,
        });
        this._cachePath = GLib.build_filenamev([
            GLib.get_user_cache_dir(),
            'gnome-shell-orthocal',
            'calendar.json',
        ]);
        this._requestSerial = 0;
        this._lastRefreshAt = 0;
        this._dataKey = null;
        this._data = null;
        this._errorMessage = null;
        this._settingsChangedId = this._settings.connect(
            'changed',
            (_settings, key) => this._onSettingsChanged(key)
        );

        this._createIndicator();
        this._loadCache();
        this._refresh();
        this._scheduleRefresh();
    }

    disable() {
        this._requestSerial++;
        this._cancellable?.cancel();
        this._cancellable = null;

        if (this._refreshSourceId) {
            GLib.Source.remove(this._refreshSourceId);
            this._refreshSourceId = null;
        }

        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        this._indicator?.destroy();
        this._indicator = null;
        this._panelLabel = null;
        this._panelCross = null;
        this._session = null;
        this._settings = null;
        this._dataKey = null;
        this._data = null;
    }

    _createIndicator() {
        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

        const panelBox = new St.BoxLayout({
            style_class: 'orthocal-panel-box',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._panelCross = new St.Label({
            text: '☦',
            style_class: 'orthocal-panel-cross',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._panelLabel = new St.Label({
            text: '',
            style_class: 'orthocal-panel-fast',
            y_align: Clutter.ActorAlign.CENTER,
        });
        panelBox.add_child(this._panelCross);
        panelBox.add_child(this._panelLabel);
        this._indicator.add_child(panelBox);

        Main.panel.addToStatusArea(
            this.uuid,
            this._indicator,
            0,
            this._settings.get_string('panel-position')
        );
        this._render();
    }

    _onSettingsChanged(key) {
        if (key === 'panel-position') {
            this._indicator?.destroy();
            this._createIndicator();
        } else if (key === 'refresh-hours') {
            this._scheduleRefresh();
        } else if (key === 'show-fast-level') {
            this._render();
        } else {
            this._loadCache();
            this._refresh();
        }
    }

    _scheduleRefresh() {
        if (this._refreshSourceId)
            GLib.Source.remove(this._refreshSourceId);

        this._refreshSourceId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            DATE_CHECK_SECONDS,
            () => {
                this._refreshIfNeeded();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _refreshIfNeeded() {
        const currentKey = this._cacheKey();
        if (this._dataKey !== currentKey) {
            this._loadCache();
            this._refresh();
            return;
        }

        const interval = Math.max(1, this._settings.get_int('refresh-hours'));
        const elapsed = GLib.get_monotonic_time() - this._lastRefreshAt;
        if (!this._data || elapsed >= interval * 60 * 60 * GLib.USEC_PER_SEC)
            this._refresh();
    }

    _today() {
        const now = GLib.DateTime.new_now_local();
        return {
            year: now.get_year(),
            month: now.get_month(),
            day: now.get_day_of_month(),
        };
    }

    _cacheKey() {
        const {year, month, day} = this._today();
        return [
            this._settings.get_string('tradition'),
            this._settings.get_string('calendar'),
            this._settings.get_string('translation'),
            year,
            month,
            day,
        ].join(':');
    }

    _apiUrl() {
        const {year, month, day} = this._today();
        const tradition = this._settings.get_string('tradition');
        const calendar = this._settings.get_string('calendar');
        const translation = this._settings.get_string('translation');
        const prefix = tradition === 'greek' ? '/greek' : '';

        return `${API_BASE_URL}${prefix}/${calendar}/${year}/${month}/${day}/` +
            `?translation=${encodeURIComponent(translation)}`;
    }

    _siteUrl() {
        const {year, month, day} = this._today();
        const tradition = this._settings.get_string('tradition');
        const calendar = this._settings.get_string('calendar');
        const prefix = tradition === 'greek' ? '/greek' : '';

        return `${SITE_BASE_URL}/readings${prefix}/${calendar}/${year}/${month}/${day}/`;
    }

    _refresh() {
        this._cancellable?.cancel();
        this._cancellable = new Gio.Cancellable();
        const cancellable = this._cancellable;
        const serial = ++this._requestSerial;
        const requestKey = this._cacheKey();
        const message = Soup.Message.new('GET', this._apiUrl());

        this._errorMessage = null;
        this._render();

        this._session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            cancellable,
            (_session, result) => {
                if (serial !== this._requestSerial || cancellable.is_cancelled())
                    return;

                try {
                    const bytes = this._session.send_and_read_finish(result);
                    if (message.status_code < 200 || message.status_code >= 300)
                        throw new Error(`Orthocal returned HTTP ${message.status_code}`);

                    const text = new TextDecoder().decode(bytes.get_data());
                    const data = JSON.parse(text);
                    this._validateData(data);
                    this._data = data;
                    this._dataKey = requestKey;
                    this._lastRefreshAt = GLib.get_monotonic_time();
                    this._errorMessage = null;
                    this._saveCache(data, requestKey);
                } catch (error) {
                    if (!cancellable.is_cancelled()) {
                        this._errorMessage = _('Unable to refresh Orthocal data');
                        console.error(`${this.uuid}: ${error.message}`);
                    }
                }

                this._render();
            }
        );
    }

    _validateData(data) {
        if (!data || typeof data !== 'object' ||
            typeof data.summary_title !== 'string' ||
            typeof data.fast_level_desc !== 'string' ||
            !Array.isArray(data.saints) ||
            !Array.isArray(data.readings)) {
            throw new Error('Orthocal returned an unexpected response');
        }
    }

    _loadCache() {
        this._dataKey = null;
        this._data = null;

        try {
            const file = Gio.File.new_for_path(this._cachePath);
            const [success, contents] = file.load_contents(null);
            if (!success)
                return;

            const cached = JSON.parse(new TextDecoder().decode(contents));
            if (cached.key !== this._cacheKey())
                return;

            this._validateData(cached.data);
            this._dataKey = cached.key;
            this._data = cached.data;
        } catch (error) {
            if (!error.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND))
                console.error(`${this.uuid}: could not read cache: ${error.message}`);
        }

        this._render();
    }

    _saveCache(data, key) {
        try {
            const directory = GLib.path_get_dirname(this._cachePath);
            GLib.mkdir_with_parents(directory, 0o700);
            const file = Gio.File.new_for_path(this._cachePath);
            const contents = JSON.stringify({
                key,
                data,
            });
            file.replace_contents(
                contents,
                null,
                false,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null
            );
        } catch (error) {
            console.error(`${this.uuid}: could not write cache: ${error.message}`);
        }
    }

    _render() {
        if (!this._indicator)
            return;

        this._renderPanel();
        this._renderMenu();
    }

    _renderPanel() {
        const showFastLevel = this._settings.get_boolean('show-fast-level');
        this._panelLabel.visible = showFastLevel && Boolean(this._data);

        if (!this._data) {
            this._panelLabel.text = '';
            this._panelCross.remove_style_class_name('orthocal-panel-error');
            if (this._errorMessage)
                this._panelCross.add_style_class_name('orthocal-panel-error');
            return;
        }

        this._panelCross.remove_style_class_name('orthocal-panel-error');
        this._panelLabel.text = this._data.fast_level_desc;
    }

    _renderMenu() {
        this._indicator.menu.removeAll();

        if (this._errorMessage) {
            const errorItem = new PopupMenu.PopupMenuItem(this._errorMessage, {
                reactive: false,
            });
            errorItem.add_style_class_name('orthocal-error');
            this._indicator.menu.addMenuItem(errorItem);
        }

        if (this._data) {
            this._addHeading(this._data.summary_title);

            const date = new Date(
                this._data.year,
                this._data.month - 1,
                this._data.day
            );
            this._addDetail(new Intl.DateTimeFormat(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }).format(date));

            if (this._data.titles?.length)
                this._addSection(_('Liturgical Day'), this._data.titles);
            if (this._data.feasts?.length)
                this._addSection(_('Feasts'), this._data.feasts);

            const fastText = this._data.fast_exception_desc
                ? `${this._data.fast_level_desc} — ${this._data.fast_exception_desc}`
                : this._data.fast_level_desc;
            this._addSection(_('Fasting'), [fastText]);

            if (this._data.saints.length)
                this._addSaintsSection(this._data.saints, this._data.stories);

            if (this._data.readings.length)
                this._addReadingsSection(this._data.readings);

            if (this._data.service_notes?.length)
                this._addSection(_('Service Notes'), this._data.service_notes);

            this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        } else {
            this._addDetail(this._errorMessage ?? _('Loading today’s calendar…'));
            this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        }

        this._indicator.menu.addAction(_('Refresh'), () => this._refresh());
        this._indicator.menu.addAction(_('Open Orthocal.info'), () => {
            Gio.AppInfo.launch_default_for_uri(this._siteUrl(), null);
        });
        this._indicator.menu.addAction(_('Preferences'), () => this.openPreferences());
    }

    _addHeading(text) {
        const item = new PopupMenu.PopupMenuItem(text, {reactive: false});
        item.label.add_style_class_name('orthocal-heading');
        this._indicator.menu.addMenuItem(item);
    }

    _addDetail(text) {
        const item = new PopupMenu.PopupMenuItem(text, {reactive: false});
        item.label.add_style_class_name('orthocal-detail');
        this._indicator.menu.addMenuItem(item);
    }

    _addSection(title, values) {
        const submenu = new PopupMenu.PopupSubMenuMenuItem(title);
        for (const value of values) {
            const item = new PopupMenu.PopupMenuItem(value, {reactive: false});
            this._styleWrappedLabel(item.label);
            submenu.menu.addMenuItem(item);
        }
        this._indicator.menu.addMenuItem(submenu);
    }

    _addReadingsSection(readings) {
        const section = new PopupMenu.PopupSubMenuMenuItem(_('Readings'));

        readings.forEach((reading, index) => {
            if (index > 0)
                section.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            const source = reading.source ? `${reading.source}: ` : '';
            const heading = new PopupMenu.PopupMenuItem(
                `${source}${reading.display}`,
                {reactive: false}
            );
            heading.label.add_style_class_name('orthocal-reading-heading');
            this._styleWrappedLabel(heading.label);
            section.menu.addMenuItem(heading);

            if (reading.description) {
                const description = new PopupMenu.PopupMenuItem(
                    reading.description,
                    {reactive: false}
                );
                description.label.add_style_class_name('orthocal-detail');
                this._styleWrappedLabel(description.label);
                section.menu.addMenuItem(description);
            }

            const paragraphs = this._passageParagraphs(reading.passage);
            if (paragraphs.length) {
                for (const paragraph of paragraphs) {
                    const item = new PopupMenu.PopupMenuItem(paragraph, {
                        reactive: false,
                    });
                    item.add_style_class_name('orthocal-scripture-paragraph');
                    this._styleWrappedLabel(item.label);
                    section.menu.addMenuItem(item);
                }
            } else {
                const unavailable = new PopupMenu.PopupMenuItem(
                    _('Passage text unavailable'),
                    {reactive: false}
                );
                unavailable.label.add_style_class_name('orthocal-detail');
                section.menu.addMenuItem(unavailable);
            }
        });

        this._indicator.menu.addMenuItem(section);
    }

    _addSaintsSection(saints, stories) {
        const section = new PopupMenu.PopupSubMenuMenuItem(_('Saints'));

        saints.forEach((saint, index) => {
            if (index > 0)
                section.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            const story = this._storyForSaint(saint, stories);
            if (!story) {
                const item = new PopupMenu.PopupMenuItem(saint, {
                    reactive: false,
                });
                this._styleWrappedLabel(item.label);
                section.menu.addMenuItem(item);
                return;
            }

            const row = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false,
            });
            const button = new St.Button({
                style_class: 'orthocal-saint-button',
                x_expand: true,
                can_focus: true,
                track_hover: true,
            });
            const buttonBox = new St.BoxLayout({
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
            const label = new St.Label({
                text: saint,
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
            this._styleWrappedLabel(label);
            const arrow = new St.Icon({
                icon_name: 'pan-end-symbolic',
                style_class: 'popup-menu-arrow',
                y_align: Clutter.ActorAlign.CENTER,
            });
            buttonBox.add_child(label);
            buttonBox.add_child(arrow);
            button.set_child(buttonBox);
            row.add_child(button);
            section.menu.addMenuItem(row);

            const storyItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false,
            });
            const storyLabel = new St.Label({
                text: this._storyText(story.story),
                style_class: 'orthocal-saint-story',
                x_expand: true,
            });
            this._styleWrappedLabel(storyLabel);
            storyItem.add_child(storyLabel);
            storyItem.visible = false;
            section.menu.addMenuItem(storyItem);

            button.connect('clicked', () => {
                storyItem.visible = !storyItem.visible;
                arrow.icon_name = storyItem.visible
                    ? 'pan-down-symbolic'
                    : 'pan-end-symbolic';
            });
        });

        this._indicator.menu.addMenuItem(section);
    }

    _storyForSaint(saint, stories) {
        if (!Array.isArray(stories))
            return null;

        const saintName = saint.toLocaleLowerCase();
        return stories.find(story => {
            if (!story || typeof story.title !== 'string' ||
                typeof story.story !== 'string')
                return false;

            const storyTitle = story.title.toLocaleLowerCase();
            return storyTitle === saintName ||
                storyTitle.includes(saintName) ||
                saintName.includes(storyTitle);
        }) ?? null;
    }

    _storyText(html) {
        return String(html ?? '')
            .replace(/<\s*br\s*\/?\s*>/gi, '\n')
            .replace(/<\s*\/p\s*>/gi, '\n\n')
            .replace(/<\s*\/li\s*>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;|&apos;/gi, "'")
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&#x([0-9a-f]+);/gi, (_match, code) =>
                String.fromCodePoint(Number.parseInt(code, 16)))
            .replace(/&#(\d+);/g, (_match, code) =>
                String.fromCodePoint(Number.parseInt(code, 10)))
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    _passageParagraphs(passage) {
        if (!Array.isArray(passage))
            return [];

        const paragraphs = [];
        let current = '';

        for (const verse of passage) {
            if (!verse || typeof verse.content !== 'string')
                continue;

            const verseText = `${verse.chapter}:${verse.verse}  ${verse.content}`;
            if (verse.paragraph_start && current) {
                paragraphs.push(current);
                current = verseText;
            } else {
                current = current ? `${current} ${verseText}` : verseText;
            }
        }

        if (current)
            paragraphs.push(current);

        return paragraphs;
    }

    _styleWrappedLabel(label) {
        label.add_style_class_name('orthocal-menu-text');
        label.clutter_text.set_line_wrap(true);
        label.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
        label.clutter_text.set_ellipsize(Pango.EllipsizeMode.NONE);
    }
}

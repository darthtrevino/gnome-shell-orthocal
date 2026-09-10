import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk?version=4.0';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const CHOICES = {
    tradition: [
        ['slavic', 'Slavic / OCA'],
        ['greek', 'Greek / Antiochian'],
    ],
    calendar: [
        ['gregorian', 'New Calendar'],
        ['julian', 'Old Calendar'],
    ],
    translation: [
        ['kjv', 'King James Version'],
        ['lxx2012-web', 'LXX2012 + World English Bible'],
    ],
    'panel-position': [
        ['left', 'Left'],
        ['center', 'Center'],
        ['right', 'Right'],
    ],
};

export default class OrthocalPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._orthocalSettings = settings;

        const page = new Adw.PreferencesPage({
            title: _('Orthocal'),
            icon_name: 'x-office-calendar-symbolic',
        });
        window.add(page);

        const calendarGroup = new Adw.PreferencesGroup({
            title: _('Calendar'),
            description: _('Choose the Orthodox calendar data shown by the extension.'),
        });
        page.add(calendarGroup);
        this._addChoiceRow(calendarGroup, settings, 'tradition', _('Tradition'));
        this._addChoiceRow(calendarGroup, settings, 'calendar', _('Calendar'));
        this._addChoiceRow(calendarGroup, settings, 'translation', _('Scripture translation'));

        const panelGroup = new Adw.PreferencesGroup({
            title: _('Top Bar'),
            description: _('Configure the panel indicator and refresh interval.'),
        });
        page.add(panelGroup);

        const fastLevelRow = new Adw.SwitchRow({
            title: _('Show fasting level'),
            subtitle: _('Display today’s fasting rule beside the Orthodox cross'),
            active: settings.get_boolean('show-fast-level'),
        });
        settings.bind(
            'show-fast-level',
            fastLevelRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        panelGroup.add(fastLevelRow);

        this._addChoiceRow(panelGroup, settings, 'panel-position', _('Position'));

        const refreshRow = new Adw.SpinRow({
            title: _('Refresh interval'),
            subtitle: _('Hours between automatic updates'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 24,
                step_increment: 1,
                page_increment: 1,
                value: settings.get_int('refresh-hours'),
            }),
        });
        refreshRow.connect('notify::value', row => {
            settings.set_int('refresh-hours', Math.round(row.value));
        });
        panelGroup.add(refreshRow);

        const aboutGroup = new Adw.PreferencesGroup({
            title: _('About'),
        });
        page.add(aboutGroup);

        const sourceRow = new Adw.ActionRow({
            title: _('Calendar data'),
            subtitle: 'Orthocal.info',
            activatable: true,
        });
        sourceRow.add_suffix(new Gtk.Image({
            icon_name: 'external-link-symbolic',
        }));
        sourceRow.connect('activated', () => {
            Gtk.show_uri(window, 'https://orthocal.info', Gdk.CURRENT_TIME);
        });
        aboutGroup.add(sourceRow);
    }

    _addChoiceRow(group, settings, key, title) {
        const choices = CHOICES[key];
        const model = Gtk.StringList.new(choices.map(([, label]) => _(label)));
        const current = settings.get_string(key);
        const selected = Math.max(0, choices.findIndex(([value]) => value === current));
        const row = new Adw.ComboRow({
            title,
            model,
            selected,
        });
        row.connect('notify::selected', item => {
            const choice = choices[item.selected];
            if (choice)
                settings.set_string(key, choice[0]);
        });
        group.add(row);
    }
}

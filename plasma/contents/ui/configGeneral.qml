import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts

import org.kde.kcmutils as KCM
import org.kde.kirigami as Kirigami

KCM.SimpleKCM {
    id: page

    property string cfg_tradition
    property string cfg_calendar
    property string cfg_translation
    property alias cfg_showFastLevel: fastLevelBox.checked
    property alias cfg_refreshHours: refreshBox.value

    Kirigami.FormLayout {
        anchors.fill: parent

        QQC2.ComboBox {
            id: traditionBox

            Kirigami.FormData.label: i18n("Tradition:")
            textRole: "label"
            valueRole: "value"
            model: [
                {value: "slavic", label: i18n("Slavic / OCA")},
                {value: "greek", label: i18n("Greek / Antiochian")}
            ]
            onActivated: page.cfg_tradition = currentValue
            Component.onCompleted: currentIndex = indexOfValue(page.cfg_tradition)
        }

        QQC2.ComboBox {
            id: calendarBox

            Kirigami.FormData.label: i18n("Calendar:")
            textRole: "label"
            valueRole: "value"
            model: [
                {value: "gregorian", label: i18n("New Calendar")},
                {value: "julian", label: i18n("Old Calendar")}
            ]
            onActivated: page.cfg_calendar = currentValue
            Component.onCompleted: currentIndex = indexOfValue(page.cfg_calendar)
        }

        QQC2.ComboBox {
            id: translationBox

            Kirigami.FormData.label: i18n("Scripture translation:")
            textRole: "label"
            valueRole: "value"
            model: [
                {value: "kjv", label: i18n("King James Version")},
                {value: "lxx2012-web", label: i18n("LXX2012 + World English Bible")}
            ]
            onActivated: page.cfg_translation = currentValue
            Component.onCompleted: currentIndex = indexOfValue(page.cfg_translation)
        }

        Item {
            Kirigami.FormData.isSection: true
        }

        QQC2.CheckBox {
            id: fastLevelBox

            Kirigami.FormData.label: i18n("Panel:")
            text: i18n("Show fasting level beside the Orthodox cross")
        }

        QQC2.SpinBox {
            id: refreshBox

            Kirigami.FormData.label: i18n("Refresh interval:")
            from: 1
            to: 24
            textFromValue: (value, locale) => i18np("%1 hour", "%1 hours", value)
            valueFromText: text => parseInt(text, 10)
        }
    }
}

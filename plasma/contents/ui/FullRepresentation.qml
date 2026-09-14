import QtQuick
import QtQuick.Layouts

import org.kde.kirigami as Kirigami
import org.kde.plasma.components as PlasmaComponents3
import org.kde.plasma.extras as PlasmaExtras
import org.kde.plasma.plasmoid

import "../code/orthocal.js" as Orthocal

PlasmaExtras.Representation {
    id: fullRoot

    property var calendarData: null
    property string errorMessage: ""
    property bool loading: false

    signal refreshRequested()
    signal openSiteRequested()

    Layout.minimumWidth: Kirigami.Units.gridUnit * 20
    Layout.minimumHeight: Kirigami.Units.gridUnit * 18
    Layout.preferredWidth: Kirigami.Units.gridUnit * 26
    Layout.preferredHeight: Kirigami.Units.gridUnit * 30

    collapseMarginsHint: true

    component SectionHeading: Kirigami.Heading {
        Layout.fillWidth: true
        Layout.topMargin: Kirigami.Units.smallSpacing
        level: 4
        wrapMode: Text.WordWrap
    }

    component BodyLabel: PlasmaComponents3.Label {
        Layout.fillWidth: true
        wrapMode: Text.WordWrap
    }

    header: PlasmaExtras.PlasmoidHeading {
        contentItem: ColumnLayout {
            spacing: 0

            Kirigami.Heading {
                Layout.fillWidth: true
                level: 2
                wrapMode: Text.WordWrap
                text: fullRoot.calendarData
                    ? fullRoot.calendarData.summary_title
                    : i18n("Orthocal")
            }

            PlasmaComponents3.Label {
                Layout.fillWidth: true
                visible: text.length > 0
                opacity: 0.75
                wrapMode: Text.WordWrap
                text: {
                    if (!fullRoot.calendarData)
                        return "";

                    var date = new Date(fullRoot.calendarData.year,
                                        fullRoot.calendarData.month - 1,
                                        fullRoot.calendarData.day);
                    return date.toLocaleDateString(Qt.locale(), Locale.LongFormat);
                }
            }
        }
    }

    footer: PlasmaExtras.PlasmoidHeading {
        position: PlasmaExtras.PlasmoidHeading.Position.Footer

        contentItem: RowLayout {
            spacing: Kirigami.Units.smallSpacing

            PlasmaComponents3.Button {
                text: i18n("Refresh")
                icon.name: "view-refresh-symbolic"
                enabled: !fullRoot.loading
                onClicked: fullRoot.refreshRequested()
            }

            PlasmaComponents3.Button {
                text: i18n("Open Orthocal.info")
                icon.name: "internet-web-browser-symbolic"
                onClicked: fullRoot.openSiteRequested()
            }

            Item {
                Layout.fillWidth: true
            }

            PlasmaComponents3.Button {
                icon.name: "configure"
                display: PlasmaComponents3.AbstractButton.IconOnly
                text: i18n("Configure…")
                onClicked: Plasmoid.internalAction("configure").trigger()

                PlasmaComponents3.ToolTip.text: text
                PlasmaComponents3.ToolTip.visible: hovered
                PlasmaComponents3.ToolTip.delay: Kirigami.Units.toolTipDelay
            }
        }
    }

    PlasmaExtras.PlaceholderMessage {
        anchors.centerIn: parent
        width: parent.width - Kirigami.Units.gridUnit * 4
        visible: !fullRoot.calendarData
        iconName: fullRoot.errorMessage ? "dialog-error" : ""
        text: fullRoot.errorMessage
            ? fullRoot.errorMessage
            : i18n("Loading today’s calendar…")
    }

    PlasmaComponents3.ScrollView {
        anchors.fill: parent
        visible: Boolean(fullRoot.calendarData)

        PlasmaComponents3.ScrollBar.horizontal.policy: PlasmaComponents3.ScrollBar.AlwaysOff

        contentItem: Flickable {
            contentWidth: availableWidth
            contentHeight: contentColumn.implicitHeight
            clip: true

            ColumnLayout {
                id: contentColumn

                width: parent.width
                spacing: Kirigami.Units.smallSpacing

                PlasmaComponents3.Label {
                    Layout.fillWidth: true
                    visible: fullRoot.errorMessage.length > 0
                    color: Kirigami.Theme.negativeTextColor
                    wrapMode: Text.WordWrap
                    text: fullRoot.errorMessage
                }

                SectionHeading {
                    visible: titlesRepeater.count > 0
                    text: i18n("Liturgical Day")
                }

                Repeater {
                    id: titlesRepeater

                    model: fullRoot.calendarData
                        ? Orthocal.asArray(fullRoot.calendarData.titles)
                        : []

                    BodyLabel {
                        required property string modelData
                        text: modelData
                    }
                }

                SectionHeading {
                    visible: feastsRepeater.count > 0
                    text: i18n("Feasts")
                }

                Repeater {
                    id: feastsRepeater

                    model: fullRoot.calendarData
                        ? Orthocal.asArray(fullRoot.calendarData.feasts)
                        : []

                    BodyLabel {
                        required property string modelData
                        text: modelData
                    }
                }

                SectionHeading {
                    text: i18n("Fasting")
                }

                BodyLabel {
                    text: Orthocal.fastingText(fullRoot.calendarData)
                }

                SectionHeading {
                    visible: saintsRepeater.count > 0
                    text: i18n("Saints")
                }

                Repeater {
                    id: saintsRepeater

                    model: fullRoot.calendarData
                        ? Orthocal.asArray(fullRoot.calendarData.saints)
                        : []

                    ColumnLayout {
                        id: saintItem

                        required property string modelData

                        readonly property var story: Orthocal.storyForSaint(
                            modelData,
                            fullRoot.calendarData ? fullRoot.calendarData.stories : [])

                        Layout.fillWidth: true
                        spacing: 0

                        Item {
                            Layout.fillWidth: true
                            implicitHeight: saintHeader.implicitHeight

                            RowLayout {
                                id: saintHeader

                                anchors.fill: parent
                                spacing: Kirigami.Units.smallSpacing

                                Kirigami.Icon {
                                    visible: saintItem.story !== null
                                    implicitWidth: Kirigami.Units.iconSizes.small
                                    implicitHeight: Kirigami.Units.iconSizes.small
                                    source: storyLabel.visible
                                        ? "arrow-down-symbolic"
                                        : "arrow-right-symbolic"
                                }

                                PlasmaComponents3.Label {
                                    Layout.fillWidth: true
                                    wrapMode: Text.WordWrap
                                    text: saintItem.modelData
                                }
                            }

                            MouseArea {
                                anchors.fill: parent
                                enabled: saintItem.story !== null
                                cursorShape: enabled ? Qt.PointingHandCursor : Qt.ArrowCursor
                                onClicked: storyLabel.visible = !storyLabel.visible
                            }
                        }

                        PlasmaComponents3.Label {
                            id: storyLabel

                            Layout.fillWidth: true
                            Layout.leftMargin: Kirigami.Units.gridUnit
                            Layout.topMargin: Kirigami.Units.smallSpacing
                            Layout.bottomMargin: Kirigami.Units.smallSpacing
                            visible: false
                            opacity: 0.85
                            wrapMode: Text.WordWrap
                            text: saintItem.story
                                ? Orthocal.storyText(saintItem.story.story)
                                : ""
                        }
                    }
                }

                SectionHeading {
                    visible: readingsRepeater.count > 0
                    text: i18n("Readings")
                }

                Repeater {
                    id: readingsRepeater

                    model: fullRoot.calendarData
                        ? Orthocal.asArray(fullRoot.calendarData.readings)
                        : []

                    ColumnLayout {
                        id: readingItem

                        required property var modelData

                        readonly property var paragraphs: Orthocal.passageParagraphs(modelData.passage)

                        Layout.fillWidth: true
                        Layout.bottomMargin: Kirigami.Units.smallSpacing
                        spacing: 0

                        PlasmaComponents3.Label {
                            Layout.fillWidth: true
                            font.bold: true
                            wrapMode: Text.WordWrap
                            text: readingItem.modelData.source
                                ? readingItem.modelData.source + ": " + readingItem.modelData.display
                                : readingItem.modelData.display
                        }

                        PlasmaComponents3.Label {
                            Layout.fillWidth: true
                            visible: text.length > 0
                            opacity: 0.75
                            wrapMode: Text.WordWrap
                            text: readingItem.modelData.description || ""
                        }

                        Repeater {
                            model: readingItem.paragraphs

                            PlasmaComponents3.Label {
                                required property string modelData

                                Layout.fillWidth: true
                                Layout.topMargin: Kirigami.Units.smallSpacing
                                wrapMode: Text.WordWrap
                                text: modelData
                            }
                        }

                        PlasmaComponents3.Label {
                            Layout.fillWidth: true
                            visible: readingItem.paragraphs.length === 0
                            opacity: 0.75
                            wrapMode: Text.WordWrap
                            text: i18n("Passage text unavailable")
                        }
                    }
                }

                SectionHeading {
                    visible: notesRepeater.count > 0
                    text: i18n("Service Notes")
                }

                Repeater {
                    id: notesRepeater

                    model: fullRoot.calendarData
                        ? Orthocal.asArray(fullRoot.calendarData.service_notes)
                        : []

                    BodyLabel {
                        required property string modelData
                        text: modelData
                    }
                }
            }
        }
    }
}

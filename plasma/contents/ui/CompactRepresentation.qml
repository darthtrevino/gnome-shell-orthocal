import QtQuick
import QtQuick.Layouts

import org.kde.kirigami as Kirigami
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.components as PlasmaComponents3
import org.kde.plasma.plasmoid

MouseArea {
    id: compactRoot

    property var calendarData: null
    property string errorMessage: ""
    property bool showFastLevel: true

    signal toggleRequested()

    readonly property bool vertical: Plasmoid.formFactor === PlasmaCore.Types.Vertical
    readonly property bool fastLevelVisible: showFastLevel && !vertical && Boolean(calendarData)

    Layout.minimumWidth: vertical ? 0 : contentLayout.implicitWidth
    Layout.preferredWidth: vertical ? Layout.minimumWidth : contentLayout.implicitWidth
    Layout.minimumHeight: vertical ? contentLayout.implicitHeight : 0
    Layout.preferredHeight: vertical ? contentLayout.implicitHeight : Layout.minimumHeight

    acceptedButtons: Qt.LeftButton
    hoverEnabled: true

    onClicked: compactRoot.toggleRequested()

    RowLayout {
        id: contentLayout

        anchors.centerIn: parent
        spacing: Kirigami.Units.smallSpacing

        PlasmaComponents3.Label {
            text: "☦"
            font.pointSize: Kirigami.Theme.defaultFont.pointSize * 1.3
            font.bold: true
            color: compactRoot.errorMessage ? Kirigami.Theme.negativeTextColor : Kirigami.Theme.textColor
            verticalAlignment: Text.AlignVCenter
        }

        PlasmaComponents3.Label {
            visible: compactRoot.fastLevelVisible
            text: compactRoot.calendarData ? compactRoot.calendarData.fast_level_desc : ""
            font.pointSize: Kirigami.Theme.smallFont.pointSize
            verticalAlignment: Text.AlignVCenter
        }
    }
}

import QtQuick
import QtQuick.Layouts

import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.plasmoid

import "../code/orthocal.js" as Orthocal

PlasmoidItem {
    id: root

    property var calendarData: null
    property string dataKey: ""
    property string errorMessage: ""
    property bool loading: false
    property double lastRefreshAt: 0

    readonly property string tradition: Plasmoid.configuration.tradition
    readonly property string calendar: Plasmoid.configuration.calendar
    readonly property string translation: Plasmoid.configuration.translation

    readonly property int dateCheckInterval: 15 * 60 * 1000
    readonly property int maxCacheLength: 1024 * 1024

    property var pendingRequest: null

    preferredRepresentation: Plasmoid.formFactor === PlasmaCore.Types.Planar
        ? fullRepresentation
        : compactRepresentation

    toolTipMainText: calendarData ? calendarData.summary_title : i18n("Orthocal")
    toolTipSubText: {
        if (errorMessage)
            return errorMessage;
        if (calendarData)
            return Orthocal.fastingText(calendarData);
        return i18n("Loading today’s calendar…");
    }

    compactRepresentation: CompactRepresentation {
        calendarData: root.calendarData
        errorMessage: root.errorMessage
        showFastLevel: Plasmoid.configuration.showFastLevel
        onToggleRequested: root.expanded = !root.expanded
    }

    fullRepresentation: FullRepresentation {
        calendarData: root.calendarData
        errorMessage: root.errorMessage
        loading: root.loading
        onRefreshRequested: root.refresh()
        onOpenSiteRequested: Qt.openUrlExternally(root.siteUrl())
    }

    Plasmoid.contextualActions: [
        PlasmaCore.Action {
            text: i18n("Refresh")
            icon.name: "view-refresh-symbolic"
            onTriggered: root.refresh()
        },
        PlasmaCore.Action {
            text: i18n("Open Orthocal.info")
            icon.name: "internet-web-browser-symbolic"
            onTriggered: Qt.openUrlExternally(root.siteUrl())
        }
    ]

    function currentKey() {
        return Orthocal.cacheKey(tradition, calendar, translation, Orthocal.today());
    }

    function siteUrl() {
        return Orthocal.siteUrl(tradition, calendar, Orthocal.today());
    }

    function reload() {
        loadCache();
        refresh();
    }

    function refreshIfNeeded() {
        if (dataKey !== currentKey()) {
            reload();
            return;
        }

        var interval = Math.max(1, Plasmoid.configuration.refreshHours) * 60 * 60 * 1000;
        if (!calendarData || Date.now() - lastRefreshAt >= interval)
            refresh();
    }

    function refresh() {
        if (pendingRequest) {
            pendingRequest.onreadystatechange = function () {};
            pendingRequest.abort();
            pendingRequest = null;
        }

        var requestKey = currentKey();
        var url = Orthocal.apiUrl(tradition, calendar, translation, Orthocal.today());
        var request = new XMLHttpRequest();
        pendingRequest = request;

        errorMessage = "";
        loading = true;

        request.onreadystatechange = function () {
            if (request.readyState !== XMLHttpRequest.DONE)
                return;

            if (root.pendingRequest !== request)
                return;

            root.pendingRequest = null;
            root.loading = false;

            try {
                if (request.status < 200 || request.status >= 300)
                    throw new Error("Orthocal returned HTTP " + request.status);

                var data = JSON.parse(request.responseText);
                if (!Orthocal.isValid(data))
                    throw new Error("Orthocal returned an unexpected response");

                root.calendarData = data;
                root.dataKey = requestKey;
                root.lastRefreshAt = Date.now();
                root.errorMessage = "";
                root.saveCache(request.responseText, requestKey);
            } catch (error) {
                root.errorMessage = i18n("Unable to refresh Orthocal data");
                console.warn("orthocal:", error.message);
            }
        };

        request.open("GET", url);
        request.setRequestHeader("Accept", "application/json");
        request.send();
    }

    function loadCache() {
        calendarData = null;
        dataKey = "";

        var payload = Plasmoid.configuration.cachedPayload;
        if (!payload || Plasmoid.configuration.cachedKey !== currentKey())
            return;

        try {
            var data = JSON.parse(payload);
            if (!Orthocal.isValid(data))
                return;

            calendarData = data;
            dataKey = Plasmoid.configuration.cachedKey;
        } catch (error) {
            console.warn("orthocal: could not read cache:", error.message);
        }
    }

    function saveCache(payload, key) {
        if (payload.length > maxCacheLength)
            return;

        Plasmoid.configuration.cachedKey = key;
        Plasmoid.configuration.cachedPayload = payload;
    }

    onTraditionChanged: reload()
    onCalendarChanged: reload()
    onTranslationChanged: reload()

    Timer {
        interval: root.dateCheckInterval
        repeat: true
        running: true
        onTriggered: root.refreshIfNeeded()
    }

    Component.onCompleted: {
        loadCache();
        refresh();
    }
}

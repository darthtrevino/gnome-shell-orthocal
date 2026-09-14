.pragma library

var API_BASE_URL = "https://orthocal.info/api";
var SITE_BASE_URL = "https://orthocal.info";

function today() {
    var now = new Date();
    return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate()
    };
}

function cacheKey(tradition, calendar, translation, date) {
    return [tradition, calendar, translation, date.year, date.month, date.day].join(":");
}

function apiUrl(tradition, calendar, translation, date) {
    var prefix = tradition === "greek" ? "/greek" : "";
    return API_BASE_URL + prefix + "/" + calendar + "/" + date.year + "/" +
        date.month + "/" + date.day + "/?translation=" + encodeURIComponent(translation);
}

function siteUrl(tradition, calendar, date) {
    var prefix = tradition === "greek" ? "/greek" : "";
    return SITE_BASE_URL + "/readings" + prefix + "/" + calendar + "/" +
        date.year + "/" + date.month + "/" + date.day + "/";
}

function asArray(value) {
    if (!value)
        return [];

    if (Array.isArray(value))
        return value;

    if (typeof value === "object" && typeof value.length === "number") {
        var items = [];
        for (var i = 0; i < value.length; i++)
            items.push(value[i]);
        return items;
    }

    return [];
}

function isArrayLike(value) {
    return Boolean(value) && typeof value === "object" &&
        typeof value.length === "number";
}

function isValid(data) {
    return Boolean(data) && typeof data === "object" &&
        typeof data.summary_title === "string" &&
        typeof data.fast_level_desc === "string" &&
        isArrayLike(data.saints) &&
        isArrayLike(data.readings);
}

function storyText(html) {
    return String(html === undefined || html === null ? "" : html)
        .replace(/<\s*br\s*\/?\s*>/gi, "\n")
        .replace(/<\s*\/p\s*>/gi, "\n\n")
        .replace(/<\s*\/li\s*>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&#x([0-9a-f]+);/gi, function (match, code) {
            return String.fromCodePoint(parseInt(code, 16));
        })
        .replace(/&#(\d+);/g, function (match, code) {
            return String.fromCodePoint(parseInt(code, 10));
        })
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function storyForSaint(saint, stories) {
    var list = asArray(stories);
    var saintName = String(saint).toLocaleLowerCase();

    for (var i = 0; i < list.length; i++) {
        var story = list[i];
        if (!story || typeof story.title !== "string" || typeof story.story !== "string")
            continue;

        var storyTitle = story.title.toLocaleLowerCase();
        if (storyTitle === saintName || storyTitle.indexOf(saintName) !== -1 ||
            saintName.indexOf(storyTitle) !== -1)
            return story;
    }

    return null;
}

function passageParagraphs(passage) {
    var verses = asArray(passage);
    var paragraphs = [];
    var current = "";

    for (var i = 0; i < verses.length; i++) {
        var verse = verses[i];
        if (!verse || typeof verse.content !== "string")
            continue;

        var verseText = verse.chapter + ":" + verse.verse + "  " + verse.content;
        if (verse.paragraph_start && current) {
            paragraphs.push(current);
            current = verseText;
        } else {
            current = current ? current + " " + verseText : verseText;
        }
    }

    if (current)
        paragraphs.push(current);

    return paragraphs;
}

function fastingText(data) {
    if (!data)
        return "";

    return data.fast_exception_desc
        ? data.fast_level_desc + " — " + data.fast_exception_desc
        : data.fast_level_desc;
}

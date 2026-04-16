var _Sources = (() => {
  var GENZ_BASE = "https://genzupdates.com";
  var GENZ_CDN = "https://cdn.meowing.org/uploads/";
  var LANG = "\u{1F1EC}\u{1F1E7}";
  var HOME_SECTION_TYPE = "singleRowNormal";
  var HOME_SECTIONS = [
    {
      id: "latest",
      title: "Recently Updated",
      loader: "latest"
    },
    {
      id: "recentlyAdded",
      title: "Recently Added",
      loader: "catalog"
    }
  ];
  var GenzUpdatesInfo = {
    version: "1.0.1",
    name: "Genz Updates",
    icon: "icon.webp",
    author: "0xRage",
    authorWebsite: "https://github.com/openai",
    description: "Extension that pulls manga from genzupdates.com",
    contentRating: "MATURE",
    websiteBaseURL: GENZ_BASE,
    sourceTags: [],
    intents: 53
  };

  function normalizeUrl(url) {
    if (!url) {
      return "";
    }

    var cleaned = String(url).trim();
    if (!cleaned) {
      return "";
    }

    if (cleaned.indexOf("//") === 0) {
      cleaned = "https:" + cleaned;
    }

    if (/^https?:\/\//i.test(cleaned)) {
      return cleaned.replace(/^(https?:\/\/[^\/]+)\/+/, "$1/");
    }

    if (cleaned.charAt(0) !== "/") {
      cleaned = "/" + cleaned;
    }

    return GENZ_BASE + cleaned;
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function decodeHtmlEntities(text) {
    if (!text) {
      return "";
    }

    return String(text)
      .replace(/&#(\d+);/g, function(_, code) {
        return String.fromCharCode(parseInt(code, 10));
      })
      .replace(/&#x([0-9a-f]+);/gi, function(_, code) {
        return String.fromCharCode(parseInt(code, 16));
      })
      .replace(/&nbsp;/gi, " ")
      .replace(/&quot;/gi, "\"")
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&");
  }

  function stripHtml(text) {
    if (!text) {
      return "";
    }

    return String(text).replace(/<[^>]+>/g, " ");
  }

  function cleanText(text) {
    return decodeHtmlEntities(stripHtml(text))
      .replace(/\r/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanDescription(text) {
    if (!text) {
      return "";
    }

    return decodeHtmlEntities(
      String(text)
        .replace(/\r/g, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]+>/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
    ).trim();
  }

  function normalizeSearchText(text) {
    return cleanText(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function humanize(value) {
    if (!value) {
      return "";
    }

    return String(value)
      .replace(/[_-]+/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, function(character) {
        return character.toUpperCase();
      })
      .trim();
  }

  function normalizeStatus(status) {
    switch (String(status || "").toUpperCase()) {
      case "ONGOING":
        return "Ongoing";
      case "COMPLETED":
        return "Completed";
      case "HIATUS":
        return "Hiatus";
      case "CANCELLED":
        return "Cancelled";
      default:
        return humanize(status) || "Unknown";
    }
  }

  function normalizeSeriesType(seriesType) {
    switch (String(seriesType || "").toUpperCase()) {
      case "MANHWA":
        return "Manhwa";
      case "MANHUA":
        return "Manhua";
      case "MANGA":
        return "Manga";
      case "MANGATOON":
        return "Mangatoon";
      case "COMIC":
        return "Comic";
      default:
        return humanize(seriesType);
    }
  }

  function toNumber(value) {
    var parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  function uniqueValues(values) {
    var seen = {};
    var output = [];

    for (var index = 0; index < values.length; index += 1) {
      var value = cleanText(values[index]);
      var key = normalizeSearchText(value);
      if (!value || !key || seen[key]) {
        continue;
      }

      seen[key] = true;
      output.push(value);
    }

    return output;
  }

  function uniqueBySlug(items) {
    var seen = {};
    var output = [];

    for (var index = 0; index < items.length; index += 1) {
      var item = items[index];
      var slug = item && item.slug ? item.slug : "";
      if (!slug || seen[slug]) {
        continue;
      }

      seen[slug] = true;
      output.push(item);
    }

    return output;
  }

  function extractMetaContent(html, attributeName, attributeValue) {
    var patternA = new RegExp(
      "<meta[^>]*" +
        attributeName +
        '=["\']' +
        escapeRegExp(attributeValue) +
        '["\'][^>]*content=["\']([^"\']+)["\']',
      "i"
    );
    var patternB = new RegExp(
      '<meta[^>]*content=["\']([^"\']+)["\'][^>]*' +
        attributeName +
        '=["\']' +
        escapeRegExp(attributeValue) +
        '["\']',
      "i"
    );

    var match = patternA.exec(html) || patternB.exec(html);
    return match ? decodeHtmlEntities(match[1]).trim() : "";
  }

  function extractTitleTag(html) {
    var match = /<title>([^<]+)<\/title>/i.exec(html);
    return match ? cleanText(match[1]) : "";
  }

  function extractLabeledValue(html, label) {
    var pattern = new RegExp(
      "<span>\\s*" + escapeRegExp(label) + "\\s*<\\/span>[\\s\\S]*?<div[^>]*>\\s*([\\s\\S]*?)\\s*<\\/div>",
      "i"
    );
    var match = pattern.exec(html);
    return match ? cleanText(match[1]) : "";
  }

  function extractGenreNames(html) {
    var pattern = /href="\/series\/\?genre=[^"]+"[^>]*>([\s\S]*?)<\/a>/gi;
    var results = [];
    var match;

    while ((match = pattern.exec(html)) !== null) {
      results.push(match[1]);
    }

    return uniqueValues(results);
  }

  function extractAlternativeTitles(html) {
    var pattern = /<span class="text-md leading-none">([\s\S]*?)<\/span>/gi;
    var results = [];
    var match;

    while ((match = pattern.exec(html)) !== null) {
      results.push(match[1]);
    }

    return uniqueValues(results);
  }

  function extractDescription(html) {
    var match = /<p[^>]*white-space:\s*pre-wrap[^>]*>([\s\S]*?)<\/p>/i.exec(html);
    if (match) {
      return cleanDescription(match[1]);
    }

    var metaDescription = extractMetaContent(html, "name", "description");
    return cleanText(metaDescription.replace(/\s*-\s*A Standard scanlation[\s\S]*$/i, ""));
  }

  function extractSeriesImage(html) {
    var metaImage = extractMetaContent(html, "property", "og:image");
    if (metaImage) {
      return normalizeUrl(metaImage);
    }

    var styleMatch = /--photoURL:url\(([^)]+)\)/i.exec(html);
    return styleMatch ? normalizeUrl(styleMatch[1]) : "";
  }

  function extractSecondaryTitle(fullTitle, mainTitle) {
    var normalizedFull = cleanText(fullTitle);
    var normalizedMain = cleanText(mainTitle);

    if (!normalizedFull || !normalizedMain || normalizedFull === normalizedMain) {
      return "";
    }

    if (normalizedFull.indexOf(normalizedMain) === 0) {
      return cleanText(normalizedFull.slice(normalizedMain.length));
    }

    return normalizedFull;
  }

  function parseTagArray(tagsText) {
    if (!tagsText) {
      return [];
    }

    try {
      var parsed = JSON.parse(tagsText);
      return Array.isArray(parsed) ? uniqueValues(parsed) : [];
    } catch (_) {
      return [];
    }
  }

  function buildCatalogSubtitle(card) {
    var parts = [];

    if (card && card.seriesType) {
      parts.push(normalizeSeriesType(card.seriesType));
    }
    if (card && card.status) {
      parts.push(normalizeStatus(card.status));
    }

    return parts.join(" · ");
  }

  function buildPartialSourceManga(item) {
    return App.createPartialSourceManga({
      mangaId: item.slug,
      image: normalizeUrl(item.image),
      title: item.title,
      subtitle: item.subtitle || ""
    });
  }

  function parseCatalogCards(html) {
    var pattern = /<button\b[\s\S]*?id="([^"]+)"[\s\S]*?alt="([^"]+)"[\s\S]*?title="([^"]*)"[\s\S]*?tags='([^']*)'[\s\S]*?data-type="([^"]*)"[\s\S]*?data-status="([^"]*)"[\s\S]*?<a href="\/series\/([^"\/]+)\/"[\s\S]*?style="background-image:url\(([^)]+)\)/gi;
    var cards = [];
    var match;

    while ((match = pattern.exec(html)) !== null) {
      var title = cleanText(match[2]);
      var titleAttribute = cleanText(match[3]);
      var secondaryTitle = extractSecondaryTitle(titleAttribute, title);
      var tags = parseTagArray(match[4]);
      var card = {
        id: cleanText(match[1]),
        slug: cleanText(match[7]),
        title: title,
        titleAttribute: titleAttribute,
        secondaryTitle: secondaryTitle,
        tags: tags,
        seriesType: cleanText(match[5]),
        status: cleanText(match[6]),
        image: normalizeUrl(match[8])
      };

      card.subtitle = buildCatalogSubtitle(card);
      card.searchText = normalizeSearchText(
        [
          card.title,
          card.titleAttribute,
          card.secondaryTitle,
          card.slug,
          card.seriesType,
          card.status,
          tags.join(" ")
        ].join(" ")
      );

      cards.push(card);
    }

    return uniqueBySlug(cards);
  }

  function parseChapterNumber(label) {
    var match = /chapter\s+(-?\d+(?:\.\d+)?)/i.exec(label || "");
    return match ? toNumber(match[1]) : 0;
  }

  function parseChapterDate(text) {
    var value = cleanText(text);
    if (!value) {
      return undefined;
    }

    var lower = value.toLowerCase();
    var now = Date.now();
    var relativeMatch = /(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/.exec(lower);

    if (relativeMatch) {
      var amount = parseInt(relativeMatch[1], 10);
      var multiplier = 60 * 1000;

      switch (relativeMatch[2]) {
        case "hour":
          multiplier = 60 * 60 * 1000;
          break;
        case "day":
          multiplier = 24 * 60 * 60 * 1000;
          break;
        case "week":
          multiplier = 7 * 24 * 60 * 60 * 1000;
          break;
        case "month":
          multiplier = 30 * 24 * 60 * 60 * 1000;
          break;
        case "year":
          multiplier = 365 * 24 * 60 * 60 * 1000;
          break;
      }

      return new Date(now - amount * multiplier);
    }

    if (lower === "yesterday") {
      return new Date(now - 24 * 60 * 60 * 1000);
    }

    var parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }

  function buildChapterName(chapter) {
    return cleanText(chapter && chapter.name ? chapter.name : "Chapter");
  }

  function compareChaptersDescending(left, right) {
    var numberDifference = toNumber(right && right.chapNum) - toNumber(left && left.chapNum);
    if (numberDifference !== 0) {
      return numberDifference;
    }

    var rightTime = right && right.time ? right.time.getTime() : 0;
    var leftTime = left && left.time ? left.time.getTime() : 0;
    return rightTime - leftTime;
  }

  function parseChapterCards(html) {
    var pattern = /<a\b[^>]*href="\/chapter\/([^"\/]+)\/"[^>]*alt="([^"]*)"[^>]*title="([^"]*)"[^>]*p="([^"]*)"[^>]*d="([^"]*)"[^>]*c="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    var chapters = [];
    var match;

    while ((match = pattern.exec(html)) !== null) {
      var label = cleanText(match[2] || match[3] || "");
      var cost = toNumber(match[6]);
      var markup = String(match[7] || "");
      chapters.push({
        id: cleanText(match[1]),
        name: label || "Chapter",
        chapNum: parseChapterNumber(label),
        posterUid: cleanText(match[4]),
        timeText: cleanText(match[5]),
        time: parseChapterDate(match[5]),
        price: cost,
        isAccessible: cost <= 1 && markup.indexOf("material-symbols:lock.svg") === -1
      });
    }

    return chapters;
  }

  function parseLatestCards(html) {
    var coverPattern = /<a style="background-image:url\(([^)]+)\)"[\s\S]*?href="\/series\/([^"\/]+)\/" alt="([^"]+)" title="([^"]*)"[\s\S]*?<\/a>/gi;
    var coverMatches = [];
    var match;

    while ((match = coverPattern.exec(html)) !== null) {
      coverMatches.push({
        index: match.index,
        image: normalizeUrl(match[1]),
        slug: cleanText(match[2]),
        title: cleanText(match[3]),
        titleAttribute: cleanText(match[4])
      });
    }

    var results = [];
    for (var index = 0; index < coverMatches.length; index += 1) {
      var current = coverMatches[index];
      var next = coverMatches[index + 1];
      var block = html.slice(current.index, next ? next.index : html.length);
      var chapters = parseChapterCards(block);
      var accessibleChapter = null;

      for (var chapterIndex = 0; chapterIndex < chapters.length; chapterIndex += 1) {
        if (chapters[chapterIndex].isAccessible) {
          accessibleChapter = chapters[chapterIndex];
          break;
        }
      }

      results.push({
        slug: current.slug,
        title: current.title,
        titleAttribute: current.titleAttribute,
        image: current.image,
        subtitle: accessibleChapter ? buildChapterName(accessibleChapter) : "Updated recently"
      });
    }

    return uniqueBySlug(results);
  }

  function parseChapterPages(html) {
    var pattern = /<img[^>]*uid="([^"]+)"[^>]*class="[^"]*\bmyImage\b[^"]*"[^>]*>/gi;
    var results = [];
    var seen = {};
    var match;

    while ((match = pattern.exec(html)) !== null) {
      var uid = cleanText(match[1]);
      if (!uid || seen[uid]) {
        continue;
      }

      seen[uid] = true;
      results.push(normalizeUrl(GENZ_CDN + uid));
    }

    return results;
  }

  function parseSeriesData(html, mangaId, fallbackCard) {
    var title = extractMetaContent(html, "property", "og:title") || extractTitleTag(html) || humanize(mangaId);
    var alternativeTitles = extractAlternativeTitles(html);
    if (fallbackCard && fallbackCard.secondaryTitle) {
      alternativeTitles.unshift(fallbackCard.secondaryTitle);
    }

    var titles = uniqueValues([title].concat(alternativeTitles));
    var seriesType = extractLabeledValue(html, "Type") || (fallbackCard && fallbackCard.seriesType) || "";
    var status = extractLabeledValue(html, "Status") || (fallbackCard && fallbackCard.status) || "";

    return {
      id: mangaId,
      title: title,
      titles: titles,
      image: extractSeriesImage(html) || (fallbackCard ? fallbackCard.image : ""),
      author: extractLabeledValue(html, "Author"),
      artist: extractLabeledValue(html, "Artist"),
      seriesType: seriesType,
      status: status,
      genres: extractGenreNames(html),
      desc: extractDescription(html),
      chapters: parseChapterCards(html)
    };
  }

  function buildTagSections(details) {
    var sections = [];

    if (details && Array.isArray(details.genres) && details.genres.length) {
      sections.push(
        App.createTagSection({
          id: "genres",
          label: "genres",
          tags: details.genres.map(function(genre) {
            return App.createTag({
              id: normalizeSearchText(genre) || genre,
              label: genre
            });
          })
        })
      );
    }

    var infoTags = [];
    if (details && details.seriesType) {
      infoTags.push(
        App.createTag({
          id: "type:" + details.seriesType,
          label: normalizeSeriesType(details.seriesType)
        })
      );
    }
    if (details && details.status) {
      infoTags.push(
        App.createTag({
          id: "status:" + details.status,
          label: normalizeStatus(details.status)
        })
      );
    }

    if (infoTags.length) {
      sections.push(
        App.createTagSection({
          id: "info",
          label: "info",
          tags: infoTags
        })
      );
    }

    return sections;
  }

  function createHomeSection(config) {
    return App.createHomeSection({
      id: config.id,
      title: config.title,
      containsMoreItems: true,
      type: HOME_SECTION_TYPE
    });
  }

  function validateResponse(response) {
    if (response.status >= 200 && response.status < 300) {
      return;
    }

    var requestUrl = (response.request && response.request.url) || response.url || "request";

    if (response.status === 404) {
      throw new Error("Genz Updates returned 404 for " + requestUrl);
    }

    if (response.status === 403 || response.status === 503) {
      throw new Error("Cloudflare Bypass Required");
    }

    throw new Error("Genz Updates returned " + response.status + " for " + requestUrl);
  }

  function findHomeSectionConfig(homepageSectionId) {
    for (var index = 0; index < HOME_SECTIONS.length; index += 1) {
      if (HOME_SECTIONS[index].id === homepageSectionId) {
        return HOME_SECTIONS[index];
      }
    }

    return null;
  }

  function matchesSearch(card, searchText) {
    if (!searchText) {
      return true;
    }

    return card.searchText.indexOf(searchText) !== -1;
  }

  var GenzUpdates = class {
    constructor() {
      this.catalogCache = null;
      this.latestCache = null;
      this.seriesCache = {};
      this.chapterCache = {};
      this.requestManager = App.createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 20000,
        interceptor: {
          interceptRequest: async (request) => {
            request.headers = Object.assign({}, request.headers || {}, {
              origin: GENZ_BASE,
              referer: GENZ_BASE + "/",
              accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "accept-language": "en-US,en;q=0.9",
              "user-agent": await this.requestManager.getDefaultUserAgent()
            });
            return request;
          },
          interceptResponse: async (response) => response
        }
      });
    }

    getMangaShareUrl(mangaId) {
      return GENZ_BASE + "/series/" + mangaId + "/";
    }

    getCloudflareBypassRequest() {
      return App.createRequest({
        url: GENZ_BASE + "/",
        method: "GET",
        headers: {
          referer: GENZ_BASE + "/",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
        }
      });
    }

    async getMangaDetails(mangaId) {
      var details = await this.fetchSeriesData(mangaId);

      return App.createSourceManga({
        id: mangaId,
        mangaInfo: App.createMangaInfo({
          titles: details.titles,
          image: normalizeUrl(details.image),
          status: normalizeStatus(details.status),
          author: details.author,
          artist: details.artist,
          tags: buildTagSections(details),
          desc: details.desc
        })
      });
    }

    async getChapters(mangaId) {
      var details = await this.fetchSeriesData(mangaId);
      var chapters = Array.isArray(details.chapters) ? details.chapters.slice() : [];

      chapters = chapters
        .filter(function(chapter) {
          return chapter && chapter.id && chapter.isAccessible !== false;
        })
        .sort(compareChaptersDescending);

      if (!chapters.length) {
        throw new Error("No readable chapters were found for " + mangaId);
      }

      return chapters.map(function(chapter) {
        return App.createChapter({
          id: chapter.id,
          name: buildChapterName(chapter),
          langCode: LANG,
          chapNum: toNumber(chapter.chapNum),
          volume: 0,
          time: chapter.time
        });
      });
    }

    async getChapterDetails(mangaId, chapterId) {
      var html = await this.fetchChapterHtml(chapterId);
      var pages = parseChapterPages(html);

      if (!pages.length) {
        if (html.indexOf('id="paid-chapter"') !== -1) {
          throw new Error("This chapter is locked on Genz Updates.");
        }

        throw new Error("No pages were found for " + mangaId + "/" + chapterId);
      }

      return App.createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages: pages
      });
    }

    async getSearchResults(query) {
      var cards = await this.fetchCatalogCards();
      var searchText = normalizeSearchText(query && query.title ? query.title : "");
      var results = cards.filter(function(card) {
        return matchesSearch(card, searchText);
      });

      return App.createPagedResults({
        results: results.map(buildPartialSourceManga)
      });
    }

    async getHomePageSections(sectionCallback) {
      var sections = HOME_SECTIONS.map(createHomeSection);
      for (var sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
        sectionCallback(sections[sectionIndex]);
      }

      for (var configIndex = 0; configIndex < HOME_SECTIONS.length; configIndex += 1) {
        var config = HOME_SECTIONS[configIndex];
        var items = await this.loadSectionItems(config);
        sections[configIndex].items = items.slice(0, 20).map(buildPartialSourceManga);
        sectionCallback(sections[configIndex]);
      }
    }

    async getViewMoreItems(homepageSectionId, metadata) {
      if (metadata && metadata.page && metadata.page > 1) {
        return App.createPagedResults({
          results: []
        });
      }

      var config = findHomeSectionConfig(homepageSectionId);
      if (!config) {
        throw new Error("Unknown Genz Updates home section: " + homepageSectionId);
      }

      var items = await this.loadSectionItems(config);
      return App.createPagedResults({
        results: items.map(buildPartialSourceManga)
      });
    }

    async loadSectionItems(config) {
      if (config.loader === "latest") {
        return this.fetchLatestCards();
      }

      return this.fetchCatalogCards();
    }

    async fetchCatalogCards() {
      if (this.catalogCache) {
        return this.catalogCache;
      }

      var response = await this.scheduleRequest(GENZ_BASE + "/search_series");
      var cards = parseCatalogCards(String(response.data || ""));

      if (!cards.length) {
        throw new Error("Unable to load the Genz Updates catalog.");
      }

      this.catalogCache = cards;
      return cards;
    }

    async fetchLatestCards() {
      if (this.latestCache) {
        return this.latestCache;
      }

      var response = await this.scheduleRequest(GENZ_BASE + "/latest");
      var items = parseLatestCards(String(response.data || ""));

      if (!items.length) {
        throw new Error("Unable to load Genz Updates latest updates.");
      }

      this.latestCache = items;
      return items;
    }

    async fetchSeriesData(mangaId) {
      if (this.seriesCache[mangaId]) {
        return this.seriesCache[mangaId];
      }

      var html = await this.fetchSeriesHtml(mangaId);
      var catalogCards = await this.fetchCatalogCards();
      var fallbackCard = null;

      for (var index = 0; index < catalogCards.length; index += 1) {
        if (catalogCards[index].slug === mangaId) {
          fallbackCard = catalogCards[index];
          break;
        }
      }

      var details = parseSeriesData(html, mangaId, fallbackCard);
      this.seriesCache[mangaId] = details;
      return details;
    }

    async fetchSeriesHtml(mangaId) {
      var response = await this.scheduleRequest(GENZ_BASE + "/series/" + mangaId + "/");
      return String(response.data || "");
    }

    async fetchChapterHtml(chapterId) {
      if (this.chapterCache[chapterId]) {
        return this.chapterCache[chapterId];
      }

      var response = await this.scheduleRequest(GENZ_BASE + "/chapter/" + chapterId + "/");
      var html = String(response.data || "");
      this.chapterCache[chapterId] = html;
      return html;
    }

    async scheduleRequest(url) {
      var request = App.createRequest({
        url: url,
        method: "GET"
      });
      var response = await this.requestManager.schedule(request, 1);
      validateResponse(response);
      return response;
    }
  };

  return {
    GenzUpdates: GenzUpdates,
    GenzUpdatesInfo: GenzUpdatesInfo
  };
})();

this.Sources = _Sources;
if (typeof exports === "object" && typeof module !== "undefined") {
  module.exports.Sources = this.Sources;
}

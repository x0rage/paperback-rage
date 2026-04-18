var _Sources = (() => {
  var VORTEX_BASE = "https://vortexscans.org";
  var VORTEX_API = "https://api.vortexscans.org";
  var LANG = "\u{1F1EC}\u{1F1E7}";
  var HOME_SECTION_TYPE = "singleRowNormal";
  var HOME_SECTIONS = [
    {
      id: "latest",
      title: "Recently Updated",
      orderBy: "lastChapterAddedAt",
      orderDirection: "desc"
    },
    {
      id: "popular",
      title: "Popular",
      orderBy: "totalViews",
      orderDirection: "desc"
    },
    {
      id: "newest",
      title: "New Series",
      orderBy: "createdAt",
      orderDirection: "desc"
    }
  ];
  var VortexScansInfo = {
    version: "1.0.3",
    name: "Vortex Scans",
    icon: "icon.webp",
    author: "0xRage",
    authorWebsite: "https://github.com/openai",
    description: "Extension that pulls manga from vortexscans.org",
    contentRating: "MATURE",
    websiteBaseURL: VORTEX_BASE,
    sourceTags: [],
    intents: 53
  };

  function normalizeUrl(url, baseUrl) {
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

    return (baseUrl || VORTEX_BASE) + cleaned;
  }

  function buildQueryString(params) {
    var pairs = [];
    for (var key in params) {
      if (!Object.prototype.hasOwnProperty.call(params, key)) {
        continue;
      }

      var value = params[key];
      if (value === undefined || value === null || value === "") {
        continue;
      }

      pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));
    }

    return pairs.join("&");
  }

  function decodeHtmlEntities(text) {
    if (!text) {
      return "";
    }

    return String(text)
      .replace(/&nbsp;/gi, " ")
      .replace(/&quot;/gi, "\"")
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&");
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
      case "COMIC":
        return "Comic";
      default:
        return humanize(seriesType);
    }
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

  function toNumber(value) {
    var parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  function firstNonEmpty() {
    for (var index = 0; index < arguments.length; index += 1) {
      var value = arguments[index];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }

    return "";
  }

  function compareChaptersDescending(left, right) {
    var numberDifference = toNumber(right && right.number) - toNumber(left && left.number);
    if (numberDifference !== 0) {
      return numberDifference;
    }

    var rightTime = right && right.createdAt ? new Date(right.createdAt).getTime() : 0;
    var leftTime = left && left.createdAt ? new Date(left.createdAt).getTime() : 0;
    return rightTime - leftTime;
  }

  function latestAccessibleChapter(chapters) {
    if (!Array.isArray(chapters)) {
      return null;
    }

    var accessible = chapters.filter(function(chapter) {
      return chapter && chapter.slug && chapter.isAccessible !== false;
    });

    if (!accessible.length) {
      return null;
    }

    accessible.sort(compareChaptersDescending);
    return accessible[0] || null;
  }

  function buildChapterName(chapter) {
    if (!chapter) {
      return "Chapter";
    }

    var label = "Chapter";
    if (chapter.number !== undefined && chapter.number !== null && chapter.number !== "") {
      label += " " + chapter.number;
    } else if (chapter.slug) {
      label = humanize(String(chapter.slug).replace(/^chapter[-_]?/i, "Chapter "));
    }

    if (chapter.title) {
      label += ": " + String(chapter.title).trim();
    }

    return label.trim();
  }

  function buildSubtitle(post) {
    var latest = latestAccessibleChapter(post && post.chapters);
    if (latest) {
      return buildChapterName(latest);
    }

    var parts = [];
    if (post && post.seriesType) {
      parts.push(normalizeSeriesType(post.seriesType));
    }
    if (post && post.averageRating) {
      parts.push(String(post.averageRating));
    }
    return parts.join(" · ");
  }

  function buildTagSections(post) {
    var sections = [];

    if (Array.isArray(post && post.genres) && post.genres.length) {
      sections.push(
        App.createTagSection({
          id: "genres",
          label: "genres",
          tags: post.genres
            .filter(function(genre) {
              return genre && genre.id !== undefined && genre.name;
            })
            .map(function(genre) {
              return App.createTag({
                id: String(genre.id),
                label: decodeHtmlEntities(genre.name)
              });
            })
        })
      );
    }

    var infoTags = [];
    if (post && post.seriesType) {
      infoTags.push(
        App.createTag({
          id: "type:" + post.seriesType,
          label: normalizeSeriesType(post.seriesType)
        })
      );
    }
    if (post && post.seriesStatus) {
      infoTags.push(
        App.createTag({
          id: "status:" + post.seriesStatus,
          label: normalizeStatus(post.seriesStatus)
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

  function buildPartialSourceManga(post) {
    return App.createPartialSourceManga({
      mangaId: post.slug,
      image: normalizeUrl(post.featuredImage),
      title: decodeHtmlEntities(post.postTitle),
      subtitle: buildSubtitle(post)
    });
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
    var responseBody = String(response.data || "");

    if (response.status === 404) {
      throw new Error("Vortex Scans returned 404 for " + requestUrl);
    }

    if (response.status === 403 || response.status === 503) {
      if (/cloudflare|just a moment|cf-mitigated/i.test(responseBody)) {
        throw new Error("Cloudflare Bypass Required");
      }

      throw new Error("Vortex Scans returned " + response.status + " for " + requestUrl);
    }

    throw new Error("Vortex Scans returned " + response.status + " for " + requestUrl);
  }

  function parseJsonData(data) {
    return typeof data === "string" ? JSON.parse(data) : data;
  }

  function uniqueList(values) {
    var seen = {};
    var output = [];

    for (var index = 0; index < values.length; index += 1) {
      var value = values[index];
      if (!value || seen[value]) {
        continue;
      }

      seen[value] = true;
      output.push(value);
    }

    return output;
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function extractMetaContent(html, attribute, value) {
    var pattern = new RegExp(
      "<meta[^>]+"
        + attribute
        + "=\""
        + escapeRegExp(value)
        + "\"[^>]+content=\"([^\"]*)\"",
      "i"
    );
    var match = pattern.exec(html);
    return match ? decodeHtmlEntities(match[1]) : "";
  }

  function extractPostFragment(html) {
    var startToken = "&quot;post&quot;:[0,{";
    var endToken = ",&quot;publishingTeam&quot;:";
    var startIndex = html.indexOf(startToken);
    if (startIndex === -1) {
      return "";
    }

    startIndex += startToken.length;
    var endIndex = html.indexOf(endToken, startIndex);
    if (endIndex === -1) {
      return "";
    }

    return html.substring(startIndex, endIndex);
  }

  function extractEncodedStringValue(encodedHtml, key) {
    if (!encodedHtml) {
      return "";
    }

    var token = "&quot;" + key + "&quot;:[0,&quot;";
    var startIndex = encodedHtml.indexOf(token);
    if (startIndex === -1) {
      return "";
    }

    startIndex += token.length;
    var endIndex = encodedHtml.indexOf("&quot;]", startIndex);
    if (endIndex === -1) {
      return "";
    }

    return decodeHtmlEntities(encodedHtml.substring(startIndex, endIndex));
  }

  function extractEncodedNumberValue(encodedHtml, key) {
    if (!encodedHtml) {
      return 0;
    }

    var token = "&quot;" + key + "&quot;:[0,";
    var startIndex = encodedHtml.indexOf(token);
    if (startIndex === -1) {
      return 0;
    }

    startIndex += token.length;
    var endIndex = encodedHtml.indexOf("]", startIndex);
    if (endIndex === -1) {
      return 0;
    }

    return toNumber(encodedHtml.substring(startIndex, endIndex));
  }

  function extractSeriesChapters(html) {
    var chapters = [];
    var seen = {};
    var pattern = /&quot;id&quot;:\[0,(-?\d+)\],&quot;number&quot;:\[0,(-?\d+(?:\.\d+)?)\],&quot;slug&quot;:\[0,&quot;([^"]+?)&quot;\],&quot;title&quot;:\[0,&quot;([\s\S]*?)&quot;\],&quot;createdAt&quot;:\[0,&quot;([^"]+?)&quot;\][\s\S]{0,1500}?&quot;isAccessible&quot;:\[0,(true|false)\]/g;
    var match;

    while ((match = pattern.exec(html)) !== null) {
      var slug = decodeHtmlEntities(match[3]);
      if (!slug || seen[slug]) {
        continue;
      }

      seen[slug] = true;
      chapters.push({
        id: toNumber(match[1]),
        number: toNumber(match[2]),
        slug: slug,
        title: cleanDescription(match[4]),
        createdAt: match[5],
        isAccessible: match[6] === "true"
      });
    }

    return chapters;
  }

  function extractSeriesPageData(html, mangaId) {
    var postFragment = extractPostFragment(html);
    var chapters = extractSeriesChapters(html);
    var postTitle = extractEncodedStringValue(postFragment, "postTitle") || extractMetaContent(html, "property", "og:title") || humanize(mangaId);
    var featuredImage = extractEncodedStringValue(postFragment, "featuredImage") || extractMetaContent(html, "property", "og:image");
    var postContent = extractEncodedStringValue(postFragment, "postContent");

    var post = {
      id: extractEncodedNumberValue(postFragment, "id"),
      slug: mangaId,
      postTitle: postTitle,
      postContent: postContent,
      featuredImage: featuredImage,
      averageRating: extractEncodedNumberValue(html, "averageRating"),
      author: "",
      artist: "",
      seriesType: extractEncodedStringValue(postFragment, "seriesType"),
      seriesStatus: extractEncodedStringValue(postFragment, "seriesStatus"),
      genres: [],
      chapters: chapters
    };

    return {
      post: post,
      chapters: chapters,
      totalChapterCount: chapters.length
    };
  }

  function extractChapterPages(html) {
    var pattern = /https:\/\/storage\.(?:vortexscans|vortexcomics)\.org\/[^"'\s<>]*upload\/series\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp|gif|avif)/ig;
    var matches = [];
    var result;

    while ((result = pattern.exec(html)) !== null) {
      matches.push(normalizeUrl(result[0], "https://storage.vortexscans.org"));
    }

    return uniqueList(matches);
  }

  function findHomeSectionConfig(homepageSectionId) {
    for (var index = 0; index < HOME_SECTIONS.length; index += 1) {
      if (HOME_SECTIONS[index].id === homepageSectionId) {
        return HOME_SECTIONS[index];
      }
    }

    return null;
  }

  var VortexScans = class {
    constructor() {
      this.seriesCache = {};
      this.requestManager = App.createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 20000,
        interceptor: {
          interceptRequest: async (request) => {
            request.headers = Object.assign({}, request.headers || {}, {
              origin: VORTEX_BASE,
              referer: VORTEX_BASE + "/",
              accept: "application/json, text/plain, text/html, */*",
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
      return VORTEX_BASE + "/series/" + mangaId;
    }

    async getCloudflareBypassRequestAsync() {
      return App.createRequest({
        url: VORTEX_BASE + "/",
        method: "GET",
        headers: {
          referer: VORTEX_BASE + "/",
          origin: VORTEX_BASE + "/",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "user-agent": await this.requestManager.getDefaultUserAgent()
        }
      });
    }

    async getMangaDetails(mangaId) {
      var payload = await this.fetchSeriesPageData(mangaId);
      var post = payload.post;

      return App.createSourceManga({
        id: mangaId,
        mangaInfo: App.createMangaInfo({
          titles: [decodeHtmlEntities(post.postTitle)],
          image: normalizeUrl(post.featuredImage),
          rating: toNumber(post.averageRating),
          status: normalizeStatus(post.seriesStatus),
          author: firstNonEmpty(post.author),
          artist: firstNonEmpty(post.artist),
          tags: buildTagSections(post),
          desc: cleanDescription(post.postContent)
        })
      });
    }

    async getChapters(mangaId) {
      var payload = await this.fetchSeriesPageData(mangaId);
      var chapters = Array.isArray(payload.chapters) ? payload.chapters.slice() : [];

      chapters = chapters
        .filter(function(chapter) {
          return chapter && chapter.slug && chapter.isAccessible !== false;
        })
        .sort(compareChaptersDescending);

      if (!chapters.length) {
        throw new Error("No readable chapters were found for " + mangaId);
      }

      return chapters.map(function(chapter) {
        return App.createChapter({
          id: chapter.slug,
          name: buildChapterName(chapter),
          langCode: LANG,
          chapNum: toNumber(chapter.number),
          volume: 0,
          time: chapter.createdAt ? new Date(chapter.createdAt) : undefined
        });
      });
    }

    async getChapterDetails(mangaId, chapterId) {
      var response = await this.scheduleRequest(VORTEX_BASE + "/series/" + mangaId + "/" + chapterId);
      var pages = extractChapterPages(String(response.data || ""));

      if (!pages.length) {
        throw new Error("No pages were found for " + mangaId + "/" + chapterId);
      }

      return App.createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages: pages
      });
    }

    async getSearchResults(query, metadata) {
      var page = metadata && metadata.page ? metadata.page : 1;
      var perPage = 24;
      var payload = await this.fetchQueryPosts({
        page: page,
        perPage: perPage,
        searchTerm: query && query.title ? query.title : "",
        orderBy: "lastChapterAddedAt",
        orderDirection: "desc"
      });

      return App.createPagedResults({
        results: payload.posts.map(buildPartialSourceManga),
        metadata: page * perPage < payload.totalCount ? { page: page + 1 } : undefined
      });
    }

    async getHomePageSections(sectionCallback) {
      var sections = HOME_SECTIONS.map(createHomeSection);
      for (var sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
        sectionCallback(sections[sectionIndex]);
      }

      for (var configIndex = 0; configIndex < HOME_SECTIONS.length; configIndex += 1) {
        var config = HOME_SECTIONS[configIndex];
        var payload = await this.fetchQueryPosts({
          page: 1,
          perPage: 20,
          orderBy: config.orderBy,
          orderDirection: config.orderDirection
        });

        sections[configIndex].items = payload.posts.map(buildPartialSourceManga);
        sectionCallback(sections[configIndex]);
      }
    }

    async getViewMoreItems(homepageSectionId, metadata) {
      var config = findHomeSectionConfig(homepageSectionId);
      if (!config) {
        throw new Error("Unknown Vortex Scans home section: " + homepageSectionId);
      }

      var page = metadata && metadata.page ? metadata.page : 1;
      var perPage = 24;
      var payload = await this.fetchQueryPosts({
        page: page,
        perPage: perPage,
        orderBy: config.orderBy,
        orderDirection: config.orderDirection
      });

      return App.createPagedResults({
        results: payload.posts.map(buildPartialSourceManga),
        metadata: page * perPage < payload.totalCount ? { page: page + 1 } : undefined
      });
    }

    async fetchQueryPosts(options) {
      var response = await this.scheduleRequest(
        VORTEX_API +
          "/api/query?" +
          buildQueryString({
            page: options.page || 1,
            perPage: options.perPage || 24,
            searchTerm: options.searchTerm && String(options.searchTerm).trim()
              ? String(options.searchTerm).trim()
              : undefined,
            orderBy: options.orderBy || "lastChapterAddedAt",
            orderDirection: options.orderDirection || "desc"
          })
      );
      var payload = parseJsonData(response.data);

      var posts = Array.isArray(payload.posts)
        ? payload.posts.filter(function(post) {
            return post && post.slug && post.postTitle && post.isNovel !== true;
          })
        : [];

      return {
        posts: posts,
        totalCount: toNumber(payload.totalCount)
      };
    }

    async fetchSeriesPageData(mangaId) {
      if (this.seriesCache[mangaId]) {
        return this.seriesCache[mangaId];
      }

      var response = await this.scheduleRequest(VORTEX_BASE + "/series/" + mangaId);
      var payload = extractSeriesPageData(String(response.data || ""), mangaId);

      if (!payload || !payload.post || !payload.post.slug) {
        throw new Error("Unable to load Vortex Scans series: " + mangaId);
      }

      this.seriesCache[mangaId] = payload;
      return payload;
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
    VortexScans: VortexScans,
    VortexScansInfo: VortexScansInfo
  };
})();

this.Sources = _Sources;
if (typeof exports === "object" && typeof module !== "undefined") {
  module.exports.Sources = this.Sources;
}

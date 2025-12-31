import type {
  MediaWikiRevisionsResponse,
  MediaWikiWikitextPage,
} from "./types";

/**
 * Builds the AD&D 2e Fandom MediaWiki API URL to fetch a page's wikitext.
 */
export function buildAdnd2eWikiRevisionsUrl(pageName: string): string {
  const base = "https://adnd2e.fandom.com/api.php";
  const params = new URLSearchParams({
    action: "query",
    prop: "revisions",
    rvslots: "main",
    rvprop: "content",
    format: "json",
    titles: pageName,
  });

  return `${base}?${params.toString()}`;
}

/**
 * Fetches wikitext for a given wiki page.
 *
 * @remarks
 * Runs in Node (generator scripts), not in the browser.
 */
export async function fetchAdnd2eWikiWikitext(
  pageName: string,
): Promise<MediaWikiWikitextPage> {
  const url = buildAdnd2eWikiRevisionsUrl(pageName);

  const res = await fetch(url, {
    headers: {
      // Helps get consistent responses from some endpoints.
      "User-Agent": "dnd2e-grimoire-generator",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`MediaWiki fetch failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as MediaWikiRevisionsResponse;
  return extractFirstPageWikitext(json);
}

/**
 * Extracts the first page's wikitext (`revisions[0].slots.main['*']`) from the API response.
 */
export function extractFirstPageWikitext(
  json: MediaWikiRevisionsResponse,
): MediaWikiWikitextPage {
  const pages = json.query?.pages;
  const page = pages ? Object.values(pages)[0] : undefined;

  const wikitext = page?.revisions?.[0]?.slots?.main?.["*"] ?? "";

  if (!wikitext) {
    throw new Error("MediaWiki response did not include wikitext content");
  }

  return {
    pageId: typeof page?.pageid === "number" ? page.pageid : null,
    title: typeof page?.title === "string" ? page.title : null,
    wikitext,
    normalized: json.query?.normalized,
  };
}

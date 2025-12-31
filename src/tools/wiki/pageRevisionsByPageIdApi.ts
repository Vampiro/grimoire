import type { MediaWikiRevisionsResponse, SpellWikitextPage } from "./types";

const ADND2E_API = "https://adnd2e.fandom.com/api.php";

/**
 * Builds a MediaWiki URL to fetch revisions (wikitext) for multiple pages by page id.
 *
 * @remarks
 * MediaWiki allows a maximum of 50 page ids per request; callers are responsible
 * for batching to that limit.
 */
function buildAdnd2eWikiRevisionsByPageIdsUrl(pageIds: number[]): string {
  const params = new URLSearchParams({
    action: "query",
    prop: "revisions",
    rvslots: "main",
    rvprop: "content",
    format: "json",
    pageids: pageIds.join("|"),
  });

  return `${ADND2E_API}?${params.toString()}`;
}

export type FetchRevisionsByPageIdsResult = {
  /** Successful page extracts from the response. */
  pages: SpellWikitextPage[];
  /** Per-page extraction errors (missing/empty/unparseable). */
  errors: Array<{ pageid: number; title?: string; message: string }>;
};

/**
 * Fetches wikitext for multiple pages in a single MediaWiki request.
 *
 * @remarks
 * Runs in Node (generator scripts), not in the browser.
 */
export async function fetchAdnd2eWikiWikitextByPageIds(
  pageIds: number[],
  fetchFn: typeof fetch = fetch,
): Promise<FetchRevisionsByPageIdsResult> {
  const url = buildAdnd2eWikiRevisionsByPageIdsUrl(pageIds);

  const res = await fetchFn(url, {
    headers: {
      "User-Agent": "dnd2e-grimoire-generator",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`MediaWiki fetch failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as MediaWikiRevisionsResponse;
  return extractPagesWikitext(json);
}

/**
 * Extracts wikitext pages from the raw revisions API response.
 *
 * @remarks
 * This is split out so it can be unit-tested without making live network calls.
 */
export function extractPagesWikitext(
  json: MediaWikiRevisionsResponse,
): FetchRevisionsByPageIdsResult {
  const pagesRecord = json.query?.pages ?? {};

  // Remove Unicode "format" characters (category Cf), such as:
  // - U+00AD SOFT HYPHEN
  // - U+FEFF BOM / ZERO WIDTH NO-BREAK SPACE
  // These commonly trigger VS Code's "invisible unicode characters" warning.
  /**
   * Removes Unicode format characters (Cf), which frequently include invisible
   * glyphs like SOFT HYPHEN (U+00AD) that cause editor warnings and subtle
   * string-matching issues.
   */
  const stripInvisible = (text: string): string => text.replace(/\p{Cf}/gu, "");

  const pages: SpellWikitextPage[] = [];
  const errors: Array<{ pageid: number; title?: string; message: string }> = [];

  for (const page of Object.values(pagesRecord)) {
    const pageid = typeof page.pageid === "number" ? page.pageid : null;
    const title =
      typeof page.title === "string" ? stripInvisible(page.title) : null;

    if (!pageid) {
      errors.push({
        pageid: -1,
        title: title ?? undefined,
        message: "MediaWiki response did not include a numeric pageid",
      });
      continue;
    }

    if (page.missing) {
      errors.push({
        pageid,
        title: title ?? undefined,
        message: "Page is missing according to MediaWiki",
      });
      continue;
    }

    const wikitextRaw = page.revisions?.[0]?.slots?.main?.["*"] ?? "";
    const wikitext = stripInvisible(wikitextRaw);

    if (!wikitext) {
      errors.push({
        pageid,
        title: title ?? undefined,
        message: "MediaWiki response did not include wikitext content",
      });
      continue;
    }

    pages.push({ pageid, title, wikitext });
  }

  // Keep stable order by pageid for easier diffs.
  pages.sort((a, b) => a.pageid - b.pageid);
  errors.sort((a, b) => a.pageid - b.pageid);

  return { pages, errors };
}

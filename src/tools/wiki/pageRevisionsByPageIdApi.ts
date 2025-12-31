import type { MediaWikiRevisionsResponse, SpellWikitextPage } from "./types";

const ADND2E_API = "https://adnd2e.fandom.com/api.php";

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
  pages: SpellWikitextPage[];
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

export function extractPagesWikitext(
  json: MediaWikiRevisionsResponse,
): FetchRevisionsByPageIdsResult {
  const pagesRecord = json.query?.pages ?? {};

  const pages: SpellWikitextPage[] = [];
  const errors: Array<{ pageid: number; title?: string; message: string }> = [];

  for (const page of Object.values(pagesRecord)) {
    const pageid = typeof page.pageid === "number" ? page.pageid : null;
    const title = typeof page.title === "string" ? page.title : null;

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

    const wikitext = page.revisions?.[0]?.slots?.main?.["*"] ?? "";

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

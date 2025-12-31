import type {
  CategoryMembersFile,
  MediaWikiCategoryMember,
  MediaWikiCategoryMembersResponse,
} from "./types";

const ADND2E_API = "https://adnd2e.fandom.com/api.php";

export type FetchCategoryMembersOptions = {
  /** Human name to store in the output file. */
  categoryName: string;
  /** MediaWiki category title, e.g. `Category:Wizard_Spells`. */
  categoryTitle: string;
  /** Enforce a maximum request rate. Default: 3 req/s. */
  maxRequestsPerSecond?: number;
  /** Limit per request. Default: 500 (MediaWiki max). */
  cmLimit?: number;
  /** Only include pages in this namespace. Default: 0 (articles). */
  cmNamespace?: number;
};

/** Sleeps for the given duration (used for request rate-limiting). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Builds a MediaWiki `categorymembers` query URL.
 *
 * @remarks
 * When `continuation` is provided, the returned URL fetches the next page.
 */
function buildCategoryMembersUrl(opts: {
  /** MediaWiki category title, e.g. `Category:Wizard_Spells`. */
  categoryTitle: string;
  /** Per-request max items to return. */
  cmLimit: number;
  /** Namespace filter (0 = main/article namespace). */
  cmNamespace: number;
  /** Continuation token payload from a previous response, if any. */
  continuation?: { cmcontinue?: string; continue?: string };
}): string {
  const params = new URLSearchParams({
    action: "query",
    list: "categorymembers",
    cmtitle: opts.categoryTitle,
    cmlimit: String(opts.cmLimit),
    cmnamespace: String(opts.cmNamespace),
    format: "json",
  });

  if (opts.continuation?.cmcontinue) {
    params.set("cmcontinue", opts.continuation.cmcontinue);
  }
  if (opts.continuation?.continue) {
    params.set("continue", opts.continuation.continue);
  }

  return `${ADND2E_API}?${params.toString()}`;
}

/**
 * Fetches all members in a MediaWiki category, automatically paging until complete.
 *
 * @remarks
 * Uses the MediaWiki `continue.cmcontinue` mechanism and enforces a caller-configurable
 * request rate limit.
 */
export async function fetchAllCategoryMembers(
  opts: FetchCategoryMembersOptions,
  fetchFn: typeof fetch = fetch,
): Promise<CategoryMembersFile> {
  const cmLimit = opts.cmLimit ?? 500;
  const cmNamespace = opts.cmNamespace ?? 0;
  const maxRps = opts.maxRequestsPerSecond ?? 3;
  const minIntervalMs = Math.ceil(1000 / maxRps);

  const members: MediaWikiCategoryMember[] = [];
  let continuation: { cmcontinue?: string; continue?: string } | undefined;

  let lastRequestAt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const now = Date.now();
    const waitMs = lastRequestAt
      ? Math.max(0, minIntervalMs - (now - lastRequestAt))
      : 0;
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    const url = buildCategoryMembersUrl({
      categoryTitle: opts.categoryTitle,
      cmLimit,
      cmNamespace,
      continuation,
    });

    lastRequestAt = Date.now();
    const res = await fetchFn(url, {
      headers: {
        "User-Agent": "dnd2e-grimoire-generator",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(
        `MediaWiki categorymembers fetch failed: ${res.status} ${res.statusText}`,
      );
    }

    const json = (await res.json()) as MediaWikiCategoryMembersResponse;

    const pageMembers = json.query?.categorymembers ?? [];
    members.push(...pageMembers);

    if (!json.continue?.cmcontinue) {
      break;
    }

    continuation = {
      cmcontinue: json.continue.cmcontinue,
      continue: json.continue.continue,
    };
  }

  return {
    categoryName: opts.categoryName,
    categoryMembers: members,
  };
}

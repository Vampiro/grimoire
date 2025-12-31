/**
 * Types used by the build-time wiki data generators.
 *
 * @remarks
 * These are intentionally placed under `src/tools` so they are not imported by
 * the app bundle.
 */

/**
 * Raw MediaWiki API response shape for the `action=query&prop=revisions` call.
 */
export interface MediaWikiRevisionsResponse {
  /** Present when the API considers the response complete for the request. */
  batchcomplete?: string;
  /** Query payload containing pages keyed by page id string. */
  query?: MediaWikiRevisionsQuery;
}

/** A single normalization mapping returned by MediaWiki. */
export interface MediaWikiNormalizedTitle {
  /** The originally requested title. */
  from: string;
  /** The canonical title MediaWiki normalized it to. */
  to: string;
}

/** `query` payload for a revisions request. */
export interface MediaWikiRevisionsQuery {
  /** Optional normalization info for title-based queries. */
  normalized?: MediaWikiNormalizedTitle[];
  /** Pages keyed by page id string. */
  pages?: Record<string, MediaWikiRevisionsPage>;
}

/** Page entry for a revisions request. */
export interface MediaWikiRevisionsPage {
  /** Numeric page id. */
  pageid?: number;
  /** Namespace id (0 for main/article namespace). */
  ns?: number;
  /** Human-readable title. */
  title?: string;
  /** Present and true when the page does not exist. */
  missing?: boolean;
  /** Revision array, typically length 1 for our usage. */
  revisions?: MediaWikiRevision[];
}

/** A single revision wrapper returned by MediaWiki. */
export interface MediaWikiRevision {
  /** Slots payload (we use `main`). */
  slots?: MediaWikiRevisionSlots;
}

/** Revision slots container. */
export interface MediaWikiRevisionSlots {
  /** Main content slot. */
  main?: MediaWikiMainSlot;
}

/** Main slot fields for wikitext extraction. */
export interface MediaWikiMainSlot {
  /** Content model, e.g. `wikitext`. */
  contentmodel?: string;
  /** Format, e.g. `text/x-wiki`. */
  contentformat?: string;
  /** Raw slot content. MediaWiki uses `*` for the text payload. */
  "*"?: string;
}

/**
 * Minimal representation of a fetched spell page wikitext.
 */
export type SpellWikitextPage = {
  /** Numeric MediaWiki page id. */
  pageid: number;
  /** Human-readable page title if present; `null` if missing/unknown. */
  title: string | null;
  /** Raw wikitext extracted from the page's main revision slot. */
  wikitext: string;
};

/**
 * Output file format for cached spell pages fetched in batches by pageid.
 */
export type SpellWikitextBatchFile = {
  /** ISO timestamp of when the generator produced this file. */
  generatedAt: string;
  /** Base wiki origin used for fetches. */
  source: "https://adnd2e.fandom.com";
  /** Category name associated with this output (for traceability). */
  categoryName: string;
  /** The full ordered list of requested page ids (including those that errored). */
  requestedPageIds: number[];
  /** Successful page extracts. */
  pages: SpellWikitextPage[];
  /** Per-page extraction errors (missing/empty/etc). */
  errors: Array<{
    /** Page id that failed to extract. */
    pageid: number;
    /** Title if known. */
    title?: string;
    /** Human-readable error message for the page. */
    message: string;
  }>;
};

/**
 * Result of extracting the first page's wikitext from a MediaWiki revisions response.
 */
export interface MediaWikiWikitextPage {
  /** Page id from MediaWiki. */
  pageId: number | null;
  /** Human title returned by MediaWiki. */
  title: string | null;
  /** Raw wikitext content (`revisions[0].slots.main['*']`). */
  wikitext: string;
  /** Optional normalization info if provided by MediaWiki. */
  normalized?: Array<{ from: string; to: string }>;
}

/**
 * Parsed spell description data extracted from wiki wikitext.
 */
export interface SpellDescriptionJson {
  /** MediaWiki page title, if available. */
  title: string | null;
  /** Raw wikitext as returned by the API. */
  wikitext: string;
  /** HTML rendered from the wikitext (best-effort). */
  html: string;
  /** Key/value fields parsed from `{{Infobox Spells ...}}`. */
  infobox: Record<string, string>;
  /** Section bodies keyed by heading (e.g. `Combat & Tactics`). */
  sections: Record<string, string>;
  /** Section HTML keyed by heading (e.g. `Combat & Tactics`). */
  sectionsHtml: Record<string, string>;
}

/**
 * Output file format for generated wizard spell descriptions.
 */
export type WizardSpellDescriptionsFile = {
  /** ISO timestamp of when the generator produced this file. */
  generatedAt: string;
  /** Base wiki origin used for fetches. */
  source: "https://adnd2e.fandom.com";
  /** Map keyed by spell name; values contain parsed/derived content. */
  spellsByName: Record<string, SpellDescriptionJson>;
};

/**
 * Raw MediaWiki API response shape for the `action=query&list=categorymembers` call.
 */
export interface MediaWikiCategoryMembersResponse {
  /** Present when the API considers the response complete for the request. */
  batchcomplete?: string;
  /** Continuation tokens for pagination. */
  continue?: MediaWikiCategoryMembersContinue;
  /** Query payload containing category members. */
  query?: MediaWikiCategoryMembersQuery;
}

/** Continuation payload for paginating categorymembers. */
export interface MediaWikiCategoryMembersContinue {
  /** Token passed back to `cmcontinue` for the next page. */
  cmcontinue?: string;
  /** Generic MediaWiki continuation token. */
  continue?: string;
}

/** `query` payload for categorymembers. */
export interface MediaWikiCategoryMembersQuery {
  /** Members returned for the requested category page. */
  categorymembers?: MediaWikiCategoryMember[];
}

/**
 * Single member entry in a MediaWiki category listing.
 */
export interface MediaWikiCategoryMember {
  /** Numeric MediaWiki page id. */
  pageid: number;
  /** Namespace id (0 for main/article namespace). */
  ns: number;
  /** Human-readable page title. */
  title: string;
}

/**
 * Output file format for cached category members.
 */
export type CategoryMembersFile = {
  /** Friendly category name (e.g. `Wizard Spells`). */
  categoryName: string;
  /** Complete member list for the category. */
  categoryMembers: MediaWikiCategoryMember[];
};

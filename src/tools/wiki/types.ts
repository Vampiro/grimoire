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
  batchcomplete?: string;
  query?: {
    normalized?: Array<{ from: string; to: string }>;
    pages?: Record<
      string,
      {
        pageid?: number;
        ns?: number;
        title?: string;
        missing?: boolean;
        revisions?: Array<{
          slots?: {
            main?: {
              contentmodel?: string;
              contentformat?: string;
              "*"?: string;
            };
          };
        }>;
      }
    >;
  };
}

/**
 * Minimal representation of a fetched spell page wikitext.
 */
export type SpellWikitextPage = {
  pageid: number;
  title: string | null;
  wikitext: string;
};

/**
 * Output file format for cached spell pages fetched in batches by pageid.
 */
export type SpellWikitextBatchFile = {
  generatedAt: string;
  source: "https://adnd2e.fandom.com";
  categoryName: string;
  requestedPageIds: number[];
  pages: SpellWikitextPage[];
  errors: Array<{
    pageid: number;
    title?: string;
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
  generatedAt: string;
  source: "https://adnd2e.fandom.com";
  spellsByName: Record<string, SpellDescriptionJson>;
};

/**
 * Raw MediaWiki API response shape for the `action=query&list=categorymembers` call.
 */
export interface MediaWikiCategoryMembersResponse {
  batchcomplete?: string;
  continue?: {
    cmcontinue?: string;
    continue?: string;
  };
  query?: {
    categorymembers?: MediaWikiCategoryMember[];
  };
}

/**
 * Single member entry in a MediaWiki category listing.
 */
export interface MediaWikiCategoryMember {
  pageid: number;
  ns: number;
  title: string;
}

/**
 * Output file format for cached category members.
 */
export type CategoryMembersFile = {
  categoryName: string;
  categoryMembers: MediaWikiCategoryMember[];
};

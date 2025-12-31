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
  /** The wiki page name used in the request (e.g. `Fireball_(Wizard_Spell)`). */
  pageName: string;
  /** MediaWiki page id, if available. */
  pageId: number | null;
  /** MediaWiki page title, if available. */
  title: string | null;
  /** Raw wikitext as returned by the API. */
  wikitext: string;
  /** Key/value fields parsed from `{{Infobox Spells ...}}`. */
  infobox: Record<string, string>;
  /** Category labels parsed from `[[Category:...]]`. */
  categories: string[];
  /** Section bodies keyed by heading (e.g. `Combat & Tactics`). */
  sections: Record<string, string>;
}

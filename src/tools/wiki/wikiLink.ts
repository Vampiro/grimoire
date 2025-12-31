/**
 * Utilities for working with adnd2e.fandom.com wiki links.
 */

/**
 * Extracts a MediaWiki page name from a full URL.
 *
 * @example
 * `https://adnd2e.fandom.com/wiki/Fireball_(Wizard_Spell)` -> `Fireball_(Wizard_Spell)`
 */
export function getPageNameFromWikiLink(link: string): string {
  const url = new URL(link);
  if (!url.pathname.startsWith("/wiki/")) {
    throw new Error(`Invalid wiki link (expected /wiki/ path): ${link}`);
  }

  // Keep the raw path segment; it already uses underscores.
  return url.pathname.replace("/wiki/", "");
}

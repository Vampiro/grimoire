import type { WizardSpellDescriptionsFile } from "./types";
import { fetchAdnd2eWikiWikitext } from "./mediaWikiApi";
import { parseSpellWikitextToJson } from "./wikitextParser";
import { getPageNameFromWikiLink } from "./wikiLink";

export type WizardSpellListEntry = {
  /** Spell level (1-9). */
  level: number;
  /** Spell name. */
  name: string;
  /** Full wiki URL for the spell page. */
  link: string;
};

/**
 * Generates spell description JSON for the wizard spell named "Fireball".
 *
 * @remarks
 * This is a pure-ish helper intended for unit testing. It does not write files.
 * It does perform a network call unless a custom `fetchWikitext` is provided.
 */
export async function buildWizardDescriptionsForFireball(
  spells: WizardSpellListEntry[],
  fetchWikitext: (
    /** MediaWiki page title, e.g. `Fireball_(Wizard_Spell)`. */
    pageName: string,
  ) => Promise<{ title: string | null; wikitext: string }> = async (
    pageName,
  ) => {
    const page = await fetchAdnd2eWikiWikitext(pageName);
    return { title: page.title, wikitext: page.wikitext };
  },
): Promise<WizardSpellDescriptionsFile> {
  const spell = spells.find((s) => s.name === "Fireball");
  if (!spell) {
    throw new Error('Could not find "Fireball" in wizardSpells.json');
  }

  const pageName = getPageNameFromWikiLink(spell.link);
  const page = await fetchWikitext(pageName);
  const parsed = parseSpellWikitextToJson({
    title: page.title,
    wikitext: page.wikitext,
  });

  return {
    generatedAt: new Date().toISOString(),
    source: "https://adnd2e.fandom.com",
    spellsByName: {
      [spell.name]: parsed,
    },
  };
}

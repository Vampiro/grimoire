import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchAdnd2eWikiWikitext } from "./wiki/mediaWikiApi";
import { parseSpellWikitextToJson } from "./wiki/wikitextParser";
import { getPageNameFromWikiLink } from "./wiki/wikiLink";
import type { SpellDescriptionJson } from "./wiki/types";

type WizardSpellListEntry = {
  level: number;
  name: string;
  link: string;
};

/**
 * Output file format for generated wizard spell descriptions.
 */
export type WizardSpellDescriptionsFile = {
  generatedAt: string;
  source: "https://adnd2e.fandom.com";
  spellsByName: Record<string, SpellDescriptionJson>;
};

function getRepoRootDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "..", "..");
}

async function readWizardSpellList(repoRoot: string): Promise<WizardSpellListEntry[]> {
  const filePath = path.join(repoRoot, "public", "resources", "wizardSpells.json");
  const text = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(text) as WizardSpellListEntry[];
  return data;
}

async function writeWizardDescriptions(
  repoRoot: string,
  out: WizardSpellDescriptionsFile,
): Promise<void> {
  const outPath = path.join(
    repoRoot,
    "public",
    "resources",
    "wizard-spell-descriptions.json",
  );
  await fs.writeFile(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
}

async function main() {
  const repoRoot = getRepoRootDir();

  const spells = await readWizardSpellList(repoRoot);
  if (spells.length === 0) {
    throw new Error("wizardSpells.json is empty");
  }

  // Start small: only the first wizard spell.
  const first = spells[0];
  const pageName = getPageNameFromWikiLink(first.link);

  const page = await fetchAdnd2eWikiWikitext(pageName);
  const parsed = parseSpellWikitextToJson({
    pageName,
    pageId: page.pageId,
    title: page.title,
    wikitext: page.wikitext,
  });

  const out: WizardSpellDescriptionsFile = {
    generatedAt: new Date().toISOString(),
    source: "https://adnd2e.fandom.com",
    spellsByName: {
      [first.name]: parsed,
    },
  };

  await writeWizardDescriptions(repoRoot, out);

  // Minimal CLI output for npm scripts.
  console.log(
    `Wrote wizard-spell-descriptions.json for: ${first.name} (${pageName})`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

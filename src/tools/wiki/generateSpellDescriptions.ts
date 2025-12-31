import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseSpellWikitextToJson } from "./wikitextParser";
import type { SpellDescriptionJson, SpellWikitextBatchFile } from "./types";

/** Output file format for parsed spell descriptions derived from cached wikitext. */
export type SpellDescriptionsFile = {
  /** ISO timestamp of when the generator produced this file. */
  generatedAt: string;
  /** Base wiki origin used for fetches that produced the inputs. */
  source: "https://adnd2e.fandom.com";
  /** Category name for traceability. */
  categoryName: string;
  /** Descriptions keyed by MediaWiki page title (includes class suffix). */
  spellsByTitle: Record<string, SpellDescriptionJson>;
  /** Parsing errors encountered by this generator (not page fetch errors). */
  errors: Array<{ title: string; message: string }>;
};

/** Resolves the repository root directory from the current script path. */
function getRepoRootDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "..", "..", "..");
}

/** Reads a cached wikitext batch file produced by `generateAllSpellPages`. */
async function readSpellWikitextBatchFile(
  filePath: string,
): Promise<SpellWikitextBatchFile> {
  const text = await fs.readFile(filePath, "utf8");
  return JSON.parse(text) as SpellWikitextBatchFile;
}

/** Parses a batch file into a `spellsByTitle` map. */
function parseBatchFileToDescriptions(opts: {
  batch: SpellWikitextBatchFile;
}): {
  spellsByTitle: Record<string, SpellDescriptionJson>;
  errors: Array<{ title: string; message: string }>;
} {
  const spellsByTitle: Record<string, SpellDescriptionJson> = {};
  const errors: Array<{ title: string; message: string }> = [];

  for (const page of opts.batch.pages) {
    const title = page.title ?? `pageid:${page.pageid}`;

    const parsed = parseSpellWikitextToJson({
      title: page.title,
      wikitext: page.wikitext,
    });

    if (spellsByTitle[title]) {
      errors.push({
        title,
        message:
          "Duplicate title encountered while building spell descriptions",
      });
      continue;
    }

    spellsByTitle[title] = parsed;
  }

  return { spellsByTitle, errors };
}

/**
 * CLI entry point for generating spell descriptions from cached wikitext.
 *
 * @remarks
 * Inputs:
 * - `data/wiki/wizardSpells.json`
 * - `data/wiki/priestSpells.json`
 *
 * Output:
 * - `public/resources/wizardSpellDescriptions.json`
 * - `public/resources/priestSpellDescriptions.json`
 */
async function main() {
  const repoRoot = getRepoRootDir();

  const wizardInPath = path.join(repoRoot, "data", "wiki", "wizardSpells.json");
  const priestInPath = path.join(repoRoot, "data", "wiki", "priestSpells.json");

  const wizardOutPath = path.join(
    repoRoot,
    "public",
    "resources",
    "wizardSpellDescriptions.json",
  );
  const priestOutPath = path.join(
    repoRoot,
    "public",
    "resources",
    "priestSpellDescriptions.json",
  );

  const wizard = await readSpellWikitextBatchFile(wizardInPath);
  const priest = await readSpellWikitextBatchFile(priestInPath);

  const wizardParsed = parseBatchFileToDescriptions({ batch: wizard });
  const priestParsed = parseBatchFileToDescriptions({ batch: priest });

  const wizardOut: SpellDescriptionsFile = {
    generatedAt: new Date().toISOString(),
    source: "https://adnd2e.fandom.com",
    categoryName: wizard.categoryName,
    spellsByTitle: wizardParsed.spellsByTitle,
    errors: wizardParsed.errors,
  };
  const priestOut: SpellDescriptionsFile = {
    generatedAt: new Date().toISOString(),
    source: "https://adnd2e.fandom.com",
    categoryName: priest.categoryName,
    spellsByTitle: priestParsed.spellsByTitle,
    errors: priestParsed.errors,
  };

  await fs.mkdir(path.dirname(wizardOutPath), { recursive: true });
  await fs.writeFile(
    wizardOutPath,
    JSON.stringify(wizardOut, null, 2) + "\n",
    "utf8",
  );
  await fs.writeFile(
    priestOutPath,
    JSON.stringify(priestOut, null, 2) + "\n",
    "utf8",
  );

  console.log(
    `Wrote wizardSpellDescriptions.json (${Object.keys(wizardOut.spellsByTitle).length} spells; ${wizardOut.errors.length} parse errors)`,
  );
  console.log(
    `Wrote priestSpellDescriptions.json (${Object.keys(priestOut.spellsByTitle).length} spells; ${priestOut.errors.length} parse errors)`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

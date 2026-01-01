import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseSpellWikitextToJson } from "./wikitextParser";
import type {
  SpellDescriptionJson,
  SpellDescriptionOverride,
  SpellWikitextBatchFile,
} from "./types";

/** Output file format for parsed spell descriptions derived from cached wikitext. */
export type SpellDescriptionsFile = {
  /** ISO timestamp of when the generator produced this file. */
  generatedAt: string;
  /** Base wiki origin used for fetches that produced the inputs. */
  source: "https://adnd2e.fandom.com";
  /** Category name for traceability. */
  categoryName: string;
  /** Descriptions keyed by spell name (from metadata.name when present). */
  spellsByName: Record<string, SpellDescriptionJson>;
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

type SpellDescriptionOverridesFile = {
  /** Spell titles to omit from output (exact MediaWiki page titles). */
  excludeTitles?: string[];
  /** Map keyed by MediaWiki page title (includes class suffix). */
  spellsByTitle: Record<string, SpellDescriptionOverride>;
};

async function readSpellDescriptionOverridesFile(
  filePath: string,
): Promise<SpellDescriptionOverridesFile | null> {
  try {
    const text = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(text) as SpellDescriptionOverridesFile;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.spellsByTitle || typeof parsed.spellsByTitle !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function mergeCaseInsensitiveRecord(
  base: Record<string, string>,
  overrides: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = { ...base };
  const baseKeysByLower = new Map<string, string>();
  for (const k of Object.keys(out)) baseKeysByLower.set(k.toLowerCase(), k);

  for (const [k, v] of Object.entries(overrides)) {
    const existingKey = baseKeysByLower.get(k.toLowerCase());
    if (existingKey && existingKey !== k) delete out[existingKey];
    out[k] = v;
    baseKeysByLower.set(k.toLowerCase(), k);
  }

  return out;
}

const stripTemplateArtifacts = (html: string): string =>
  html
    .replace(/\{\{\s*Highlight:\s*/gi, "")
    .replace(/\{\{\s*/g, "")
    .replace(/\}\}/g, "")
    .trim();

/** Parses a batch file into a `spellsByName` map. */
function parseBatchFileToDescriptions(opts: {
  batch: SpellWikitextBatchFile;
  overridesByTitle?: Record<string, SpellDescriptionOverride>;
  excludeTitles?: Set<string>;
}): {
  spellsByName: Record<string, SpellDescriptionJson>;
  errors: Array<{ title: string; message: string }>;
} {
  const spellsByName: Record<string, SpellDescriptionJson> = {};
  const errors: Array<{ title: string; message: string }> = [];

  const toTextValue = (v: string) => v.replace(/\r?\n/g, " ").trim();
  const toHtmlValue = (v: string) => v.replace(/\r?\n/g, "<br>").trim();

  const getNameFromMetadata = (
    metadata: Record<string, string>,
    fallback: string,
  ): string => {
    const nameKey = Object.keys(metadata).find(
      (k) => k.trim().toLowerCase() === "name",
    );
    const nameValue = nameKey ? metadata[nameKey]?.trim() : "";
    return nameValue || fallback;
  };

  for (const page of opts.batch.pages) {
    const title = page.title ?? `pageid:${page.pageid}`;

    if (opts.excludeTitles?.has(title)) {
      continue;
    }

    const parsed = parseSpellWikitextToJson({
      title: page.title,
      wikitext: page.wikitext,
    });

    const override = opts.overridesByTitle?.[title];
    const mergedMetadata = override?.metadata
      ? mergeCaseInsensitiveRecord(
          parsed.metadata,
          Object.fromEntries(
            Object.entries(override.metadata).map(([k, v]) => [
              k,
              toTextValue(v),
            ]),
          ),
        )
      : parsed.metadata;

    const mergedSectionsRaw = override?.sections
      ? {
          ...parsed.sections,
          ...Object.fromEntries(
            Object.entries(override.sections).map(([k, v]) => [
              k,
              toHtmlValue(v),
            ]),
          ),
        }
      : parsed.sections;

    const mergedSections = Object.fromEntries(
      Object.entries(mergedSectionsRaw).map(([k, v]) => [
        k,
        stripTemplateArtifacts(v),
      ]),
    );

    const merged: SpellDescriptionJson = {
      metadata: mergedMetadata,
      sections: mergedSections,
    };

    const baseName = getNameFromMetadata(
      merged.metadata,
      page.title ?? `pageid:${page.pageid}`,
    );

    let spellKey = baseName;
    if (spellsByName[spellKey]) {
      const fallbackKey = `${baseName} (${page.title ?? `pageid:${page.pageid}`})`;
      spellKey = spellsByName[fallbackKey]
        ? `${baseName} (${page.pageid})`
        : fallbackKey;
    }

    if (spellsByName[spellKey]) {
      errors.push({
        title: spellKey,
        message:
          "Duplicate spell name encountered after overrides (even after suffixing)",
      });
      continue;
    }

    spellsByName[spellKey] = merged;
  }

  for (const [spellKey, spell] of Object.entries(spellsByName)) {
    spell.sections = Object.fromEntries(
      Object.entries(spell.sections).map(([k, v]) => [
        k,
        stripTemplateArtifacts(v),
      ]),
    );
    spellsByName[spellKey] = spell;
  }

  return { spellsByName, errors };
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

  const overridesPath = path.join(
    repoRoot,
    "data",
    "wiki",
    "spellDescriptionOverrides.json",
  );
  const overridesFile = await readSpellDescriptionOverridesFile(overridesPath);
  const overridesByTitle = overridesFile?.spellsByTitle ?? undefined;
  const excludeTitles = overridesFile?.excludeTitles?.length
    ? new Set(overridesFile.excludeTitles)
    : undefined;

  const wizardParsed = parseBatchFileToDescriptions({
    batch: wizard,
    overridesByTitle,
    excludeTitles,
  });
  const priestParsed = parseBatchFileToDescriptions({
    batch: priest,
    overridesByTitle,
    excludeTitles,
  });

  const wizardOut: SpellDescriptionsFile = {
    generatedAt: new Date().toISOString(),
    source: "https://adnd2e.fandom.com",
    categoryName: wizard.categoryName,
    spellsByName: wizardParsed.spellsByName,
    errors: wizardParsed.errors,
  };
  const priestOut: SpellDescriptionsFile = {
    generatedAt: new Date().toISOString(),
    source: "https://adnd2e.fandom.com",
    categoryName: priest.categoryName,
    spellsByName: priestParsed.spellsByName,
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
    `Wrote wizardSpellDescriptions.json (${Object.keys(wizardOut.spellsByName).length} spells; ${wizardOut.errors.length} parse errors)`,
  );
  console.log(
    `Wrote priestSpellDescriptions.json (${Object.keys(priestOut.spellsByName).length} spells; ${priestOut.errors.length} parse errors)`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

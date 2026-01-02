import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseSpellWikitextToJson } from "./wikitextParser";
import type { SpellDescriptionOverride, SpellWikitextBatchFile } from "./types";
import type {
  SpellDescriptionJson,
  SpellDescriptionsFile,
  SpellDescriptionMetadata,
} from "../../types/Resources";

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

const allowedMetadataKeys: Array<keyof SpellDescriptionMetadata> = [
  "name",
  "source",
  "class",
  "level",
  "school",
  "sphere",
  "verbal",
  "somatic",
  "material",
  "range",
  "duration",
  "aoe",
  "preparationTime",
  "castingTime",
  "save",
  "requirements",
  "subtlety",
  "knockdown",
  "sensory",
  "critical",
  "quest",
];

const allowedKeysByLower = new Map<string, keyof SpellDescriptionMetadata>(
  allowedMetadataKeys.map((k) => [k.toLowerCase(), k]),
);

const WIKI_BASE_URL = "https://adnd2e.fandom.com/wiki";

function mergeCaseInsensitiveRecord(
  base: SpellDescriptionMetadata,
  overrides: Record<string, string | undefined>,
): SpellDescriptionMetadata {
  const out: SpellDescriptionMetadata = { ...base };
  const existingKeysByLower = new Map<string, keyof SpellDescriptionMetadata>();
  for (const k of Object.keys(out) as Array<keyof SpellDescriptionMetadata>) {
    existingKeysByLower.set(k.toLowerCase(), k);
  }

  for (const [rawKey, v] of Object.entries(overrides)) {
    if (v === undefined) continue;
    const normalizedKey = allowedKeysByLower.get(rawKey.toLowerCase());
    if (!normalizedKey) continue;
    const lower = normalizedKey.toLowerCase();
    const existingKey = existingKeysByLower.get(lower);
    if (existingKey && existingKey !== normalizedKey) {
      delete out[existingKey];
    }
    (out as Record<string, string | boolean | undefined>)[normalizedKey] = v;
    existingKeysByLower.set(lower, normalizedKey);
  }

  return out;
}

function filterKnownMetadata(
  metadata: SpellDescriptionMetadata,
): SpellDescriptionMetadata {
  const out: SpellDescriptionMetadata = {};
  for (const key of allowedMetadataKeys) {
    const val = metadata[key];
    if (val !== undefined) {
      (out as Record<string, string | boolean | undefined>)[key] = val;
    }
  }
  return out;
}

function normalizeComponentFlags(
  metadata: SpellDescriptionMetadata,
): SpellDescriptionMetadata {
  const out: SpellDescriptionMetadata = { ...metadata };
  const componentKeys: Array<keyof SpellDescriptionMetadata> = [
    "verbal",
    "somatic",
    "material",
  ];

  for (const key of componentKeys) {
    const raw = out[key];
    if (raw === undefined) continue;
    const value = String(raw).trim().toLowerCase();
    if (value === "1" || value === "true") {
      (out as Record<string, boolean>)[key] = true;
    } else {
      delete out[key];
    }
  }

  return out;
}

const stripTemplateArtifacts = (html: string): string =>
  html
    .replace(/\{\{\s*Highlight:\s*/gi, "")
    .replace(/\{\{\s*/g, "")
    .replace(/\}\}/g, "")
    .trim();

/** Parses a batch file into a `spellsByWikiPageId` map. */
function parseBatchFileToDescriptions(opts: {
  batch: SpellWikitextBatchFile;
  overridesByTitle?: Record<string, SpellDescriptionOverride>;
  excludeTitles?: Set<string>;
  wikiBaseUrl?: string;
}): {
  spellsByWikiPageId: Record<string, SpellDescriptionJson>;
  errors: Array<{ title: string; message: string }>;
} {
  const wikiBaseUrl = opts.wikiBaseUrl ?? WIKI_BASE_URL;
  const spellsByWikiPageId: Record<string, SpellDescriptionJson> = {};
  const errors: Array<{ title: string; message: string }> = [];

  const toTextValue = (v: string) => v.replace(/\r?\n/g, " ").trim();
  const toHtmlValue = (v: string) => v.replace(/\r?\n/g, "<br>").trim();

  const getNameFromMetadata = (
    metadata: SpellDescriptionJson["metadata"],
    fallback: string,
  ): string => {
    const nameKey = Object.keys(metadata).find(
      (k) => k.trim().toLowerCase() === "name",
    ) as keyof SpellDescriptionMetadata | undefined;
    const rawName = nameKey ? metadata[nameKey] : undefined;
    const nameValue = typeof rawName === "string" ? rawName.trim() : "";
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

    const mergedMetadataWithComponents =
      normalizeComponentFlags(mergedMetadata);

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
      wikiPageId: page.pageid,
      wikiLink: page.pageid
        ? `${wikiBaseUrl}/?curid=${page.pageid}`
        : undefined,
      metadata: filterKnownMetadata(mergedMetadataWithComponents),
      sections: mergedSections,
    };

    const resolvedName = getNameFromMetadata(
      merged.metadata,
      page.title ?? `pageid:${page.pageid}`,
    );
    if (!merged.metadata.name && resolvedName) {
      merged.metadata.name = resolvedName;
    }

    const pageIdKey = page.pageid ? String(page.pageid) : "";
    if (!pageIdKey) {
      errors.push({
        title: page.title ?? "<unknown page>",
        message: "Missing pageid; skipping spell entry",
      });
      continue;
    }

    if (spellsByWikiPageId[pageIdKey]) {
      errors.push({
        title: page.title ?? pageIdKey,
        message: `Duplicate pageid ${pageIdKey} encountered; skipping subsequent entry`,
      });
      continue;
    }

    spellsByWikiPageId[pageIdKey] = merged;
  }

  for (const [spellKey, spell] of Object.entries(spellsByWikiPageId)) {
    spell.sections = Object.fromEntries(
      Object.entries(spell.sections).map(([k, v]) => [
        k,
        stripTemplateArtifacts(v),
      ]),
    );
    spellsByWikiPageId[spellKey] = spell;
  }

  return { spellsByWikiPageId, errors };
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
    wikiBaseUrl: WIKI_BASE_URL,
  });
  const priestParsed = parseBatchFileToDescriptions({
    batch: priest,
    overridesByTitle,
    excludeTitles,
    wikiBaseUrl: WIKI_BASE_URL,
  });

  const wizardOut: SpellDescriptionsFile = {
    generatedAt: new Date().toISOString(),
    source: "https://adnd2e.fandom.com",
    categoryName: wizard.categoryName,
    spellsByWikiPageId: wizardParsed.spellsByWikiPageId,
    errors: wizardParsed.errors,
  };
  const priestOut: SpellDescriptionsFile = {
    generatedAt: new Date().toISOString(),
    source: "https://adnd2e.fandom.com",
    categoryName: priest.categoryName,
    spellsByWikiPageId: priestParsed.spellsByWikiPageId,
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
    `Wrote wizardSpellDescriptions.json (${Object.keys(wizardOut.spellsByWikiPageId).length} spells; ${wizardOut.errors.length} parse errors)`,
  );
  console.log(
    `Wrote priestSpellDescriptions.json (${Object.keys(priestOut.spellsByWikiPageId).length} spells; ${priestOut.errors.length} parse errors)`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

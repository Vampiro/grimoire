import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseSpellWikitextToJson } from "./wikitextParser";
import type { SpellDescriptionOverride, SpellWikitextBatchFile } from "./types";
import type {
  SpellDescriptionJson,
  SpellDescriptionsFile,
  SpellDescriptionMetadata,
  SpellListEntry,
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
  "sphereRaw",
  "spheres",
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
allowedKeysByLower.set("sphere", "sphereRaw");

const WIKI_BASE_URL = "https://adnd2e.fandom.com/wiki";
const RESOURCE_VERSIONS_PATH = path.resolve(
  getRepoRootDir(),
  "src",
  "resources",
  "latestResourceVersions.ts",
);

type ResourceVersionMap = Record<string, number>;
type MetadataMap = Record<
  keyof SpellDescriptionMetadata,
  SpellDescriptionMetadata[keyof SpellDescriptionMetadata]
>;

function mergeCaseInsensitiveRecord(
  base: SpellDescriptionMetadata,
  overrides: Record<string, string | undefined>,
): SpellDescriptionMetadata {
  const out: MetadataMap = { ...base } as MetadataMap;
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
    out[normalizedKey] = v as MetadataMap[keyof SpellDescriptionMetadata];
    existingKeysByLower.set(lower, normalizedKey);
  }

  return out as SpellDescriptionMetadata;
}

function filterKnownMetadata(
  metadata: SpellDescriptionMetadata,
): SpellDescriptionMetadata {
  const out: Partial<MetadataMap> = { name: "", source: "" };
  for (const key of allowedMetadataKeys) {
    const val = metadata[key];
    if (val !== undefined) {
      out[key] = val as MetadataMap[keyof SpellDescriptionMetadata];
    }
  }
  return out as SpellDescriptionMetadata;
}

function normalizeComponentFlags(
  metadata: SpellDescriptionMetadata,
): SpellDescriptionMetadata {
  const out: MetadataMap = { ...metadata } as MetadataMap;
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
      out[key] = true as MetadataMap[keyof SpellDescriptionMetadata];
    } else {
      delete out[key];
    }
  }

  return out as SpellDescriptionMetadata;
}

function normalizeSphereRaw(
  metadata: SpellDescriptionMetadata,
): SpellDescriptionMetadata {
  const out: SpellDescriptionMetadata = { ...metadata };
  const outRecord = out as unknown as Record<string, unknown>;
  if (out.sphereRaw === undefined) {
    const key = Object.keys(outRecord).find((k) => k.toLowerCase() === "sphere");
    if (key) {
      out.sphereRaw = outRecord[key] as string | undefined;
      if (key !== "sphereRaw") {
        delete outRecord[key];
      }
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

const METADATA_TABLE_TITLES = new Set([
  "Karsus's Avatar (Wizard Spell)",
  "Karsus's Avatar (Priest Spell)",
]);

const stripLeadingMetadataTable = (html: string): string =>
  html.replace(/<table[\s\S]*?<\/table>/i, "").trim();

function stripMetadataTablesForTitle(
  title: string,
  sections: Record<string, string>,
): Record<string, string> {
  if (!METADATA_TABLE_TITLES.has(title)) return sections;
  const intro = sections.Introduction;
  if (!intro) return sections;
  return {
    ...sections,
    Introduction: stripLeadingMetadataTable(intro),
  };
}

const parseLevelNumber = (raw: string | undefined): number => {
  if (!raw) return 0;
  const match = String(raw).match(/\d+/);
  return match ? Number(match[0]) : 0;
};

const PRIEST_SPHERE_ORDER = [
  "All",
  "Animal",
  "Astral",
  "Charm",
  "Chaos",
  "Combat",
  "Cosmos",
  "Creation",
  "Divination",
  "Elemental",
  "Elemental Air",
  "Elemental Earth",
  "Elemental Fire",
  "Elemental Silt",
  "Elemental Water",
  "Guardian",
  "Healing",
  "Law",
  "Necromantic",
  "Numbers",
  "Plant",
  "Protection",
  "Summoning",
  "Sun",
  "Thought",
  "Time",
  "Travelers",
  "War",
  "Wards",
  "Weather",
  "Unknown",
];

const PRIEST_SPHERE_SORT = new Map(
  PRIEST_SPHERE_ORDER.map((name, index) => [name, index]),
);

function extractPriestSpheresFromToken(token: string): string[] {
  const lower = token.toLowerCase();
  const found = new Set<string>();
  const add = (sphere: string) => found.add(sphere);
  const hasElementalAll =
    /\belemental\s*\(\s*all\s*\)\b/.test(lower) ||
    /\belemental\s+all\b/.test(lower);

  if (/\belemental\s+air\b/.test(lower)) add("Elemental Air");
  if (/\belemental\s+earth\b/.test(lower)) add("Elemental Earth");
  if (/\belemental\s+fire\b/.test(lower)) add("Elemental Fire");
  if (/\belemental\s+silt\b/.test(lower)) add("Elemental Silt");
  if (/\belemental\s+water\b/.test(lower)) add("Elemental Water");

  if (/\bair\b/.test(lower)) add("Elemental Air");
  if (/\bearth\b/.test(lower)) add("Elemental Earth");
  if (/\bfire\b/.test(lower)) add("Elemental Fire");
  if (/\bsilt\b/.test(lower)) add("Elemental Silt");
  if (/\bwater\b/.test(lower)) add("Elemental Water");

  if (/\belemental\b/.test(lower)) add("Elemental");

  if (!hasElementalAll && /\ball\b/.test(lower)) add("All");
  if (/\banimal\b/.test(lower)) add("Animal");
  if (/\bastral\b/.test(lower)) add("Astral");
  if (/\bcharm\b/.test(lower)) add("Charm");
  if (/\bchaos\b/.test(lower)) add("Chaos");
  if (/\bcombat\b/.test(lower)) add("Combat");
  if (/\bcosmos\b/.test(lower)) add("Cosmos");
  if (/\bcreation\b/.test(lower)) add("Creation");
  if (/\bdivination\b/.test(lower)) add("Divination");
  if (/\bguardian\b/.test(lower)) add("Guardian");
  if (/\bhealing\b/.test(lower)) add("Healing");
  if (/\blaw\b/.test(lower)) add("Law");
  if (/\bnecromantic\b/.test(lower)) add("Necromantic");
  if (/\bnecromancy\b/.test(lower)) add("Necromantic");
  if (/\bnumbers\b/.test(lower)) add("Numbers");
  if (/\bplant\b/.test(lower)) add("Plant");
  if (/\bprotection\b/.test(lower)) add("Protection");
  if (/\bsummoning\b/.test(lower)) add("Summoning");
  if (/\bsun\b/.test(lower)) add("Sun");
  if (/\bthought\b/.test(lower)) add("Thought");
  if (/\btime\b/.test(lower)) add("Time");
  if (/\btravelers\b/.test(lower)) add("Travelers");
  if (/\bwar\b/.test(lower)) add("War");
  if (/\bwards?\b/.test(lower)) add("Wards");
  if (/\bweather\b/.test(lower)) add("Weather");

  return Array.from(found);
}

function derivePriestSpheres(raw: string | undefined): string[] {
  if (!raw || !raw.trim()) return ["Unknown"];

  const spheres = new Set<string>();
  let hasUnknown = false;
  const isIgnorableSphereNote = (value: string) => {
    const key = value.toLowerCase().replace(/[^a-z]/g, "");
    return key === "posm" || key === "psc" || key === "posmpsc";
  };

  const normalized = raw
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/elemental\s*-\s*/gi, "elemental ")
    .replace(/[()]/g, ",")
    .replace(/[;/|]/g, ",")
    .replace(/&/g, ",");

  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const cleaned = part
      .replace(/\b(?:only|just)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) continue;

    const subparts = cleaned.split(/\s+(?:or|and)\s+/i);
    for (const subpart of subparts) {
      const trimmed = subpart.trim();
      if (!trimmed) continue;

      const base = trimmed.split("-")[0].trim();
      if (!base) continue;
      if (isIgnorableSphereNote(base)) {
        continue;
      }

      const matched = extractPriestSpheresFromToken(base);
      if (matched.length === 0) {
        if (/[a-z]/i.test(base)) {
          hasUnknown = true;
        }
        continue;
      }

      for (const sphere of matched) {
        spheres.add(sphere);
      }
    }
  }

  if (
    spheres.has("Elemental Air") ||
    spheres.has("Elemental Earth") ||
    spheres.has("Elemental Fire") ||
    spheres.has("Elemental Silt") ||
    spheres.has("Elemental Water")
  ) {
    spheres.add("Elemental");
  }

  if (spheres.size === 0 || hasUnknown) {
    spheres.add("Unknown");
  }

  return Array.from(spheres).sort((a, b) => {
    const aIndex = PRIEST_SPHERE_SORT.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = PRIEST_SPHERE_SORT.get(b) ?? Number.MAX_SAFE_INTEGER;
    return aIndex === bIndex ? a.localeCompare(b) : aIndex - bIndex;
  });
}

function addPriestSpheres(spellsById: Record<string, SpellDescriptionJson>) {
  for (const spell of Object.values(spellsById)) {
    spell.metadata.spheres = derivePriestSpheres(spell.metadata.sphereRaw);
  }
}

type WriteJsonOpts = { ignoreKeys?: string[] };

const stripKeys = (value: unknown, ignore: Set<string>): unknown => {
  if (!ignore.size) return value;
  if (Array.isArray(value)) return value.map((v) => stripKeys(v, ignore));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !ignore.has(k))
        .map(([k, v]) => [k, stripKeys(v, ignore)]),
    );
  }
  return value;
};

async function writeJsonIfChanged(
  outPath: string,
  data: unknown,
  opts?: WriteJsonOpts,
): Promise<boolean> {
  const ignoreKeys = new Set(opts?.ignoreKeys ?? []);
  const serialize = (val: unknown) =>
    JSON.stringify(stripKeys(val, ignoreKeys), null, 2) + "\n";

  const next = serialize(data);
  try {
    const currentRaw = await fs.readFile(outPath, "utf8");
    const currentParsed = JSON.parse(currentRaw) as unknown;
    const current = serialize(currentParsed);
    if (current === next) {
      return false;
    }
  } catch {
    // File missing or parse failed; will write below.
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  return true;
}

async function readResourceVersions(): Promise<ResourceVersionMap> {
  try {
    const mod = (await import(pathToFileURL(RESOURCE_VERSIONS_PATH).href)) as {
      LATEST_RESOURCE_VERSIONS?: ResourceVersionMap;
    };
    if (mod?.LATEST_RESOURCE_VERSIONS)
      return { ...mod.LATEST_RESOURCE_VERSIONS };
  } catch {
    // Fall back to defaults below.
  }
  return {};
}

async function writeResourceVersions(
  versions: ResourceVersionMap,
): Promise<void> {
  const sortedEntries = Object.entries(versions).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const objLiteral = sortedEntries.map(([k, v]) => `  ${k}: ${v},`).join("\n");
  const content = `/**\n * Latest known versions for runtime-loaded resources.\n *\n * @remarks\n * Increment a value to invalidate IndexedDB caches and force a refetch.\n */\nexport const LATEST_RESOURCE_VERSIONS = {\n${objLiteral}\n} as const;\n\nexport type LatestResourceVersions = typeof LATEST_RESOURCE_VERSIONS;\n`;

  const existing = await fs
    .readFile(RESOURCE_VERSIONS_PATH, "utf8")
    .catch(() => "");
  if (existing === content) return;
  await fs.writeFile(RESOURCE_VERSIONS_PATH, content, "utf8");
}

/** Parses a batch file into a `spellsById` map. */
function parseBatchFileToDescriptions(opts: {
  batch: SpellWikitextBatchFile;
  overridesByTitle?: Record<string, SpellDescriptionOverride>;
  excludeTitles?: Set<string>;
  wikiBaseUrl?: string;
}): {
  spellsById: Record<string, SpellDescriptionJson>;
  errors: Array<{ title: string; message: string }>;
} {
  const wikiBaseUrl = opts.wikiBaseUrl ?? WIKI_BASE_URL;
  const spellsById: Record<string, SpellDescriptionJson> = {};
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
    const mergedMetadataNormalized =
      normalizeSphereRaw(mergedMetadataWithComponents);

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

    let mergedSections = Object.fromEntries(
      Object.entries(mergedSectionsRaw).map(([k, v]) => [
        k,
        stripTemplateArtifacts(v),
      ]),
    );
    mergedSections = stripMetadataTablesForTitle(title, mergedSections);

    const filteredMetadata = filterKnownMetadata(mergedMetadataNormalized);
    const resolvedName = getNameFromMetadata(
      filteredMetadata,
      page.title ?? `pageid:${page.pageid}`,
    ).trim();

    if (!resolvedName) {
      errors.push({
        title: page.title ?? `pageid:${page.pageid}`,
        message: "Missing spell name; skipping spell entry",
      });
      continue;
    }

    filteredMetadata.name = resolvedName;

    const resolvedSource = String(filteredMetadata.source ?? "").trim();
    if (!resolvedSource) {
      errors.push({
        title: page.title ?? `pageid:${page.pageid}`,
        message: "Missing spell source; skipping spell entry",
      });
      continue;
    }

    filteredMetadata.source = resolvedSource;

    const merged: SpellDescriptionJson = {
      id: page.pageid,
      wikiLink: page.pageid
        ? `${wikiBaseUrl}/?curid=${page.pageid}`
        : undefined,
      metadata: filteredMetadata,
      sections: mergedSections,
    };

    const pageIdKey = page.pageid ? String(page.pageid) : "";
    if (!pageIdKey) {
      errors.push({
        title: page.title ?? "<unknown page>",
        message: "Missing pageid; skipping spell entry",
      });
      continue;
    }

    if (spellsById[pageIdKey]) {
      errors.push({
        title: page.title ?? pageIdKey,
        message: `Duplicate pageid ${pageIdKey} encountered; skipping subsequent entry`,
      });
      continue;
    }

    spellsById[pageIdKey] = merged;
  }

  for (const [spellKey, spell] of Object.entries(spellsById)) {
    spell.sections = Object.fromEntries(
      Object.entries(spell.sections).map(([k, v]) => [
        k,
        stripTemplateArtifacts(v),
      ]),
    );
    spellsById[spellKey] = spell;
  }

  return { spellsById, errors };
}

function buildSpellListEntries(
  spellsById: Record<string, SpellDescriptionJson>,
): SpellListEntry[] {
  return Object.entries(spellsById).map(([id, spell]) => {
    const level = parseLevelNumber(spell.metadata.level);
    const name = spell.metadata.name || `pageid:${id}`;
    return {
      level,
      name,
      id: Number(id),
      wikiLink: spell.wikiLink,
    } satisfies SpellListEntry;
  });
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

  const wizardListOutPath = path.join(
    repoRoot,
    "public",
    "resources",
    "wizardSpells.json",
  );
  const priestListOutPath = path.join(
    repoRoot,
    "public",
    "resources",
    "priestSpells.json",
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

  addPriestSpheres(priestParsed.spellsById);

  const wizardOut: SpellDescriptionsFile = {
    generatedAt: new Date().toISOString(),
    source: "https://adnd2e.fandom.com",
    categoryName: wizard.categoryName,
    spellsById: wizardParsed.spellsById,
    errors: wizardParsed.errors,
  };
  const priestOut: SpellDescriptionsFile = {
    generatedAt: new Date().toISOString(),
    source: "https://adnd2e.fandom.com",
    categoryName: priest.categoryName,
    spellsById: priestParsed.spellsById,
    errors: priestParsed.errors,
  };

  const wizardList = buildSpellListEntries(wizardOut.spellsById);
  const priestList = buildSpellListEntries(priestOut.spellsById);

  const changes: Record<string, boolean> = {
    wizardSpellDescriptions: await writeJsonIfChanged(
      wizardOutPath,
      wizardOut,
      {
        ignoreKeys: ["generatedAt"],
      },
    ),
    priestSpellDescriptions: await writeJsonIfChanged(
      priestOutPath,
      priestOut,
      {
        ignoreKeys: ["generatedAt"],
      },
    ),
    wizardSpells: await writeJsonIfChanged(wizardListOutPath, wizardList),
    priestSpells: await writeJsonIfChanged(priestListOutPath, priestList),
  };

  const currentVersions = await readResourceVersions();
  const nextVersions: ResourceVersionMap = {
    ...currentVersions,
    wizardSpellDescriptions: currentVersions.wizardSpellDescriptions ?? 1,
    priestSpellDescriptions: currentVersions.priestSpellDescriptions ?? 1,
    wizardSpells: currentVersions.wizardSpells ?? 1,
    priestSpells: currentVersions.priestSpells ?? 1,
  };

  for (const [key, changed] of Object.entries(changes)) {
    if (changed) {
      nextVersions[key] = (currentVersions[key] ?? 1) + 1;
    }
  }

  await writeResourceVersions(nextVersions);

  console.log(
    `wizardSpellDescriptions.json: ${Object.keys(wizardOut.spellsById).length} spells; ${wizardOut.errors.length} parse errors (${changes.wizardSpellDescriptions ? "updated" : "unchanged"})`,
  );
  console.log(
    `priestSpellDescriptions.json: ${Object.keys(priestOut.spellsById).length} spells; ${priestOut.errors.length} parse errors (${changes.priestSpellDescriptions ? "updated" : "unchanged"})`,
  );
  console.log(
    `wizardSpells.json (derived list): ${wizardList.length} spells (${changes.wizardSpells ? "updated" : "unchanged"})`,
  );
  console.log(
    `priestSpells.json (derived list): ${priestList.length} spells (${changes.priestSpells ? "updated" : "unchanged"})`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

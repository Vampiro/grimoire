import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchAdnd2eWikiWikitextByPageIds } from "./pageRevisionsByPageIdApi";
import type {
  CategoryMembersFile,
  MediaWikiCategoryMember,
  SpellWikitextBatchFile,
} from "./types";

/** A non-page-specific error encountered while generating output files. */
type ErrorEntry = {
  /** Category-qualified scope used for grouping in the final report. */
  scope: string;
  /** Human-readable error message. */
  message: string;
  /** Optional structured details (serialized as JSON when possible). */
  details?: unknown;
};

/** Indents each non-empty line by the given number of spaces. */
function indentLines(text: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line.length ? prefix + line : line))
    .join("\n");
}

/** Resolves the repository root directory from the current script path. */
function getRepoRootDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "..", "..", "..");
}

/** Sleeps for the given duration (used for request rate-limiting). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Formats a list of generation errors as a single printable block. */
function formatErrors(errors: ErrorEntry[]): string {
  const lines: string[] = [];
  lines.push("\n====================");
  lines.push("GENERATION ERRORS");
  lines.push("====================");

  for (const err of errors) {
    lines.push(`\n[${err.scope}] ${err.message}`);
    if (err.details !== undefined) {
      try {
        lines.push(JSON.stringify(err.details, null, 2));
      } catch {
        lines.push(String(err.details));
      }
    }
  }

  lines.push("\n====================\n");
  return lines.join("\n");
}

/** Extracts numeric page ids from a category member list. */
function pickAllPageIds(members: MediaWikiCategoryMember[]): number[] {
  return members
    .filter((m) => typeof m.pageid === "number")
    .map((m) => m.pageid);
}

/** Splits an array into fixed-size chunks (final chunk may be smaller). */
function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/** Reads and parses a cached category members JSON file. */
async function readCategoryFile(
  filePath: string,
): Promise<CategoryMembersFile> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as CategoryMembersFile;
}

/**
 * Writes a spell wikitext cache file with stable note-worthy formatting.
 *
 * @remarks
 * `requestedPageIds` is intentionally written as a single long line to avoid
 * any formatter involvement and keep generator output stable.
 */
async function writeSpellWikitextBatchFile(
  filePath: string,
  out: SpellWikitextBatchFile,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const lines: string[] = [];
  lines.push("{");
  lines.push(`  \"generatedAt\": ${JSON.stringify(out.generatedAt)},`);
  lines.push(`  \"source\": ${JSON.stringify(out.source)},`);
  lines.push(`  \"categoryName\": ${JSON.stringify(out.categoryName)},`);

  // Intentionally keep as a single long line (no wrapping/newlines).
  lines.push(`  \"requestedPageIds\": [${out.requestedPageIds.join(", ")}],`);

  const pagesJson = JSON.stringify(out.pages, null, 2);
  const pagesLines = pagesJson.split("\n");
  lines.push(`  \"pages\": ${pagesLines[0]}`);
  for (let i = 1; i < pagesLines.length; i++) {
    lines.push(indentLines(pagesLines[i], 2));
  }
  lines[lines.length - 1] = lines[lines.length - 1] + ",";

  const errorsJson = JSON.stringify(out.errors, null, 2);
  const errorsLines = errorsJson.split("\n");
  lines.push(`  \"errors\": ${errorsLines[0]}`);
  for (let i = 1; i < errorsLines.length; i++) {
    lines.push(indentLines(errorsLines[i], 2));
  }

  lines.push("}");
  const text = lines.join("\n") + "\n";
  await fs.writeFile(filePath, text, "utf8");
}

/** Options for generating one category's wikitext cache file. */
type GenerateForCategoryOptions = {
  /** Path to the cached category members file. */
  categoryFilePath: string;
  /** Output path for the generated wikitext batch file. */
  outFilePath: string;
  /** Used if the category file does not include a category name. */
  categoryNameFallback: string;
  /** MediaWiki limit: max page ids allowed per request (typically 50). */
  maxPageIdsPerRequest: number;
  /** Hard cap to keep requests polite (no more than N requests/second). */
  maxRequestsPerSecond: number;
  /** Optional fetch implementation for testing/mocking. */
  fetchFn?: typeof fetch;
  /** Shared rate-limit state so multiple categories share the same throttle. */
  rateLimitState: { lastRequestAt: number };
};

/**
 * Generates a wikitext cache file for a single category.
 *
 * @returns The output payload and any non-page-specific errors.
 */
async function generateForCategory(
  opts: GenerateForCategoryOptions,
): Promise<{ out: SpellWikitextBatchFile; errors: ErrorEntry[] }> {
  const errors: ErrorEntry[] = [];

  let category: CategoryMembersFile;
  try {
    category = await readCategoryFile(opts.categoryFilePath);
  } catch (e) {
    throw new Error(
      `Failed reading category file ${opts.categoryFilePath}: ${String(e)}`,
    );
  }

  const requestedPageIds = pickAllPageIds(category.categoryMembers);
  const batches = chunkArray(requestedPageIds, opts.maxPageIdsPerRequest);

  const maxRps = opts.maxRequestsPerSecond;
  const minIntervalMs = Math.ceil(1000 / maxRps);

  const pages: SpellWikitextBatchFile["pages"] = [];
  const pageErrors: SpellWikitextBatchFile["errors"] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    if (batch.length === 0) continue;

    const waitMs = opts.rateLimitState.lastRequestAt
      ? Math.max(
          0,
          minIntervalMs - (Date.now() - opts.rateLimitState.lastRequestAt),
        )
      : 0;
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    try {
      opts.rateLimitState.lastRequestAt = Date.now();
      const res = await fetchAdnd2eWikiWikitextByPageIds(
        batch,
        opts.fetchFn ?? fetch,
      );

      pages.push(...res.pages);
      pageErrors.push(...res.errors);

      console.log(
        `  fetched batch ${i + 1}/${batches.length} (${batch.length} pageids)`,
      );
    } catch (e) {
      errors.push({
        scope: "network",
        message: `Failed fetching batch ${i + 1}/${batches.length} (${batch.length} pageids)`,
        details: {
          error: String(e),
          pageids: batch,
        },
      });
    }
  }

  pages.sort((a, b) => a.pageid - b.pageid);
  pageErrors.sort((a, b) => a.pageid - b.pageid);

  const out: SpellWikitextBatchFile = {
    generatedAt: new Date().toISOString(),
    source: "https://adnd2e.fandom.com",
    categoryName: category.categoryName || opts.categoryNameFallback,
    requestedPageIds,
    pages,
    errors: pageErrors,
  };

  try {
    await writeSpellWikitextBatchFile(opts.outFilePath, out);
  } catch (e) {
    errors.push({
      scope: "write",
      message: `Failed writing output file: ${opts.outFilePath}`,
      details: String(e),
    });
  }

  return { out, errors };
}

/**
 * CLI entry point for generating wikitext caches for wizard + priest spells.
 *
 * @remarks
 * Fetches wizard spells first, then priest spells, using a shared global request
 * throttle to enforce an overall max requests/second.
 */
async function main() {
  const repoRoot = getRepoRootDir();
  const errors: ErrorEntry[] = [];

  const rateLimitState = { lastRequestAt: 0 };

  const wizardCategoryPath = path.join(
    repoRoot,
    "data",
    "wiki",
    "categoryWizardSpells.json",
  );
  const priestCategoryPath = path.join(
    repoRoot,
    "data",
    "wiki",
    "categoryPriestSpells.json",
  );

  const wizardOutPath = path.join(
    repoRoot,
    "data",
    "wiki",
    "wizardSpells.json",
  );
  const priestOutPath = path.join(
    repoRoot,
    "data",
    "wiki",
    "priestSpells.json",
  );

  const maxPageIdsPerRequest = 50;
  const maxRequestsPerSecond = 3;

  try {
    console.log("Fetching all Wizard spells...");
    const { out, errors: wizardErrors } = await generateForCategory({
      categoryFilePath: wizardCategoryPath,
      outFilePath: wizardOutPath,
      categoryNameFallback: "Wizard Spells",
      maxPageIdsPerRequest,
      maxRequestsPerSecond,
      rateLimitState,
    });

    errors.push(
      ...wizardErrors.map((e) => ({ ...e, scope: `wizard:${e.scope}` })),
    );

    console.log(
      `Wrote wizardSpells.json (requested ${out.requestedPageIds.length}, got ${out.pages.length} pages, ${out.errors.length} page errors)`,
    );
  } catch (e) {
    errors.push({
      scope: "wizard",
      message: "Wizard generation failed",
      details: String(e),
    });
  }

  try {
    console.log("Fetching all Priest spells...");
    const { out, errors: priestErrors } = await generateForCategory({
      categoryFilePath: priestCategoryPath,
      outFilePath: priestOutPath,
      categoryNameFallback: "Priest Spells",
      maxPageIdsPerRequest,
      maxRequestsPerSecond,
      rateLimitState,
    });

    errors.push(
      ...priestErrors.map((e) => ({ ...e, scope: `priest:${e.scope}` })),
    );

    console.log(
      `Wrote priestSpells.json (requested ${out.requestedPageIds.length}, got ${out.pages.length} pages, ${out.errors.length} page errors)`,
    );
  } catch (e) {
    errors.push({
      scope: "priest",
      message: "Priest generation failed",
      details: String(e),
    });
  }

  if (errors.length > 0) {
    console.log(formatErrors(errors));
    process.exitCode = 1;
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

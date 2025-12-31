import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchAdnd2eWikiWikitextByPageIds } from "./wiki/pageRevisionsByPageIdApi";
import type {
  CategoryMembersFile,
  MediaWikiCategoryMember,
  SpellWikitextBatchFile,
} from "./wiki/types";

type ErrorEntry = { scope: string; message: string; details?: unknown };

function indentLines(text: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line.length ? prefix + line : line))
    .join("\n");
}

function getRepoRootDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "..", "..");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function pickFirstPageIds(
  members: MediaWikiCategoryMember[],
  max: number,
): number[] {
  return members
    .filter((m) => typeof m.pageid === "number")
    .slice(0, max)
    .map((m) => m.pageid);
}

async function readCategoryFile(
  filePath: string,
): Promise<CategoryMembersFile> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as CategoryMembersFile;
}

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

async function generateForCategory(opts: {
  categoryFilePath: string;
  outFilePath: string;
  categoryNameFallback: string;
  maxPageIds: number;
  maxRequestsPerSecond: number;
  fetchFn?: typeof fetch;
  rateLimitState: { lastRequestAt: number };
}): Promise<{ out: SpellWikitextBatchFile; hadNetworkRequest: boolean }> {
  const errors: ErrorEntry[] = [];

  let category: CategoryMembersFile;
  try {
    category = await readCategoryFile(opts.categoryFilePath);
  } catch (e) {
    throw new Error(
      `Failed reading category file ${opts.categoryFilePath}: ${String(e)}`,
    );
  }

  const requestedPageIds = pickFirstPageIds(
    category.categoryMembers,
    opts.maxPageIds,
  );

  const maxRps = opts.maxRequestsPerSecond;
  const minIntervalMs = Math.ceil(1000 / maxRps);

  const waitMs = opts.rateLimitState.lastRequestAt
    ? Math.max(
        0,
        minIntervalMs - (Date.now() - opts.rateLimitState.lastRequestAt),
      )
    : 0;
  if (waitMs > 0) {
    await sleep(waitMs);
  }

  let hadNetworkRequest = false;
  let pages: SpellWikitextBatchFile["pages"] = [];
  let pageErrors: SpellWikitextBatchFile["errors"] = [];

  try {
    opts.rateLimitState.lastRequestAt = Date.now();
    hadNetworkRequest = true;

    const res = await fetchAdnd2eWikiWikitextByPageIds(
      requestedPageIds,
      opts.fetchFn ?? fetch,
    );

    pages = res.pages;
    pageErrors = res.errors;
  } catch (e) {
    errors.push({
      scope: "network",
      message: "Failed fetching revisions by pageids",
      details: String(e),
    });
  }

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

  if (errors.length > 0) {
    console.log(formatErrors(errors));
  }

  return { out, hadNetworkRequest };
}

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

  const maxPageIds = 50;
  const maxRequestsPerSecond = 3;

  try {
    const { out } = await generateForCategory({
      categoryFilePath: wizardCategoryPath,
      outFilePath: wizardOutPath,
      categoryNameFallback: "Wizard Spells",
      maxPageIds,
      maxRequestsPerSecond,
      rateLimitState,
    });

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
    const { out } = await generateForCategory({
      categoryFilePath: priestCategoryPath,
      outFilePath: priestOutPath,
      categoryNameFallback: "Priest Spells",
      maxPageIds,
      maxRequestsPerSecond,
      rateLimitState,
    });

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

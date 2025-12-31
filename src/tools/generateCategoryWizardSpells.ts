import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchAllCategoryMembers } from "./wiki/categoryMembersApi";
import type { CategoryMembersFile } from "./wiki/types";

/** Resolves the repository root directory from the current script path. */
function getRepoRootDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "..", "..");
}

/** Writes the wizard category members cache JSON into `data/wiki`. */
async function writeCategoryMembersFile(
  repoRoot: string,
  out: CategoryMembersFile,
): Promise<void> {
  const outPath = path.join(
    repoRoot,
    "data",
    "wiki",
    "categoryWizardSpells.json",
  );
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
}

async function main() {
  /** CLI entry point for generating the wizard category cache. */
  const repoRoot = getRepoRootDir();

  const out = await fetchAllCategoryMembers({
    categoryName: "Wizard Spells",
    categoryTitle: "Category:Wizard_Spells",
    maxRequestsPerSecond: 3,
    cmLimit: 500,
    cmNamespace: 0,
  });

  await writeCategoryMembersFile(repoRoot, out);

  console.log(
    `Wrote categoryWizardSpells.json (${out.categoryMembers.length} members)`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

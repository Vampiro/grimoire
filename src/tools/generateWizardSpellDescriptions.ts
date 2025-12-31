import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildWizardDescriptionsForFireball } from "./wiki/wizardDescriptionsCore";
import type { WizardSpellDescriptionsFile } from "./wiki/types";

export type { WizardSpellDescriptionsFile } from "./wiki/types";

type WizardSpellListEntry = {
  level: number;
  name: string;
  link: string;
};

function getRepoRootDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, "..", "..");
}

async function readWizardSpellList(
  repoRoot: string,
): Promise<WizardSpellListEntry[]> {
  const filePath = path.join(
    repoRoot,
    "public",
    "resources",
    "wizardSpells.json",
  );
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

  const out: WizardSpellDescriptionsFile = await buildWizardDescriptionsForFireball(spells);

  await writeWizardDescriptions(repoRoot, out);

  // Minimal CLI output for npm scripts.
  console.log(`Wrote wizard-spell-descriptions.json for: Fireball`);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

import { Spell } from "@/types/Spell";
import { getResourceCached } from "./resourceCache";
import { LATEST_RESOURCE_VERSIONS } from "@/resources/latestResourceVersions";
import { priestSpellsAtom, store, wizardSpellsAtom } from "@/globalState";

type SpellJson = {
  level: number;
  name: string;
  link: string;
};

let spellDataLoadPromise: Promise<void> | null = null;

/**
 * Loads the runtime spell lists into Jotai atoms.
 *
 * @remarks
 * This is intentionally idempotent: concurrent calls share the same promise.
 * After this resolves, the synchronous getters in this module will return data.
 */
export function loadSpellData(): Promise<void> {
  if (spellDataLoadPromise) return spellDataLoadPromise;

  spellDataLoadPromise = (async () => {
    const versions = LATEST_RESOURCE_VERSIONS;

    const [wizard, priest] = await Promise.all([
      getResourceCached<SpellJson[]>({
        name: "wizardSpells",
        version: versions.wizardSpells,
        url: `/resources/wizardSpells.json?v=${versions.wizardSpells}`,
      }),
      getResourceCached<SpellJson[]>({
        name: "priestSpells",
        version: versions.priestSpells,
        url: `/resources/priestSpells.json?v=${versions.priestSpells}`,
      }),
    ]);

    const wizardSpells: Spell[] = wizard.map((s) => ({
      level: s.level,
      name: s.name,
      link: s.link,
    }));

    const priestSpells: Spell[] = priest.map((s) => ({
      level: s.level,
      name: s.name,
      link: s.link,
    }));

    store.set(wizardSpellsAtom, wizardSpells);
    store.set(priestSpellsAtom, priestSpells);
  })();

  return spellDataLoadPromise;
}

/**
 * Finds a wizard spell by name.
 *
 * @remarks
 * Names are assumed unique within the wizard spell list.
 */
export function findWizardSpellByName(name: string): Spell | null {
  return store.get(wizardSpellsAtom).find((s) => s.name === name) ?? null;
}

/**
 * Finds a priest spell by name.
 *
 * @remarks
 * Names are assumed unique within the priest spell list.
 */
export function findPriestSpellByName(name: string): Spell | null {
  return store.get(priestSpellsAtom).find((s) => s.name === name) ?? null;
}

/**
 * Returns all wizard spells of a given level.
 */
export function getWizardSpellsByLevel(level: number): Spell[] {
  return store.get(wizardSpellsAtom).filter((s) => s.level === level);
}

/**
 * Returns all priest spells of a given level.
 */
export function getPriestSpellsByLevel(level: number): Spell[] {
  return store.get(priestSpellsAtom).filter((s) => s.level === level);
}

import { Spell } from "@/types/Spell";
import { getResourceCached } from "./resourceCache";
import { LATEST_RESOURCE_VERSIONS } from "@/resources/latestResourceVersions";
import {
  priestSpellDescriptionsAtom,
  priestSpellsAtom,
  store,
  wizardSpellDescriptionsAtom,
  wizardSpellsAtom,
} from "@/globalState";
import type { SpellDescriptionsFile, SpellListEntry } from "@/types/Resources";

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
    const baseUrl = import.meta.env.BASE_URL;

    const [wizardList, priestList, wizardDescriptions, priestDescriptions] =
      await Promise.all([
        getResourceCached<SpellListEntry[]>({
          name: "wizardSpells",
          version: versions.wizardSpells,
          url: `${baseUrl}resources/wizardSpells.json?v=${versions.wizardSpells}`,
        }),
        getResourceCached<SpellListEntry[]>({
          name: "priestSpells",
          version: versions.priestSpells,
          url: `${baseUrl}resources/priestSpells.json?v=${versions.priestSpells}`,
        }),
        getResourceCached<SpellDescriptionsFile>({
          name: "wizardSpellDescriptions",
          version: versions.wizardSpellDescriptions,
          url: `${baseUrl}resources/wizardSpellDescriptions.json?v=${versions.wizardSpellDescriptions}`,
        }),
        getResourceCached<SpellDescriptionsFile>({
          name: "priestSpellDescriptions",
          version: versions.priestSpellDescriptions,
          url: `${baseUrl}resources/priestSpellDescriptions.json?v=${versions.priestSpellDescriptions}`,
        }),
      ]);

    const wizardSpellMap = wizardDescriptions.spellsById ?? {};
    const priestSpellMap = priestDescriptions.spellsById ?? {};

    const wizardSpells: Spell[] = wizardList.map((s) => ({
      level: s.level,
      levelString: s.levelString,
      name: s.name,
      id: s.id,
      wikiLink: s.wikiLink ?? wizardSpellMap[String(s.id)]?.wikiLink,
      spellClass: "wizard",
    }));

    const priestSpells: Spell[] = priestList.map((s) => ({
      level: s.level,
      levelString: s.levelString,
      name: s.name,
      id: s.id,
      wikiLink: s.wikiLink ?? priestSpellMap[String(s.id)]?.wikiLink,
      spellClass: "priest",
    }));

    store.set(wizardSpellsAtom, wizardSpells);
    store.set(priestSpellsAtom, priestSpells);
    store.set(wizardSpellDescriptionsAtom, wizardSpellMap);
    store.set(priestSpellDescriptionsAtom, priestSpellMap);
  })();

  return spellDataLoadPromise;
}

export function findWizardSpellById(id: number): Spell | null {
  return store.get(wizardSpellsAtom).find((s) => s.id === id) ?? null;
}

export function findPriestSpellById(id: number): Spell | null {
  return store.get(priestSpellsAtom).find((s) => s.id === id) ?? null;
}

import type { Spell } from "@/types/Spell";
import type { SpellDescriptionJson } from "@/types/Resources";

export type SpellDescriptionMaps = {
  /** Descriptions keyed by spell id (string) for wizard spells. */
  wizard: Record<string, SpellDescriptionJson | undefined>;

  /** Descriptions keyed by spell id (string) for priest spells. */
  priest: Record<string, SpellDescriptionJson | undefined>;
};

/**
 * Returns the best matching description for a spell.
 *
 * @remarks
 * Prefers the spell's own class map, but falls back to the other class.
 * This is used by multiple UI surfaces (dialog + inline viewer) to ensure
 * consistent behavior and avoid duplicating lookup rules.
 */
export function getSpellDescriptionForSpell(
  spell: Spell,
  maps: SpellDescriptionMaps,
): SpellDescriptionJson | undefined {
  const key = String(spell.id);

  if (spell.spellClass === "wizard") {
    return maps.wizard[key] ?? maps.priest[key];
  }

  if (spell.spellClass === "priest") {
    return maps.priest[key] ?? maps.wizard[key];
  }

  return maps.wizard[key] ?? maps.priest[key];
}

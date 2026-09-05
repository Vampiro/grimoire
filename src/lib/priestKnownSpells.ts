import type { PriestClassProgression } from "@/types/PriestClassProgression";

/** Older priests start with their prepared spells, never the whole catalog. */
export function getPriestKnownSpells(
  progression: PriestClassProgression,
): Record<string, true> {
  if (progression.knownSpellsById) return progression.knownSpellsById;

  const known: Record<string, true> = {};
  for (const spells of Object.values(progression.preparedSpells ?? {})) {
    for (const [id, counts] of Object.entries(spells)) {
      if (counts.total > 0) known[id] = true;
    }
  }
  return known;
}

import { useMemo } from "react";
import { useAtomValue } from "jotai";
import type { Spell } from "@/types/Spell";
import {
  priestSpellDescriptionsAtom,
  spellDataStatusAtom,
  wizardSpellDescriptionsAtom,
} from "@/globalState";
import type { SpellDescriptionJson } from "@/types/Resources";
import { getSpellDescriptionForSpell } from "@/lib/spellDescriptions";

/**
 * Returns the best matching spell description for the provided spell.
 *
 * @remarks
 * - Reads from Jotai atoms populated by the app's spell data loader.
 * - Prefers the spell's own class (wizard/priest) and falls back to the other.
 * - Also exposes the global "ready" flag so callers can show a loading state.
 */
export function useSpellDescription(spell: Spell | null | undefined): {
  ready: boolean;
  description: SpellDescriptionJson | undefined;
} {
  const wizardDescriptions = useAtomValue(wizardSpellDescriptionsAtom);
  const priestDescriptions = useAtomValue(priestSpellDescriptionsAtom);
  const spellStatus = useAtomValue(spellDataStatusAtom);

  const description = useMemo(() => {
    if (!spell) return undefined;

    // Delegate the fallback rules to a shared helper so the logic stays in one place.
    return getSpellDescriptionForSpell(spell, {
      wizard: wizardDescriptions,
      priest: priestDescriptions,
    });
  }, [priestDescriptions, spell, wizardDescriptions]);

  return { ready: spellStatus.ready, description };
}

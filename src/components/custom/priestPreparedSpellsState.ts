import { useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";

import { updatePriestPreparedSpellsLevel } from "@/firebase/characters";
import { findPriestSpellById } from "@/lib/spellLookup";
import { getPriestProgressionSpellSlots } from "@/lib/spellSlots";
import { getPriestKnownSpells } from "@/lib/priestKnownSpells";
import { priestSpellDescriptionsAtom, priestSpellsAtom } from "@/globalState";
import { PreparedSpellCounts } from "@/types/ClassProgression";
import { PriestClassProgression } from "@/types/PriestClassProgression";
import type { Spell } from "@/types/Spell";

/** Props shared by the priest spell preparation/casting components. */
export interface PriestPreparedSpellsProps {
  /** Priest spell level (1-7) being rendered/edited. */
  spellLevel: number;
  /** Priest progression data for the character (prepared spells). */
  progression: PriestClassProgression;
  /** Character id used for persistence when mutating prepared spells. */
  characterId: string;
}

type PreparedSpellEntries = Array<[string, PreparedSpellCounts]>;

interface PreparedSpellsState {
  /** Prepared spells for this level, keyed by spell id. */
  spells: Record<string, PreparedSpellCounts>;
  /** Prepared spells sorted by spell name (fallback to id). */
  sortedSpells: PreparedSpellEntries;
  /** Candidate priest spells not currently prepared at this level. */
  availableSpells: Array<[string, Spell]>;
  /** Known spells at this level that also match sphere access. */
  eligibleSpellIds: Set<string>;
  /** Maximum rested slots available for this level. */
  maxSlots: number;
  /** Remaining casts across all prepared spells at this level. */
  castable: number;
  /** Total prepared copies across all spells at this level. */
  totalPrepared: number;
  /** Spell id currently being flashed in the UI after add/increase. */
  flashSpellId: string | null;
  /** Last persistence error, if any. */
  error: string | null;

  /** Briefly highlight a row in the UI to draw attention to changes. */
  flashRow: (spellId: string) => void;
  /** Adjust remaining casts for a spell. */
  adjustRemaining: (spellId: string, deltaRemaining: number) => void;
  /** Adjust prepared (rested) copies for a spell. */
  adjustTotal: (spellId: string, delta: number) => void;
  /** Remove a spell entirely from prepared spells for this level. */
  deleteSpellGroup: (spellId: string) => void;
  /** Add a spell to the prepared list (or increase total if already present). */
  handleAddSpell: (spellId: string) => void;
  /** Convenience helper to add one prepared copy for an existing spell. */
  handleIncreaseCopies: (spellId: string) => void;
}

/**
 * Shared state + persistence layer for the priest "Prepare" and "Cast" spell views.
 */
export function usePriestPreparedSpellsState({
  spellLevel,
  progression,
  characterId,
}: PriestPreparedSpellsProps): PreparedSpellsState {
  const allPriestSpells = useAtomValue(priestSpellsAtom);
  const priestDescriptions = useAtomValue(priestSpellDescriptionsAtom);
  const [localSpells, setLocalSpells] = useState<
    Record<string, PreparedSpellCounts>
  >(progression.preparedSpells[spellLevel] || {});
  const [error, setError] = useState<string | null>(null);
  const [flashSpellId, setFlashSpellId] = useState<string | null>(null);

  useEffect(() => {
    setLocalSpells(progression.preparedSpells[spellLevel] || {});
  }, [progression.preparedSpells, spellLevel]);

  const slotMap = useMemo(
    () => getPriestProgressionSpellSlots(progression),
    [progression],
  );
  const maxSlots = slotMap[spellLevel] || 0;

  const spells = localSpells;
  const castable = useMemo(
    () =>
      Object.values(spells).reduce(
        (sum, s) => sum + Math.max(0, (s.total ?? 0) - (s.used ?? 0)),
        0,
      ),
    [spells],
  );
  const totalPrepared = useMemo(
    () =>
      Object.values(spells).reduce(
        (sum, s) => sum + Math.max(0, s.total ?? 0),
        0,
      ),
    [spells],
  );

  const preparedIds = useMemo(() => new Set(Object.keys(spells)), [spells]);
  const knownSpellIds = useMemo(
    () => new Set(Object.keys(getPriestKnownSpells(progression))),
    [progression],
  );

  const sphereAccess = useMemo(() => {
    const major = new Set(progression.majorSpheres ?? []);
    const minor = new Set(progression.minorSpheres ?? []);
    return {
      hasMajor: major.size > 0,
      hasMinor: minor.size > 0,
      major,
      minor,
    };
  }, [progression.majorSpheres, progression.minorSpheres]);

  const eligibleSpells = useMemo(() => {
    return allPriestSpells
      .filter(
        (spell) =>
          spell.level === spellLevel &&
          knownSpellIds.has(String(spell.id)),
      )
      .filter((spell) => {
        if (!sphereAccess.hasMajor && !sphereAccess.hasMinor) return true;
        const spheres =
          priestDescriptions[String(spell.id)]?.metadata.spheres ?? [];
        if (spheres.length === 0) return false;
        const hasMajorMatch =
          sphereAccess.hasMajor &&
          spheres.some((sphere) => sphereAccess.major.has(sphere));
        const hasMinorMatch =
          sphereAccess.hasMinor &&
          spell.level <= 3 &&
          spheres.some((sphere) => sphereAccess.minor.has(sphere));
        return hasMajorMatch || hasMinorMatch;
      })
      .map((spell) => [String(spell.id), spell] as [string, Spell])
      .sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [
    allPriestSpells,
    knownSpellIds,
    priestDescriptions,
    spellLevel,
    sphereAccess,
  ]);

  const eligibleSpellIds = useMemo(
    () => new Set(eligibleSpells.map(([id]) => id)),
    [eligibleSpells],
  );
  const availableSpells = useMemo(
    () => eligibleSpells.filter(([id]) => !preparedIds.has(id)),
    [eligibleSpells, preparedIds],
  );

  const sortedSpells = useMemo<PreparedSpellEntries>(
    () =>
      Object.entries(spells).sort((a, b) =>
        (findPriestSpellById(Number(a[0]))?.name || a[0]).localeCompare(
          findPriestSpellById(Number(b[0]))?.name || b[0],
        ),
      ),
    [spells],
  );

  const flashRow = (spellId: string) => {
    setFlashSpellId(spellId);
    window.setTimeout(() => {
      setFlashSpellId((current) => (current === spellId ? null : current));
    }, 700);
  };

  const updateLevelSpells = (
    mutate: (
      current: Record<string, PreparedSpellCounts>,
    ) => Record<string, PreparedSpellCounts>,
  ) => {
    setError(null);

    setLocalSpells((currentLevel) => {
      const nextLevel = mutate(currentLevel);

      void updatePriestPreparedSpellsLevel(
        characterId,
        spellLevel,
        nextLevel,
      ).catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to update prepared spells",
        );
      });

      return nextLevel;
    });
  };

  const adjustRemaining = (spellId: string, deltaRemaining: number) =>
    updateLevelSpells((current) => {
      const prev = current[spellId];
      if (!prev) return current;

      const nextTotal = Math.max(0, prev.total ?? 0);
      const nextUsed = Math.min(
        Math.max((prev.used ?? 0) - deltaRemaining, 0),
        nextTotal,
      );

      return {
        ...current,
        [spellId]: { total: nextTotal, used: nextUsed },
      };
    });

  const adjustTotal = (spellId: string, delta: number) => {
    if (delta > 0 && !eligibleSpellIds.has(spellId)) return;
    updateLevelSpells((current) => {
      const prev = current[spellId] ?? { total: 0, used: 0 };
      const nextTotal = Math.max(0, (prev.total ?? 0) + delta);

      if (nextTotal === 0) {
        const { [spellId]: _removed, ...rest } = current;
        return rest;
      }

      const nextUsed = Math.min(Math.max(prev.used ?? 0, 0), nextTotal);
      return {
        ...current,
        [spellId]: { total: nextTotal, used: nextUsed },
      };
    });
  };

  const deleteSpellGroup = (spellId: string) =>
    updateLevelSpells((current) => {
      if (!current[spellId]) return current;
      const { [spellId]: _removed, ...rest } = current;
      return rest;
    });

  const handleAddSpell = (spellId: string) => {
    if (!eligibleSpellIds.has(spellId)) return;
    updateLevelSpells((current) => {
      const prev = current[spellId];
      if (!prev) {
        flashRow(spellId);
        return {
          ...current,
          [spellId]: { total: 1, used: 0 },
        };
      }

      const nextTotal = Math.max(0, (prev.total ?? 0) + 1);
      const nextUsed = Math.min(Math.max(prev.used ?? 0, 0), nextTotal);
      return {
        ...current,
        [spellId]: { total: nextTotal, used: nextUsed },
      };
    });
  };

  const handleIncreaseCopies = (spellId: string) => adjustTotal(spellId, 1);

  return {
    spells,
    sortedSpells,
    availableSpells,
    eligibleSpellIds,
    maxSlots,
    castable,
    totalPrepared,
    flashSpellId,
    error,
    flashRow,
    adjustRemaining,
    adjustTotal,
    deleteSpellGroup,
    handleAddSpell,
    handleIncreaseCopies,
  };
}

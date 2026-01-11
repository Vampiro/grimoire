import { useEffect, useMemo, useState } from "react";

import { updateWizardPreparedSpellsLevel } from "@/firebase/characters";
import { findWizardSpellById } from "@/lib/spellLookup";
import { getWizardProgressionSpellSlots } from "@/lib/spellSlots";
import { PreparedSpellCounts } from "@/types/ClassProgression";
import { WizardClassProgression } from "@/types/WizardClassProgression";
import type { Spell } from "@/types/Spell";

/** Props shared by the wizard spell preparation/casting components. */
export interface WizardPreparedSpellsProps {
  /** Wizard spell level (1-9) being rendered/edited. */
  spellLevel: number;
  /** Wizard progression data for the character (spellbooks + prepared spells). */
  progression: WizardClassProgression;
  /** Character id used for persistence when mutating prepared spells. */
  characterId: string;
}

type PreparedSpellEntries = Array<[string, PreparedSpellCounts]>;

interface PreparedSpellsState {
  /** Prepared spells for this level, keyed by spell id. */
  spells: Record<string, PreparedSpellCounts>;
  /** Prepared spells sorted by spell name (fallback to id). */
  sortedSpells: PreparedSpellEntries;
  /** Candidate spells from spellbooks not currently prepared at this level. */
  availableSpells: Array<[string, Spell]>;
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

  /**
   * Adjust remaining casts for a spell.
   *
   * @param spellId Spell id to mutate.
   * @param deltaRemaining Positive increases remaining casts, negative decreases.
   */
  adjustRemaining: (spellId: string, deltaRemaining: number) => void;

  /**
   * Adjust prepared (rested) copies for a spell.
   *
   * If the total reaches 0, the spell is removed from the prepared list.
   */
  adjustTotal: (spellId: string, delta: number) => void;

  /** Remove a spell entirely from prepared spells for this level. */
  deleteSpellGroup: (spellId: string) => void;

  /** Add a spell to the prepared list (or increase total if already present). */
  handleAddSpell: (spellId: string) => void;

  /** Convenience helper to add one prepared copy for an existing spell. */
  handleIncreaseCopies: (spellId: string) => void;
}

/**
 * Shared state + persistence layer for the wizard "Prepare" and "Cast" spell views.
 *
 * Computes derived values (slot limits, totals, available spells) and exposes
 * mutation helpers that optimistically update local state and persist to Firestore.
 */
export function useWizardPreparedSpellsState({
  spellLevel,
  progression,
  characterId,
}: WizardPreparedSpellsProps): PreparedSpellsState {
  const [localSpells, setLocalSpells] = useState<
    Record<string, PreparedSpellCounts>
  >(progression.preparedSpells[spellLevel] || {});
  const [error, setError] = useState<string | null>(null);
  const [flashSpellId, setFlashSpellId] = useState<string | null>(null);

  useEffect(() => {
    setLocalSpells(progression.preparedSpells[spellLevel] || {});
  }, [progression.preparedSpells, spellLevel]);

  const slotMap = useMemo(
    () => getWizardProgressionSpellSlots(progression),
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

  const availableSpells = useMemo(() => {
    const availableMap = new Map<string, Spell>();
    Object.values(progression.spellbooksById ?? {}).forEach((book) => {
      const spellsById = book.spellsById ?? {};
      Object.keys(spellsById).forEach((spellIdKey) => {
        const spellId = Number(spellIdKey);
        const spell = Number.isNaN(spellId)
          ? null
          : findWizardSpellById(spellId);
        if (!spell || spell.level !== spellLevel) return;
        const idKey = String(spell.id);
        if (preparedIds.has(idKey)) return;
        if (!availableMap.has(idKey)) availableMap.set(idKey, spell);
      });
    });

    return Array.from(availableMap.entries()).sort((a, b) =>
      a[1].name.localeCompare(b[1].name),
    );
  }, [preparedIds, progression.spellbooksById, spellLevel]);

  const sortedSpells = useMemo<PreparedSpellEntries>(
    () =>
      Object.entries(spells).sort((a, b) =>
        (findWizardSpellById(Number(a[0]))?.name || a[0]).localeCompare(
          findWizardSpellById(Number(b[0]))?.name || b[0],
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

  /**
   * Apply a mutation to the current level's prepared spells and persist it.
   *
   * Persistence errors are captured to `error`, but the local optimistic update
   * is still applied.
   */
  const updateLevelSpells = (
    mutate: (
      current: Record<string, PreparedSpellCounts>,
    ) => Record<string, PreparedSpellCounts>,
  ) => {
    setError(null);

    setLocalSpells((currentLevel) => {
      const nextLevel = mutate(currentLevel);

      void updateWizardPreparedSpellsLevel(
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

  /**
   * Modify the remaining casts for a spell by changing its `used` counter.
   *
   * `deltaRemaining = -1` means "cast" (remaining decreases), while
   * `deltaRemaining = +1` means "restore" (remaining increases).
   */
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

  /**
   * Adjust rested prepared copies for a spell.
   *
   * Clamps totals at >= 0 and clamps `used` to the new total.
   * Removes the spell entry entirely when total reaches 0.
   */
  const adjustTotal = (spellId: string, delta: number) =>
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

  /** Remove a spell entry entirely (regardless of total). */
  const deleteSpellGroup = (spellId: string) =>
    updateLevelSpells((current) => {
      if (!current[spellId]) return current;
      const { [spellId]: _removed, ...rest } = current;
      return rest;
    });

  /**
   * Add a spell to the prepared list.
   *
   * If it's already present, increments the total.
   */
  const handleAddSpell = (spellId: string) =>
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

  /** Increase prepared copies by 1. */
  const handleIncreaseCopies = (spellId: string) => adjustTotal(spellId, 1);

  return {
    spells,
    sortedSpells,
    availableSpells,
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

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Plus, Trash2, Minus } from "lucide-react";
import { findWizardSpellById, openSpellViewer } from "@/lib/spellLookup";
import { PreparedSpellCounts } from "@/types/ClassProgression";
import { WizardClassProgression } from "@/types/WizardClassProgression";
import { getWizardProgressionSpellSlots } from "@/lib/spellSlots";
import { updateWizardPreparedSpellsLevel } from "@/firebase/characters";
import { PageRoute } from "@/pages/PageRoute";
import type { Spell } from "@/types/Spell";

interface WizardPreparedSpellsProps {
  spellLevel: number;
  progression: WizardClassProgression;
  characterId: string;
}

/**
 * Renders prepared wizard spells for a given spell level, including slot counts and spellbook selection.
 * Mutations are persisted directly to the wizard progression.
 */
export function WizardPreparedSpells({
  spellLevel,
  progression,
  characterId,
}: WizardPreparedSpellsProps) {
  const [localSpells, setLocalSpells] = useState<
    Record<string, PreparedSpellCounts>
  >(progression.preparedSpells[spellLevel] || {});

  useEffect(() => {
    setLocalSpells(progression.preparedSpells[spellLevel] || {});
  }, [progression.preparedSpells, spellLevel]);

  const spells = localSpells;
  const spellRowCount = Object.keys(spells).length;
  const slotMap = getWizardProgressionSpellSlots(progression);
  const maxSlots = slotMap[spellLevel] || 0;
  const castable = Object.values(spells).reduce(
    (sum, s) => sum + Math.max(0, (s.total ?? 0) - (s.used ?? 0)),
    0,
  );
  const totalPrepared = Object.values(spells).reduce(
    (sum, s) => sum + Math.max(0, s.total ?? 0),
    0,
  );
  const preparedIds = new Set(Object.keys(spells));

  const [error, setError] = useState<string | null>(null);
  const [flashSpellId, setFlashSpellId] = useState<string | null>(null);

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

      // Persist in the background. Firestore offline persistence will queue
      // writes when offline; UI should update immediately.
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

  const deleteSpellGroup = (spellId: string) =>
    updateLevelSpells((current) => {
      if (!current[spellId]) return current;
      const { [spellId]: _removed, ...rest } = current;
      return rest;
    });

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

      // If already present, treat it as increasing copies (no flash).
      const nextTotal = Math.max(0, (prev.total ?? 0) + 1);
      const nextUsed = Math.min(Math.max(prev.used ?? 0, 0), nextTotal);
      return {
        ...current,
        [spellId]: { total: nextTotal, used: nextUsed },
      };
    });

  const handleIncreaseCopies = (spellId: string) => adjustTotal(spellId, 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">Level {spellLevel}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Select
            onValueChange={(spellId) => {
              if (!spellId || spellId === "__none__") return;
              handleAddSpell(spellId);
            }}
          >
            <SelectTrigger
              className="h-7 w-7 justify-center p-0 data-[size=sm]:h-7 data-[size=sm]:min-h-7 [&_svg:last-child]:hidden"
              aria-label="Add prepared spell"
              size="sm"
            >
              <Plus className="h-3 w-3" />
            </SelectTrigger>

            <SelectContent className="max-h-72">
              {(() => {
                const availableMap = new Map<string, Spell>();
                Object.values(progression.spellbooksById).forEach((book) => {
                  const spellsById = book.spellsById ?? {};
                  Object.keys(spellsById).forEach((spellIdKey) => {
                    const spellId = Number(spellIdKey);
                    const spell = Number.isNaN(spellId)
                      ? null
                      : findWizardSpellById(spellId);
                    if (!spell || spell.level !== spellLevel) return;
                    const idKey = String(spell.id);
                    if (preparedIds.has(idKey)) return;
                    if (!availableMap.has(idKey))
                      availableMap.set(idKey, spell);
                  });
                });

                if (availableMap.size === 0) {
                  return (
                    <>
                      <div className="space-y-1 px-3 pb-3 pt-3 text-sm ">
                        <p className="text-muted-foreground">
                          No remaining spells of this level.
                        </p>
                        <p>
                          Update your{" "}
                          <Link
                            className="underline"
                            to={PageRoute.WIZARD_SPELLBOOKS(characterId)}
                          >
                            Spellbooks
                          </Link>{" "}
                          to add level {spellLevel} spells.
                        </p>
                      </div>
                    </>
                  );
                }

                return Array.from(availableMap.entries())
                  .sort((a, b) => a[1].name.localeCompare(b[1].name))
                  .map(([id, spell]) => (
                    <SelectItem key={id} value={id}>
                      {spell.name}
                    </SelectItem>
                  ));
              })()}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Spells for this level */}
      <div className="space-y-2">
        {spellRowCount === 0 && (
          <div className="rounded-md border border-dashed bg-muted/40 p-3 text-sm">
            <p className="font-semibold text-foreground">
              No level {spellLevel} prepared spells yet.
            </p>
            <p className="text-muted-foreground">
              Use the add button above to add spells of this level.
            </p>
          </div>
        )}

        {spellRowCount > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-left text-sm">
              <thead>
                <tr>
                  <th className="w-px py-1 pr-0 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    Remaining ({castable})
                    <div className="text-xxs font-normal">
                      − cast / + restore
                    </div>
                  </th>
                  <th className="py-1 pl-0 pr-2 text-xs font-semibold text-muted-foreground">
                    Spell
                  </th>
                  <th
                    className={`w-px py-1 text-right text-xs font-semibold whitespace-nowrap ${
                      totalPrepared > maxSlots
                        ? "text-destructive"
                        : totalPrepared < maxSlots
                          ? "text-amber-500"
                          : "text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-baseline justify-end gap-2">
                      <span>
                        Rested Slots ({totalPrepared}/{maxSlots})
                      </span>
                    </div>
                    <div className="text-xxs font-normal">− remove / + add</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(spells)
                  .sort((a, b) =>
                    (
                      findWizardSpellById(Number(a[0]))?.name || a[0]
                    ).localeCompare(
                      findWizardSpellById(Number(b[0]))?.name || b[0],
                    ),
                  )
                  .map(([spellId, counts]) => {
                    const spell = findWizardSpellById(Number(spellId));
                    const total = Math.max(0, counts.total ?? 0);
                    const used = Math.min(Math.max(counts.used ?? 0, 0), total);
                    const remaining = Math.max(0, total - used);

                    const isFlashing = flashSpellId === spellId;

                    return (
                      <tr
                        key={spellId}
                        className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${
                          isFlashing ? "flash-added-element" : ""
                        }`}
                      >
                        <td className="w-px py-2 pr-4 align-middle whitespace-nowrap">
                          <div className="flex items-center">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 rounded-r-none"
                              disabled={remaining <= 0}
                              onClick={() => adjustRemaining(spellId, -1)}
                              title="Decrease remaining casts"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <div className="h-8 min-w-10 px-2 flex items-center justify-center border-y border-input bg-background text-sm font-semibold">
                              {remaining}
                            </div>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 rounded-l-none"
                              disabled={remaining >= total}
                              onClick={() => adjustRemaining(spellId, 1)}
                              title="Increase remaining casts"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>

                        <td className="py-2 pl-0 pr-2 align-middle">
                          <Button
                            variant="link"
                            className="h-auto p-0 text-left text-sm disabled:text-muted-foreground"
                            onClick={() => {
                              if (!spell) return;
                              openSpellViewer(spell);
                            }}
                            disabled={!spell}
                          >
                            {spell?.name ?? spellId}
                          </Button>
                        </td>

                        <td className="w-px py-2 align-middle whitespace-nowrap">
                          <div className="flex items-center justify-end">
                            {total <= 1 ? (
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 rounded-r-none"
                                disabled={total === 0}
                                onClick={() => deleteSpellGroup(spellId)}
                                title="Remove this spell from prepared"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 rounded-r-none"
                                disabled={total === 0}
                                onClick={() => adjustTotal(spellId, -1)}
                                title="Decrease prepared copies"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            )}
                            <div className="h-8 min-w-10 px-2 flex items-center justify-center border-y border-input bg-background text-sm font-semibold text-foreground">
                              {total}
                            </div>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 rounded-l-none"
                              onClick={() => handleIncreaseCopies(spellId)}
                              title="Increase prepared copies"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

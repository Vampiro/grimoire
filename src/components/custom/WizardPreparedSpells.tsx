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
import { findSpellById } from "@/lib/spellLookup";
import {
  WizardClassProgression,
  PreparedSpell,
} from "@/types/ClassProgression";
import { getWizardProgressionSpellSlots } from "@/lib/spellSlots";
import { updateWizardPreparedSpellsLevel } from "@/firebase/characters";
import { PageRoute } from "@/pages/PageRoute";
import type { Spell } from "@/types/Spell";

interface WizardPreparedSpellsProps {
  spellLevel: number;
  progression: WizardClassProgression;
  characterId: string;
  onViewSpell?: (spell: Spell) => void;
}

/**
 * Renders prepared wizard spells for a given spell level, including slot counts and spellbook selection.
 * Mutations are persisted directly to the wizard progression.
 */
export function WizardPreparedSpells({
  spellLevel,
  progression,
  characterId,
  onViewSpell,
}: WizardPreparedSpellsProps) {
  const [localSpells, setLocalSpells] = useState<PreparedSpell[]>(
    progression.preparedSpells[spellLevel] || [],
  );

  useEffect(() => {
    setLocalSpells(progression.preparedSpells[spellLevel] || []);
  }, [progression.preparedSpells, spellLevel]);

  const spells = localSpells;
  const slotMap = getWizardProgressionSpellSlots(progression);
  const maxSlots = slotMap[spellLevel] || 0;
  const castable = spells.filter((s) => !s.used).length;
  const totalPrepared = spells.length;
  const preparedIds = new Set(spells.map((s) => s.spellId));

  const [error, setError] = useState<string | null>(null);
  const [flashSpellId, setFlashSpellId] = useState<string | null>(null);

  const flashRow = (spellId: string) => {
    setFlashSpellId(spellId);
    window.setTimeout(() => {
      setFlashSpellId((current) => (current === spellId ? null : current));
    }, 700);
  };

  const updateLevelSpells = (
    mutate: (current: PreparedSpell[]) => PreparedSpell[],
  ) => {
    setError(null);

    setLocalSpells((currentLevel) => {
      const nextLevel = mutate(currentLevel);

      // Persist in the background. Firestore offline persistence will queue
      // writes when offline; UI should update immediately.
      void updateWizardPreparedSpellsLevel(characterId, spellLevel, nextLevel)
        .catch((err) => {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to update prepared spells",
          );
        });

      return nextLevel;
    });
  };

  const updateSpellGroup = (
    spellId: string,
    mutate: (group: PreparedSpell[]) => PreparedSpell[],
  ) =>
    updateLevelSpells((current) => {
      const others = current.filter((s) => s.spellId !== spellId);
      const group = current.filter((s) => s.spellId === spellId);
      const nextGroup = mutate(group);
      return [...others, ...nextGroup];
    });

  const adjustRemaining = (spellId: string, delta: number, total: number) =>
    updateSpellGroup(spellId, (group) => {
      const currentRemaining = group.filter((s) => !s.used).length;
      const nextRemaining = Math.min(
        Math.max(currentRemaining + delta, 0),
        total,
      );
      const used = Math.max(total - nextRemaining, 0);
      return [
        ...Array.from({ length: nextRemaining }, () => ({
          spellId,
          used: false,
        })),
        ...Array.from({ length: used }, () => ({ spellId, used: true })),
      ];
    });

  const adjustTotal = (spellId: string, delta: number) =>
    updateSpellGroup(spellId, (group) => {
      const total = Math.max(0, group.length + delta);
      if (total === 0) return [];

      const unused = group.filter((s) => !s.used);
      const used = group.filter((s) => s.used);

      if (delta < 0) {
        const removeCount = Math.min(group.length, Math.abs(delta));
        const ordered = [...unused, ...used];
        return ordered.slice(0, group.length - removeCount);
      }

      // delta > 0, add fresh unused slots
      return [
        ...group,
        ...Array.from({ length: delta }, () => ({ spellId, used: false })),
      ];
    });

  const deleteSpellGroup = (spellId: string) =>
    updateSpellGroup(spellId, () => []);

  const handleAddSpell = (spellId: string) => {
    flashRow(spellId);
    return adjustTotal(spellId, 1);
  };

  const handleIncreaseCopies = (spellId: string) => adjustTotal(spellId, 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">Level {spellLevel}</h3>
          <span className="text-sm text-muted-foreground">
            ({castable} casts remaining)
          </span>
          <span
            className={`text-sm font-medium ${
              totalPrepared > maxSlots
                ? "text-destructive"
                : totalPrepared < maxSlots
                  ? "text-amber-500"
                  : "text-foreground"
            }`}
          >
            ({totalPrepared}/{maxSlots} rested slots)
          </span>
          {totalPrepared > maxSlots && (
            <span className="text-xs text-destructive">
              Too many rested spell slots used.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            onValueChange={(spellId) => {
              if (!spellId || spellId === "__none__") return;
              handleAddSpell(spellId);
            }}
          >
            <SelectTrigger
              className="h-7 w-7 justify-center p-0 cursor-pointer disabled:cursor-not-allowed data-[size=sm]:h-7 data-[size=sm]:min-h-7 [&_svg:last-child]:hidden"
              aria-label="Add prepared spell"
              size="sm"
            >
              <Plus className="h-3 w-3" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {(() => {
                const availableMap = new Map<string, Spell>();
                progression.spellbooks.forEach((book) => {
                  book.spells.forEach((spellId) => {
                    const spell = findSpellById(spellId);
                    if (!spell || spell.level !== spellLevel) return;
                    if (preparedIds.has(spellId)) return;
                    if (!availableMap.has(spellId))
                      availableMap.set(spellId, spell);
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
                            Spellbook
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
      <div className="space-y-2 pl-4">
        {spells.length === 0 && (
          <div className="rounded-md border border-dashed bg-muted/40 p-3 text-sm">
            <p className="font-semibold text-foreground">
              No level {spellLevel} prepared spells yet.
            </p>
            <p className="text-muted-foreground">
              Use the add button above to add spells of this level.
            </p>
          </div>
        )}

        {spells.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-left text-sm">
              <thead>
                <tr>
                  <th className="w-px py-1 pr-0 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    Remaining
                    <div className="text-[10px] font-normal">
                      − cast / + restore
                    </div>
                  </th>
                  <th className="py-1 pl-0 pr-2 text-xs font-semibold text-muted-foreground">
                    Spell
                  </th>
                  <th className="w-px py-1 text-right text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    Rested Slots
                    <div className="text-[10px] font-normal">
                      − remove / + add
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(
                  spells.reduce<Record<string, PreparedSpell[]>>((acc, s) => {
                    acc[s.spellId] = acc[s.spellId]
                      ? [...acc[s.spellId], s]
                      : [s];
                    return acc;
                  }, {}),
                )
                  .sort((a, b) =>
                    (findSpellById(a[0])?.name || a[0]).localeCompare(
                      findSpellById(b[0])?.name || b[0],
                    ),
                  )
                  .map(([spellId, group]) => {
                    const spell = findSpellById(spellId);
                    const spellName = spell?.name || spellId;
                    const remaining = group.filter((s) => !s.used).length;
                    const total = group.length;

                    const isFlashing = flashSpellId === spellId;

                    return (
                      <tr
                        key={spellId}
                        className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${
                          isFlashing ? "flash-added-row" : ""
                        }`}
                      >
                        <td className="w-px py-2 pr-4 align-middle whitespace-nowrap">
                          <div className="flex items-center">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 rounded-r-none cursor-pointer disabled:cursor-not-allowed"
                              disabled={remaining <= 0}
                              onClick={() =>
                                adjustRemaining(spellId, -1, total)
                              }
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
                              className="h-8 w-8 rounded-l-none cursor-pointer disabled:cursor-not-allowed"
                              disabled={remaining >= total}
                              onClick={() => adjustRemaining(spellId, 1, total)}
                              title="Increase remaining casts"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>

                        <td className="py-2 pl-0 pr-2 align-middle">
                          <button
                            type="button"
                            className="cursor-pointer text-left text-sm text-primary hover:underline disabled:cursor-default disabled:text-muted-foreground"
                            onClick={() =>
                              spell && onViewSpell && onViewSpell(spell)
                            }
                            disabled={!spell}
                          >
                            {spellName}
                          </button>
                        </td>

                        <td className="w-px py-2 align-middle whitespace-nowrap">
                          <div className="flex items-center justify-end">
                            {total <= 1 ? (
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7 rounded-r-none cursor-pointer disabled:cursor-not-allowed"
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
                                className="h-7 w-7 rounded-r-none cursor-pointer disabled:cursor-not-allowed"
                                disabled={total === 0}
                                onClick={() => adjustTotal(spellId, -1)}
                                title="Decrease prepared copies"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            )}
                            <div className="h-7 min-w-9 px-2 flex items-center justify-center border-y border-input bg-background text-sm font-semibold text-foreground">
                              {total}
                            </div>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7 rounded-l-none cursor-pointer disabled:cursor-not-allowed"
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

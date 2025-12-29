import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { updateWizardPreparedSpells } from "@/firebase/characters";
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
  const spells = progression.preparedSpells[spellLevel] || [];
  const slotMap = getWizardProgressionSpellSlots(progression);
  const maxSlots = slotMap[spellLevel] || 0;
  const castable = spells.filter((s) => !s.used).length;
  const totalPrepared = spells.length;
  const preparedIds = new Set(spells.map((s) => s.spellId));

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLevelSpells = async (
    mutate: (current: PreparedSpell[]) => PreparedSpell[],
  ) => {
    setIsUpdating(true);
    setError(null);
    try {
      const current = progression.preparedSpells[spellLevel] ?? [];
      const nextLevel = mutate(current);
      const nextPrepared = {
        ...progression.preparedSpells,
        [spellLevel]: nextLevel,
      };
      await updateWizardPreparedSpells(characterId, nextPrepared);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update prepared spells",
      );
    } finally {
      setIsUpdating(false);
    }
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

  const handleAddSpell = (spellId: string) => adjustTotal(spellId, 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">Level {spellLevel}</h3>
          <span className="text-sm text-muted-foreground">
            ({castable} remaining)
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
            ({totalPrepared}/{maxSlots})
          </span>
          {totalPrepared > maxSlots && (
            <span className="text-xs text-destructive">
              Too many memorized spells.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            disabled={isUpdating}
            onValueChange={(spellId) => {
              if (!spellId || spellId === "__none__") return;
              handleAddSpell(spellId);
            }}
          >
            <SelectTrigger
              className="w-7 justify-center p-0 cursor-pointer disabled:cursor-not-allowed [&_svg:last-child]:hidden"
              aria-label="Add prepared spell"
              size="sm"
            >
              <Plus className="h-4 w-4" />
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
                          No spells of this level remaining.
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

        {Object.entries(
          spells.reduce<Record<string, PreparedSpell[]>>((acc, s) => {
            acc[s.spellId] = acc[s.spellId] ? [...acc[s.spellId], s] : [s];
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

            return (
              <div key={spellId} className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="relative h-10 w-20 p-0 cursor-pointer disabled:cursor-not-allowed"
                      disabled={isUpdating}
                      title="Adjust prepared/remaining copies"
                    >
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="h-full border-l border-muted-foreground origin-center rotate-45" />
                      </div>
                      <span className="absolute top-1 left-2 text-sm font-semibold">
                        {remaining}
                      </span>
                      <span className="absolute bottom-1 right-2 text-sm font-semibold">
                        {total}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-3">
                      <div className="relative h-28 rounded-md border p-4">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="h-full border-l border-muted-foreground origin-center rotate-45" />
                        </div>

                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="cursor-pointer disabled:cursor-not-allowed"
                            disabled={isUpdating || remaining <= 0}
                            onClick={() => adjustRemaining(spellId, -1, total)}
                            title="Mark one as cast"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="cursor-pointer disabled:cursor-not-allowed"
                            disabled={isUpdating || remaining >= total}
                            onClick={() => adjustRemaining(spellId, 1, total)}
                            title="Restore one use"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="absolute bottom-3 right-3 flex items-center gap-2">
                          {total <= 1 ? (
                            <Button
                              size="icon"
                              variant="outline"
                              className="cursor-pointer disabled:cursor-not-allowed"
                              disabled={isUpdating || total === 0}
                              onClick={() => deleteSpellGroup(spellId)}
                              title="Remove this spell from prepared"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="outline"
                              className="cursor-pointer disabled:cursor-not-allowed"
                              disabled={isUpdating || total === 0}
                              onClick={() => adjustTotal(spellId, -1)}
                              title="Decrease prepared copies"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="outline"
                            className="cursor-pointer disabled:cursor-not-allowed"
                            disabled={isUpdating}
                            onClick={() => adjustTotal(spellId, 1)}
                            title="Increase prepared copies"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="absolute top-2 right-3 text-xs text-muted-foreground">
                          Remaining / Prepared
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <button
                  type="button"
                  className="cursor-pointer text-left text-sm text-primary hover:underline disabled:cursor-default disabled:text-muted-foreground"
                  onClick={() => spell && onViewSpell && onViewSpell(spell)}
                  disabled={!spell}
                >
                  {spellName}
                </button>
              </div>
            );
          })}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

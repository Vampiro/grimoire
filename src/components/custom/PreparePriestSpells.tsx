import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAtomValue } from "jotai";

import { Button } from "@/components/ui/button";
import { SelectWithSearch } from "@/components/custom/SelectWithSearch";
import { favoriteSpellIdsAtom, userAtom } from "@/globalState";
import { Minus, Plus, Star, Trash2 } from "lucide-react";

import { PageRoute } from "@/pages/PageRoute";
import { findPriestSpellById } from "@/lib/spellLookup";
import { cn } from "@/lib/utils";

import {
  usePriestPreparedSpellsState,
  PriestPreparedSpellsProps,
} from "./priestPreparedSpellsState";

/**
 * Priest spell preparation view for a single spell level.
 *
 * Allows adding spells from the priest list and adjusting rested prepared
 * counts for each spell level.
 */
type PreparePriestSpellsProps = PriestPreparedSpellsProps & {
  headerRight?: ReactNode;
};

export function PreparePriestSpells({
  headerRight,
  ...props
}: PreparePriestSpellsProps) {
  const navigate = useNavigate();
  const user = useAtomValue(userAtom);
  const favoriteSpellIds = useAtomValue(favoriteSpellIdsAtom);
  const {
    sortedSpells,
    availableSpells,
    maxSlots,
    totalPrepared,
    adjustTotal,
    deleteSpellGroup,
    handleAddSpell,
    handleIncreaseCopies,
    flashSpellId,
    error,
  } = usePriestPreparedSpellsState(props);

  const [addOpen, setAddOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const spellRowCount = sortedSpells.length;
  const countClass =
    totalPrepared < maxSlots
      ? "text-orange-500"
      : totalPrepared > maxSlots
        ? "text-red-500"
        : "text-muted-foreground";

  const favoriteSet = useMemo(
    () => new Set(favoriteSpellIds.map((id) => String(id))),
    [favoriteSpellIds],
  );

  const filteredAvailableSpells = useMemo(() => {
    if (!favoritesOnly) return availableSpells;
    return availableSpells.filter(([id]) => favoriteSet.has(String(id)));
  }, [availableSpells, favoriteSet, favoritesOnly]);

  useEffect(() => {
    if (!user && favoritesOnly) {
      setFavoritesOnly(false);
    }
  }, [favoritesOnly, user]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">Level {props.spellLevel}</h3>
          <SelectWithSearch
            items={filteredAvailableSpells}
            getLabel={(item) => item[1].name}
            getKey={(item) => item[0]}
            renderItem={(item) => (
              <div className="flex items-center justify-between gap-2">
                <span>{item[1].name}</span>
                {favoriteSet.has(String(item[0])) && (
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                )}
              </div>
            )}
            onChange={(item) => {
              if (!item) return;
              handleAddSpell(item[0]);
              setAddOpen(false);
            }}
            emptyText="No remaining spells match your filter."
            open={addOpen}
            onOpenChange={setAddOpen}
            autoFocus={false}
            inputRightSlot={
              user ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setFavoritesOnly((prev) => !prev)}
                  aria-label={
                    favoritesOnly
                      ? "Show all spells"
                      : "Show favorite spells only"
                  }
                  title={
                    favoritesOnly ? "Showing favorites" : "Filter to favorites"
                  }
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      favoritesOnly
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-muted-foreground",
                    )}
                  />
                </Button>
              ) : null
            }
            renderTrigger={() => (
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 justify-center p-0"
                aria-label="Add prepared spell"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          />
        </div>
        {headerRight && <div className="flex items-center">{headerRight}</div>}
      </div>

      <div className="space-y-2">
        {spellRowCount === 0 && (
          <div className="rounded-md border border-dashed bg-muted/40 p-3 text-sm">
            <p className="font-semibold text-foreground">
              No level {props.spellLevel} prepared spells yet.
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
                  <th className="w-px py-1 pr-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    Prepared (
                    <span className={countClass}>{totalPrepared}</span>/
                    {maxSlots})
                    <div className="text-xxs font-normal space-y-0.5">
                      {totalPrepared < maxSlots && (
                        <div className="text-orange-500">
                          Choose {maxSlots - totalPrepared} more to fill slots.
                        </div>
                      )}
                      {totalPrepared > maxSlots && (
                        <div className="text-red-500">
                          Over by {totalPrepared - maxSlots}; remove some.
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="py-1 pl-0 pr-2 text-xs font-semibold text-muted-foreground">
                    Spell
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSpells.map(([spellId, counts]) => {
                  const spell = findPriestSpellById(Number(spellId));
                  const total = Math.max(0, counts.total ?? 0);

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
                          <div className="h-8 min-w-14 px-2 flex items-center justify-center border-y border-input bg-background text-sm font-semibold">
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

                      <td className="py-2 pl-0 pr-2 align-middle">
                        <div className="flex flex-col gap-1 items-start">
                          <Button
                            variant="link"
                            className="h-auto p-0 text-left text-sm disabled:text-muted-foreground"
                            onClick={() => {
                              if (!spell) return;
                              navigate(PageRoute.SPELL_VIEW(spell.id), {
                                state: {
                                  showBack: true,
                                },
                              });
                            }}
                            disabled={!spell}
                          >
                            {spell?.name ?? spellId}
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

import { Link, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { PageRoute } from "@/pages/PageRoute";
import { findPriestSpellById } from "@/lib/spellLookup";

import {
  usePriestPreparedSpellsState,
  PriestPreparedSpellsProps,
} from "./priestPreparedSpellsState";

export interface CastPriestSpellsProps extends PriestPreparedSpellsProps {
  /** Optional content rendered on the right side of the level header row. */
  headerRight?: ReactNode;
}

/**
 * Priest spell casting view for a single spell level.
 *
 * Displays each prepared spell with remaining casts (based on `total - used`),
 * and provides `-1/+1` controls to cast/restore.
 */
export function CastPriestSpells(props: CastPriestSpellsProps) {
  const navigate = useNavigate();
  const {
    sortedSpells,
    maxSlots,
    castable,
    totalPrepared,
    adjustRemaining,
    flashSpellId,
    error,
  } = usePriestPreparedSpellsState(props);

  const spellRowCount = sortedSpells.length;
  const denomClass =
    totalPrepared < maxSlots
      ? "text-orange-500"
      : totalPrepared > maxSlots
        ? "text-red-500"
        : "text-muted-foreground";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">Level {props.spellLevel}</h3>
        </div>
        {props.headerRight ?? null}
      </div>

      <div className="space-y-2">
        {spellRowCount === 0 && (
          <div className="rounded-md border border-dashed bg-muted/40 p-3 text-sm">
            <p className="font-semibold text-foreground">
              No level {props.spellLevel} prepared spells yet.
            </p>
            <p className="text-muted-foreground">
              Add prepared spells on the{" "}
              <Link
                className="underline"
                to={PageRoute.PRIEST_PREPARE(props.characterId)}
              >
                Prepare Spells
              </Link>{" "}
              page.
            </p>
          </div>
        )}

        {spellRowCount > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-left text-sm">
              <thead>
                <tr>
                  <th className="w-px py-1 pr-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    Remaining ({castable}/
                    <span className={denomClass}>{totalPrepared}</span>)
                    <div className="text-xxs font-normal space-y-0.5">
                      <div>-1 cast / +1 restore</div>
                      {totalPrepared < maxSlots && (
                        <div className="text-orange-500">
                          Prepare {maxSlots - totalPrepared} more to fill rested
                          slots.
                        </div>
                      )}
                      {totalPrepared > maxSlots && (
                        <div className="text-red-500">
                          Over by {totalPrepared - maxSlots}; reduce prepared
                          spells.
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
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-r-none px-2"
                            disabled={remaining <= 0}
                            onClick={() => adjustRemaining(spellId, -1)}
                            title="Cast"
                          >
                            -1
                          </Button>
                          <div className="h-8 min-w-14 px-2 flex items-center justify-center border-y border-input bg-background text-sm font-semibold">
                            {remaining} / {total}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-l-none px-2"
                            disabled={remaining >= total}
                            onClick={() => adjustRemaining(spellId, 1)}
                            title="Restore"
                          >
                            +1
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

import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Minus, Plus, Trash2 } from "lucide-react";

import { PageRoute } from "@/pages/PageRoute";
import { findWizardSpellById, openSpellViewer } from "@/lib/spellLookup";

import {
  useWizardPreparedSpellsState,
  WizardPreparedSpellsProps,
} from "./wizardPreparedSpellsState";

/**
 * Wizard spell preparation view for a single spell level.
 *
 * Allows adding spells from the character's spellbooks and adjusting the rested
 * prepared copy count for each spell.
 */
export function PrepareWizardSpells(props: WizardPreparedSpellsProps) {
  const {
    sortedSpells,
    availableSpells,
    missingPreparedSpellIds,
    maxSlots,
    totalPrepared,
    adjustTotal,
    deleteSpellGroup,
    handleAddSpell,
    handleIncreaseCopies,
    flashSpellId,
    error,
  } = useWizardPreparedSpellsState(props);

  const missingPreparedSet = new Set(missingPreparedSpellIds);

  const [addOpen, setAddOpen] = useState(false);
  const spellRowCount = sortedSpells.length;
  const countClass =
    totalPrepared < maxSlots
      ? "text-orange-500"
      : totalPrepared > maxSlots
        ? "text-red-500"
        : "text-muted-foreground";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">Level {props.spellLevel}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 justify-center p-0"
                aria-label="Add prepared spell"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command shouldFilter={availableSpells.length >= 10}>
                {availableSpells.length >= 10 && (
                  <CommandInput placeholder="Search spells..." />
                )}
                <CommandList>
                  <CommandEmpty>
                    <div className="space-y-1 px-3 py-2 text-sm text-muted-foreground">
                      <p>No remaining spells of this level.</p>
                      <p>
                        Update your{" "}
                        <Link
                          className="underline"
                          to={PageRoute.WIZARD_SPELLBOOKS(props.characterId)}
                        >
                          Spellbooks
                        </Link>{" "}
                        to add level {props.spellLevel} spells.
                      </p>
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {availableSpells.map(([id, spell]) => (
                      <CommandItem
                        key={id}
                        value={id}
                        onSelect={(value) => {
                          handleAddSpell(value);
                          setAddOpen(false);
                        }}
                      >
                        {spell.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
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
                  const spell = findWizardSpellById(Number(spellId));
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
                              openSpellViewer(spell);
                            }}
                            disabled={!spell}
                          >
                            {spell?.name ?? spellId}
                          </Button>
                          {missingPreparedSet.has(spellId) && (
                            <div className="text-xs text-destructive">
                              Not in any enabled spellbook.
                            </div>
                          )}
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

import { CastWizardSpells } from "@/components/custom/CastWizardSpells";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCharacterById } from "@/hooks/useCharacterById";
import { getWizardProgressionSpellSlots } from "@/lib/spellSlots";
import { PageRoute } from "@/pages/PageRoute";
import { useParams, Link } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, RotateCcw } from "lucide-react";
import { updateWizardPreparedSpellsLevel } from "@/firebase/characters";
import { useState } from "react";
import { findWizardSpellById } from "@/lib/spellLookup";

/**
 * Wizard "Cast Spells" page.
 *
 * Shows prepared spells grouped by level and tracks remaining casts during the
 * current rest period.
 */
export function WizardCastSpellsPage() {
  const { characterId } = useParams();
  const { character, isLoading } = useCharacterById(characterId);
  const [resting, setResting] = useState(false);
  const [confirmRestOpen, setConfirmRestOpen] = useState(false);
  const [restWarningOpen, setRestWarningOpen] = useState(false);
  const [restWarnings, setRestWarnings] = useState<
    Array<{ id: string; name: string; disabledSpellbooks: string[] }>
  >([]);

  if (isLoading) {
    return <div>Loading prepared spells...</div>;
  }

  if (!character) {
    return <div>No character with id {characterId}</div>;
  }

  const wizard = character.class.wizard;

  if (!wizard) {
    return <div>This character has no wizard progression.</div>;
  }

  const slotMap = getWizardProgressionSpellSlots(wizard);
  const availableLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(
    (lvl) => (slotMap[lvl] ?? 0) > 0,
  );

  const handleRestConfirm = async () => {
    if (resting) return;
    setResting(true);
    try {
      const levelEntries = Object.entries(wizard.preparedSpells);
      for (const [levelKey, spells] of levelEntries) {
        const level = Number(levelKey);
        const resetLevel = Object.fromEntries(
          Object.entries(spells).map(([spellId, counts]) => [
            spellId,
            { total: counts.total ?? 0, used: 0 },
          ]),
        );
        await updateWizardPreparedSpellsLevel(character.id, level, resetLevel);
      }
    } finally {
      setResting(false);
      setConfirmRestOpen(false);
      setRestWarningOpen(false);
    }
  };

  const collectRestWarnings = () => {
    const spellbooks = Object.values(wizard.spellbooksById ?? {});
    const enabledSpellIds = new Set<string>();
    const disabledSpellbooksById = new Map<string, Set<string>>();

    for (const book of spellbooks) {
      const spellIds = Object.keys(book.spellsById ?? {});
      if (book.disabled) {
        for (const spellId of spellIds) {
          let list = disabledSpellbooksById.get(spellId);
          if (!list) {
            list = new Set<string>();
            disabledSpellbooksById.set(spellId, list);
          }
          list.add(book.name);
        }
      } else {
        for (const spellId of spellIds) {
          enabledSpellIds.add(spellId);
        }
      }
    }

    const warnings = new Map<
      string,
      { id: string; name: string; disabledSpellbooks: string[] }
    >();

    const levelEntries = Object.entries(wizard.preparedSpells ?? {});
    for (const [, spells] of levelEntries) {
      for (const [spellId, counts] of Object.entries(spells ?? {})) {
        const used = counts.used ?? 0;
        if (used <= 0) continue;
        if (enabledSpellIds.has(spellId)) continue;
        if (warnings.has(spellId)) continue;
        const spellName = findWizardSpellById(Number(spellId))?.name ?? spellId;
        const disabledSpellbooks = Array.from(
          disabledSpellbooksById.get(spellId) ?? [],
        );
        warnings.set(spellId, {
          id: spellId,
          name: spellName,
          disabledSpellbooks,
        });
      }
    }

    return Array.from(warnings.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  };

  const handleRestClick = () => {
    if (resting) return;
    const warnings = collectRestWarnings();
    if (warnings.length > 0) {
      setRestWarnings(warnings);
      setRestWarningOpen(true);
      return;
    }
    setConfirmRestOpen(true);
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-3xl font-bold">Cast Spells</h1>
        <div className="text-muted-foreground text-sm">Cast wizard spells.</div>
      </div>

      <Card>
        <CardContent className="space-y-4">
          {availableLevels.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/40 p-3 text-sm">
              <p className="font-semibold text-foreground">
                No spell slots available yet.
              </p>
              <p className="text-muted-foreground">
                Increase wizard level or adjust spell slot modifiers to gain
                prepared slots.
              </p>
            </div>
          ) : (
            <>
              <CastWizardSpells
                spellLevel={availableLevels[0]}
                progression={wizard}
                characterId={character.id}
                headerRight={
                  <div className="flex items-center gap-0">
                    <AlertDialog
                      open={confirmRestOpen}
                      onOpenChange={setConfirmRestOpen}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRestClick}
                        disabled={resting}
                        className="rounded-r-none"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {resting ? "Resting..." : "Rest"}
                      </Button>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rest?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will restore remaining casts to their rested
                            slot counts.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex gap-3 justify-end">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRestConfirm}>
                            Rest
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog
                      open={restWarningOpen}
                      onOpenChange={setRestWarningOpen}
                    >
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Some spells aren't in enabled spellbooks
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            <div className="space-y-2">
                              <p>
                                Resting will restore charges for prepared
                                spells.
                              </p>
                              <p className="text-destructive">
                                The following spells are not in any enabled
                                spellbook:
                              </p>
                              <ul className="list-disc pl-5 space-y-1 text-destructive">
                                {restWarnings.map((warning) => (
                                  <li key={warning.id}>
                                    <span className="font-medium">
                                      {warning.name}
                                    </span>
                                    {warning.disabledSpellbooks.length > 0 ? (
                                      <span className="text-muted-foreground">
                                        {" "}
                                        - only in disabled spellbook
                                        {warning.disabledSpellbooks.length > 1
                                          ? "s"
                                          : ""}
                                        :{" "}
                                        {warning.disabledSpellbooks.join(", ")}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        {" "}
                                        - not in any spellbook
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex gap-3 justify-end">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRestConfirm}>
                            Rest anyway
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label="Wizard pages"
                          className="rounded-l-none border-l-0"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-48 p-2">
                        <div className="flex flex-col gap-1 text-sm">
                          <Link
                            to={PageRoute.WIZARD_PREPARE(character.id)}
                            className="rounded px-2 py-1 hover:bg-accent"
                          >
                            Prepare Spells
                          </Link>
                          <Link
                            to={PageRoute.WIZARD_SPELLBOOKS(character.id)}
                            className="rounded px-2 py-1 hover:bg-accent"
                          >
                            Spellbooks
                          </Link>
                          <Link
                            to={PageRoute.WIZARD_KNOWN_SPELLS(character.id)}
                            className="rounded px-2 py-1 hover:bg-accent"
                          >
                            Known Spells
                          </Link>
                          <Link
                            to={PageRoute.WIZARD_SPELL_SLOTS(character.id)}
                            className="rounded px-2 py-1 hover:bg-accent"
                          >
                            Manage Spell Slots
                          </Link>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                }
              />

              {availableLevels.slice(1).map((spellLevel) => (
                <CastWizardSpells
                  key={spellLevel}
                  spellLevel={spellLevel}
                  progression={wizard}
                  characterId={character.id}
                />
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

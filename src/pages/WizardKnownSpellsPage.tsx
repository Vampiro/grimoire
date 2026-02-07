import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAtomValue } from "jotai";
import { ChevronDown, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { SelectWithSearch } from "@/components/custom/SelectWithSearch";
import { wizardSpellsAtom } from "@/globalState";
import {
  addWizardKnownSpell,
  removeWizardKnownSpell,
} from "@/firebase/characters";
import { useCharacterById } from "@/hooks/useCharacterById";
import { findWizardSpellById } from "@/lib/spellLookup";
import {
  getSpellLevelCategoryLabel,
  getSpellLevelGroup,
  getSpellLevelSortValue,
} from "@/lib/spellLevels";
import { PageRoute } from "@/pages/PageRoute";
import type { Spell } from "@/types/Spell";


export function WizardKnownSpellsPage() {
  const { characterId } = useParams();
  const { character, isLoading } = useCharacterById(characterId);
  const allWizardSpells = useAtomValue(wizardSpellsAtom);
  const navigate = useNavigate();

  const [addSpellOpen, setAddSpellOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const wizardProgression = character?.class.wizard;

  const knownSpellIds = useMemo(() => {
    if (!wizardProgression) return new Set<string>();
    if (wizardProgression.knownSpellsById) {
      return new Set(Object.keys(wizardProgression.knownSpellsById));
    }
    const fallback = new Set<string>();
    Object.values(wizardProgression.spellbooksById ?? {}).forEach((book) => {
      Object.keys(book.spellsById ?? {}).forEach((spellId) => {
        fallback.add(String(spellId));
      });
    });
    return fallback;
  }, [wizardProgression?.knownSpellsById, wizardProgression?.spellbooksById]);

  const knownSpellsByLevel = useMemo(() => {
    const grouped: Record<
      string,
      { label: string; sortValue: number; spells: Spell[] }
    > = {};
    knownSpellIds.forEach((id) => {
      const spellId = Number(id);
      if (!Number.isFinite(spellId)) return;
      const spell = findWizardSpellById(spellId);
      if (!spell) return;
      const group = getSpellLevelGroup(spell);
      const entry = grouped[group.key] ?? {
        label: group.label,
        sortValue: group.sortValue,
        spells: [],
      };
      entry.spells.push(spell);
      grouped[group.key] = entry;
    });

    Object.values(grouped).forEach((group) =>
      group.spells.sort((a, b) => a.name.localeCompare(b.name)),
    );

    return Object.values(grouped).sort((a, b) => {
      if (a.sortValue !== b.sortValue) return a.sortValue - b.sortValue;
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });
  }, [knownSpellIds]);

  const sortedWizardSpells = useMemo(
    () =>
      [...allWizardSpells].sort((a, b) =>
        getSpellLevelSortValue(a.level) !== getSpellLevelSortValue(b.level)
          ? getSpellLevelSortValue(a.level) - getSpellLevelSortValue(b.level)
          : a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [allWizardSpells],
  );

  if (isLoading) return <div>Loading known spells...</div>;
  if (!character) return <div>No character with id {characterId}</div>;

  if (!wizardProgression) {
    return <div>This character has no wizard progression.</div>;
  }

  const hasKnownSpells = knownSpellIds.size > 0;

  const handleAddSpell = async (spell: Spell | undefined) => {
    if (!spell) return;
    setAddError(null);
    try {
      await addWizardKnownSpell(character.id, spell.id);
      setAddSpellOpen(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add spell");
    }
  };

  const handleRemoveSpell = async (spell: Spell) => {
    setRemoveError(null);
    try {
      await removeWizardKnownSpell(character.id, spell.id);
    } catch (err) {
      setRemoveError(
        err instanceof Error ? err.message : "Failed to remove spell",
      );
    }
  };

  const handleOpenChange = (open: boolean) => {
    setAddSpellOpen(open);
    if (!open) {
      setAddError(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div>
            <div>
              <h1 className="text-3xl font-bold">Known Spells</h1>
              <p className="text-muted-foreground text-xs">
                Known spells are those you have successfully learned. A spell
                can exist in a spellbook without being learned (and vice versa).
                Any spell added to a spellbook is automatically added here, but
                you can remove it from known spells if needed.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="pt-3 gap-0">
        <div className="flex flex-wrap items-center justify-end px-3">
          <Popover open={addSpellOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 rounded-r-none"
                aria-label="Add Known Spell"
              >
                <Plus className="h-4 w-4" />
                Add Spell
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-80" align="start" sideOffset={8}>
              <SelectWithSearch<Spell>
                title="Add Known Spell"
                items={sortedWizardSpells}
                getKey={(spell) => String(spell.id)}
                getLabel={(spell) =>
                  knownSpellIds.has(String(spell.id))
                    ? `${spell.name} (known)`
                    : spell.name
                }
                isItemDisabled={(spell) => knownSpellIds.has(String(spell.id))}
                value={undefined}
                onChange={handleAddSpell}
                placeholder="Search spells..."
                emptyText="No spells found."
                getCategory={(spell) => getSpellLevelCategoryLabel(spell)}
                categoryLabel={(cat) => cat}
                open={addSpellOpen}
                onOpenChange={handleOpenChange}
                contentOnly={true}
              />
            </PopoverContent>
          </Popover>
          <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                aria-label="Known spells options"
                className="rounded-l-none border-l-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <div className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent dark:hover:bg-accent/50 font-medium">
                <span>Delete Mode</span>
                <Switch checked={deleteMode} onCheckedChange={setDeleteMode} />
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <CardContent className="space-y-4">
          {addError && <p className="text-sm text-destructive">{addError}</p>}
          {removeError && (
            <p className="text-sm text-destructive">{removeError}</p>
          )}

          {!hasKnownSpells && (
            <div className="rounded-md border border-dashed bg-muted/40 p-3 text-sm mt-4">
              <p className="font-semibold text-foreground">
                No known spells yet.
              </p>
              <p className="text-muted-foreground">
                Add spells using the button above.
              </p>
            </div>
          )}

          {hasKnownSpells && (
            <div className="space-y-6">
              {knownSpellsByLevel.map((group) => {
                const spells = group.spells;
                if (spells.length === 0) return null;
                return (
                  <div key={group.label} className="space-y-2">
                    <div className="font-semibold text-2xl">{group.label}</div>
                    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
                      {spells.map((spell) => (
                        <div
                          key={spell.id}
                          className="mb-2 break-inside-avoid text-sm"
                        >
                          <div className="flex items-center gap-1">
                            {deleteMode && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                aria-label={`Remove ${spell.name} from known spells`}
                                onClick={() => handleRemoveSpell(spell)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="link"
                              className="h-auto p-0 text-left"
                              onClick={() =>
                                navigate(PageRoute.SPELL_VIEW(spell.id), {
                                  state: {
                                    showBack: true,
                                  },
                                })
                              }
                            >
                              {spell.name}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SelectWithSearch } from "@/components/custom/SelectWithSearch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Plus, Star, Trash2 } from "lucide-react";
import { useCharacterById } from "@/hooks/useCharacterById";
import { WizardSpellbook } from "@/types/WizardClassProgression";
import { findWizardSpellById } from "@/lib/spellLookup";
import {
  getSpellLevelCategoryLabel,
  getSpellLevelGroup,
  getSpellLevelSortValue,
} from "@/lib/spellLevels";
import type { Spell } from "@/types/Spell";
import {
  addSpellToWizardSpellbook,
  deleteWizardSpellbook,
  removeSpellFromWizardSpellbook,
  updateWizardSpellbook,
} from "@/firebase/characters";
import { useAtomValue } from "jotai";
import {
  favoriteSpellIdsAtom,
  userAtom,
  wizardSpellsAtom,
} from "@/globalState";
import { cn } from "@/lib/utils";
import { PageRoute } from "./PageRoute";

/**
 * Wizard spellbooks management page.
 *
 * Allows creating spellbooks and adding/removing spells within them.
 */
export function WizardSpellbooksPage() {
  const { characterId } = useParams();
  const { character, isLoading } = useCharacterById(characterId);

  const spellbooks = useMemo(() => {
    const list = character?.class.wizard?.spellbooksById
      ? Object.values(character.class.wizard.spellbooksById)
      : [];
    return [...list].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [character?.class.wizard?.spellbooksById]);

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

  if (isLoading) return <div>Loading spellbooks...</div>;
  if (!character) return <div>No character with id {characterId}</div>;

  if (!wizardProgression) {
    return <div>This character has no wizard progression.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Spellbooks</h1>
            <Button asChild size="icon" variant="outline">
              <Link
                to={PageRoute.WIZARD_SPELLBOOKS_NEW(character.id)}
                aria-label="Add spellbook"
              >
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Manage wizard spellbooks.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {spellbooks.map((spellbook) => (
          <SpellbookCard
            key={spellbook.id}
            characterId={character.id}
            spellbook={spellbook}
            knownSpellIds={knownSpellIds}
          />
        ))}

        {spellbooks.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No spellbooks</CardTitle>
              <CardDescription>
                Add your first spellbook to begin.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}

function SpellbookCard({
  characterId,
  spellbook,
  knownSpellIds,
}: {
  characterId: string;
  spellbook: WizardSpellbook;
  knownSpellIds: Set<string>;
}) {
  const navigate = useNavigate();
  const user = useAtomValue(userAtom);
  const favoriteSpellIds = useAtomValue(favoriteSpellIdsAtom);
  const spellsByLevel = useMemo(() => {
    const grouped: Record<
      string,
      { label: string; sortValue: number; spells: Spell[] }
    > = {};
    const spellsById = spellbook.spellsById ?? {};
    Object.keys(spellsById).forEach((idKey) => {
      const spellId = Number(idKey);
      const spell = Number.isNaN(spellId) ? null : findWizardSpellById(spellId);
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
    return Object.values(grouped).sort((a, b) => {
      if (a.sortValue !== b.sortValue) return a.sortValue - b.sortValue;
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });
  }, [spellbook.spellsById]);

  const spellIdsInBook = useMemo(() => {
    const ids = spellbook.spellsById ?? {};
    return new Set(
      Object.keys(ids)
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n)),
    );
  }, [spellbook.spellsById]);

  const pageUsage = useMemo(() => {
    let used = 0;
    const spellsById = spellbook.spellsById ?? {};
    Object.keys(spellsById).forEach((idKey) => {
      const spellId = Number(idKey);
      const spell = Number.isNaN(spellId) ? null : findWizardSpellById(spellId);
      if (spell) {
        used += spell.level === -1 ? 0 : spell.level;
      }
    });
    return {
      used,
      total: spellbook.numberOfPages,
      isOver: used > spellbook.numberOfPages,
    };
  }, [spellbook.spellsById, spellbook.numberOfPages]);

  const [addError, setAddError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addSpellOpen, setAddSpellOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [deleteSpellbookOpen, setDeleteSpellbookOpen] = useState(false);
  const [deleteSpellbookError, setDeleteSpellbookError] = useState<
    string | null
  >(null);
  const [deleteSpellbookSaving, setDeleteSpellbookSaving] = useState(false);
  const allWizardSpells = useAtomValue(wizardSpellsAtom);

  const handleOpenChange = (open: boolean) => {
    setAddSpellOpen(open);
    if (!open) {
      setAddError(null);
    }
  };

  const handleDeleteSpellbookOpenChange = (open: boolean) => {
    setDeleteSpellbookOpen(open);
    if (open) {
      setDeleteSpellbookError(null);
    }
  };

  const selectableSpells = useMemo(() => {
    return [...allWizardSpells].sort((a, b) => {
      const levelCmp =
        getSpellLevelSortValue(a.level) - getSpellLevelSortValue(b.level);
      if (levelCmp !== 0) return levelCmp;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }, [allWizardSpells]);

  const favoriteSet = useMemo(
    () => new Set(favoriteSpellIds.map((id) => String(id))),
    [favoriteSpellIds],
  );

  const filteredSelectableSpells = useMemo(() => {
    if (!favoritesOnly) return selectableSpells;
    return selectableSpells.filter((spell) =>
      favoriteSet.has(String(spell.id)),
    );
  }, [favoriteSet, favoritesOnly, selectableSpells]);

  useEffect(() => {
    if (!user && favoritesOnly) {
      setFavoritesOnly(false);
    }
  }, [favoritesOnly, user]);

  const handleSelectSpell = async (spell: Spell | undefined) => {
    if (!spell) return;
    setAddError(null);
    try {
      await addSpellToWizardSpellbook(characterId, spellbook.id, spell.id);
      setAddSpellOpen(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add spell");
    }
  };

  const handleDeleteSpell = async (spell: Spell) => {
    setDeleteError(null);
    try {
      await removeSpellFromWizardSpellbook(characterId, spellbook.id, spell.id);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete spell",
      );
    }
  };

  const handleDeleteSpellbook = async () => {
    setDeleteSpellbookError(null);
    setDeleteSpellbookSaving(true);
    try {
      await deleteWizardSpellbook(characterId, spellbook.id);
      setDeleteSpellbookOpen(false);
    } catch (err) {
      setDeleteSpellbookError(
        err instanceof Error ? err.message : "Failed to delete spellbook",
      );
    } finally {
      setDeleteSpellbookSaving(false);
    }
  };

  const handleEnabledChange = async (enabled: boolean) => {
    setToggleError(null);
    try {
      await updateWizardSpellbook(characterId, spellbook.id, {
        disabled: !enabled,
      });
    } catch (err) {
      setToggleError(
        err instanceof Error
          ? err.message
          : "Failed to update spellbook status",
      );
    }
  };

  const isDisabled = spellbook.disabled ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between gap-4">
          <div>
            <CardTitle>
              <span className={isDisabled ? "text-muted-foreground" : ""}>
                {spellbook.name}
                {isDisabled ? " (disabled)" : ""}
              </span>
            </CardTitle>
            <CardDescription className="flex items-center">
              <span
                className={pageUsage.isOver ? "text-destructive font-bold" : ""}
              >
                {pageUsage.used} / {pageUsage.total} pages
              </span>
            </CardDescription>
          </div>
          {/* Add spell */}
          <div>
            <div className="flex items-center gap-0">
              <SelectWithSearch<Spell>
                title="Add spell to Spellbook"
                items={filteredSelectableSpells}
                getKey={(spell) => String(spell.id)}
                getLabel={(spell) =>
                  spellIdsInBook.has(spell.id)
                    ? `${spell.name} (in book)`
                    : spell.name
                }
                renderItem={(spell) => (
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      {spellIdsInBook.has(spell.id)
                        ? `${spell.name} (in book)`
                        : spell.name}
                    </span>
                    {favoriteSet.has(String(spell.id)) && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                )}
                isItemDisabled={(spell) => spellIdsInBook.has(spell.id)}
                value={undefined}
                onChange={handleSelectSpell}
                placeholder="Search spells..."
                emptyText="No spells found."
                getCategory={(spell) => getSpellLevelCategoryLabel(spell)}
                categoryLabel={(cat) => cat}
                open={addSpellOpen}
                onOpenChange={handleOpenChange}
                autoFocus={false}
                popoverAlign="end"
                renderTrigger={() => (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 rounded-r-none"
                    aria-label="Add spell to spellbook"
                  >
                    <Plus className="h-4 w-4" />
                    Add Spell
                  </Button>
                )}
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
                        favoritesOnly
                          ? "Showing favorites"
                          : "Filter to favorites"
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
              />
              <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label="Spellbook options"
                    className="rounded-l-none border-l-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-2">
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full justify-between px-2 text-sm"
                  >
                    <Link
                      to={PageRoute.WIZARD_SPELLBOOKS_EDIT(
                        characterId,
                        spellbook.id,
                      )}
                      onClick={() => setOptionsOpen(false)}
                    >
                      Edit Name &amp; Pages
                    </Link>
                  </Button>
                  <div className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent dark:hover:bg-accent/50 font-medium">
                    <span>Enabled</span>
                    <Switch
                      checked={!isDisabled}
                      onCheckedChange={handleEnabledChange}
                    />
                  </div>
                  <div className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent dark:hover:bg-accent/50 font-medium">
                    <span>Delete Mode</span>
                    <Switch
                      checked={deleteMode}
                      onCheckedChange={setDeleteMode}
                    />
                  </div>
                  <div className="my-1 h-px bg-border" />
                  <Button
                    variant="ghost"
                    className="w-full justify-between px-2 text-sm text-destructive hover:text-destructive"
                    onClick={() => {
                      setOptionsOpen(false);
                      setDeleteSpellbookOpen(true);
                    }}
                  >
                    Delete Spellbook
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
            <AlertDialog
              open={deleteSpellbookOpen}
              onOpenChange={handleDeleteSpellbookOpenChange}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete spellbook?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes spellbook "{spellbook.name}" and all spells
                    inside it. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {deleteSpellbookError && (
                  <p className="text-sm text-destructive">
                    {deleteSpellbookError}
                  </p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteSpellbook}
                    disabled={deleteSpellbookSaving}
                  >
                    {deleteSpellbookSaving ? "Deleting..." : "Delete Spellbook"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {addError && (
              <p className="text-sm text-destructive mt-2">{addError}</p>
            )}
            {deleteError && (
              <p className="text-sm text-destructive mt-2">{deleteError}</p>
            )}
            {toggleError && (
              <p className="text-sm text-destructive mt-2">{toggleError}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Spells grouped by level */}
        <div className="space-y-6">
          {spellsByLevel.map((group) => {
            const spells = group.spells
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name));
            if (spells.length === 0) return null;
            return (
              <div key={group.label} className="space-y-2">
                <div className="font-semibold text-2xl">{group.label}</div>
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
                  {spells.map((spell) => {
                    const isKnown = knownSpellIds.has(String(spell.id));
                    return (
                      <div
                        key={spell.id}
                        className={cn(
                          "mb-2 break-inside-avoid text-sm",
                          !isKnown && "text-muted-foreground",
                        )}
                      >
                        <div className="flex items-center gap-1">
                          {deleteMode && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              aria-label={`Delete ${spell.name} from spellbook`}
                              onClick={() => handleDeleteSpell(spell)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="link"
                            className={cn(
                              "h-auto p-0 text-left",
                              !isKnown &&
                                "!text-muted-foreground hover:!text-muted-foreground dark:!text-muted-foreground dark:hover:!text-muted-foreground",
                            )}
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
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

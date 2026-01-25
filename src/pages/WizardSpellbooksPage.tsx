import { ChangeEvent, FormEvent, useMemo, useState, useId } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SelectWithSearch } from "@/components/custom/SelectWithSearch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus } from "lucide-react";
import { useCharacterById } from "@/hooks/useCharacterById";
import { WizardSpellbook } from "@/types/WizardClassProgression";
import { findWizardSpellById, openSpellViewer } from "@/lib/spellLookup";
import type { Spell } from "@/types/Spell";
import {
  addSpellToWizardSpellbook,
  addWizardSpellbook,
} from "@/firebase/characters";
import { useAtomValue } from "jotai";
import { wizardSpellsAtom } from "@/globalState";

const SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Wizard spellbooks management page.
 *
 * Allows creating spellbooks and adding/removing spells within them.
 */
export function WizardSpellbooksPage() {
  const { characterId } = useParams();
  const { character, isLoading } = useCharacterById(characterId);
  const [createOpen, setCreateOpen] = useState(false);

  const spellbooks = useMemo(() => {
    const list = character?.class.wizard?.spellbooksById
      ? Object.values(character.class.wizard.spellbooksById)
      : [];
    return [...list].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [character?.class.wizard?.spellbooksById]);

  if (isLoading) return <div>Loading spellbooks...</div>;
  if (!character) return <div>No character with id {characterId}</div>;

  const wizardProgression = character.class.wizard;

  if (!wizardProgression) {
    return <div>This character has no wizard progression.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Spellbooks</h1>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Add spellbook"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Spellbook</DialogTitle>
                  <DialogDescription>
                    Create a new spellbook for {character.name}.
                  </DialogDescription>
                </DialogHeader>
                <AddSpellbookForm
                  characterId={character.id}
                  onSuccess={() => setCreateOpen(false)}
                />
              </DialogContent>
            </Dialog>
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
}: {
  characterId: string;
  spellbook: WizardSpellbook;
}) {
  const spellsByLevel = useMemo(() => {
    const grouped: Record<number, Spell[]> = {};
    const spellsById = spellbook.spellsById ?? {};
    Object.keys(spellsById).forEach((idKey) => {
      const spellId = Number(idKey);
      const spell = Number.isNaN(spellId) ? null : findWizardSpellById(spellId);
      if (!spell) return;
      grouped[spell.level] = grouped[spell.level] || [];
      grouped[spell.level].push(spell);
    });
    return grouped;
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
        used += spell.level;
      }
    });
    return {
      used,
      total: spellbook.numberOfPages,
      isOver: used > spellbook.numberOfPages,
    };
  }, [spellbook.spellsById, spellbook.numberOfPages]);

  const [addError, setAddError] = useState<string | null>(null);
  const [addSpellOpen, setAddSpellOpen] = useState(false);
  const allWizardSpells = useAtomValue(wizardSpellsAtom);

  const handleOpenChange = (open: boolean) => {
    setAddSpellOpen(open);
    if (!open) {
      setAddError(null);
    }
  };

  // Filter out spells already in the spellbook and sort
  const availableSpells = useMemo(() => {
    return allWizardSpells
      .filter((spell) => !spellIdsInBook.has(spell.id))
      .sort((a, b) => {
        // Sort by level first, then by name
        if (a.level !== b.level) {
          return a.level - b.level;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
  }, [allWizardSpells, spellIdsInBook]);

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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between gap-4">
          <div>
            <CardTitle>{spellbook.name}</CardTitle>
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
            <Popover open={addSpellOpen} onOpenChange={handleOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  aria-label="Add spell to spellbook"
                >
                  <Plus className="h-4 w-4" />
                  Add Spell
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-80" align="start" sideOffset={8}>
                <SelectWithSearch<Spell>
                  title="Add spell to Spellbook"
                  items={availableSpells}
                  getKey={(spell) => String(spell.id)}
                  getLabel={(spell) => spell.name}
                  isItemDisabled={(spell) => spellIdsInBook.has(spell.id)}
                  value={undefined}
                  onChange={handleSelectSpell}
                  placeholder="Search spells..."
                  emptyText="No spells found."
                  getCategory={(spell) => `Level ${spell.level}`}
                  categoryLabel={(cat) => cat}
                  open={addSpellOpen}
                  onOpenChange={setAddSpellOpen}
                  contentOnly={true}
                />
              </PopoverContent>
            </Popover>
            {addError && (
              <p className="text-sm text-destructive mt-2">{addError}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Spells grouped by level */}
        <div className="space-y-6">
          {SPELL_LEVELS.map((lvl) => {
            const spells = (spellsByLevel[lvl] || [])
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name));
            if (spells.length === 0) return null;
            return (
              <div key={lvl} className="space-y-2">
                <div className="font-semibold text-2xl">Level {lvl}</div>
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
                  {spells.map((spell) => (
                    <div
                      key={spell.id}
                      className="mb-2 break-inside-avoid text-sm"
                    >
                      <Button
                        variant="link"
                        className="h-auto p-0 text-left"
                        onClick={() => openSpellViewer(spell)}
                      >
                        {spell.name}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function AddSpellbookForm({
  characterId,
  onSuccess,
}: {
  characterId: string;
  onSuccess?: () => void;
}) {
  const nameId = useId();
  const pagesId = useId();
  const [name, setName] = useState("");
  const [pages, setPages] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const trimmedName = name.trim();
      const numberOfPages = Number(pages);

      if (!trimmedName) {
        throw new Error("Name is required");
      }

      if (!Number.isFinite(numberOfPages) || numberOfPages <= 0) {
        throw new Error("Number of pages must be greater than 0");
      }

      await addWizardSpellbook(characterId, {
        name: trimmedName,
        numberOfPages,
      });

      setName("");
      setPages("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add spellbook");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor={nameId}>
          Name
        </label>
        <input
          id={nameId}
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setName(e.target.value)
          }
          placeholder="E.g., Grimorium Arcana"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor={pagesId}>
          Pages
        </label>
        <input
          id={pagesId}
          type="number"
          min={1}
          value={pages}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setPages(e.target.value)
          }
          placeholder="50"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Saving..." : "Create Spellbook"}
      </Button>
    </form>
  );
}

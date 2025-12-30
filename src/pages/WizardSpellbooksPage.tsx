import { ChangeEvent, FormEvent, useMemo, useState, useId } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCharacterById } from "@/hooks/useCharacterById";
import { PageRoute } from "@/pages/PageRoute";
import {
  WizardClassProgression,
  WizardSpellbook,
} from "@/types/WizardClassProgression";
import { findWizardSpellByName, getWizardSpellsByLevel } from "@/lib/spellLookup";
import type { Spell } from "@/types/Spell";
import { Info } from "lucide-react";
import {
  addSpellToWizardSpellbook,
  addWizardSpellbook,
} from "@/firebase/characters";

export function WizardSpellbooksPage() {
  const { characterId } = useParams();
  const { character, isLoading } = useCharacterById(characterId);
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);

  if (isLoading) return <div>Loading spellbooks...</div>;
  if (!character) return <div>No character with id {characterId}</div>;

  const wizardProgression = character.class.wizard as
    | WizardClassProgression
    | undefined;

  if (!wizardProgression) {
    return <div>This character has no wizard progression.</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wizard Spellbooks</h1>
          <p className="text-muted-foreground">
            Manage spellbooks for {character.name}
          </p>
        </div>
        <Link
          to={PageRoute.WIZARD(character.id)}
          className="text-sm text-primary underline"
        >
          Back to Wizard
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.values(wizardProgression.spellbooksById).map((spellbook) => (
          <SpellbookCard
            key={spellbook.id}
            characterId={character.id}
            spellbook={spellbook}
            onViewSpell={setSelectedSpell}
          />
        ))}

        {Object.keys(wizardProgression.spellbooksById).length === 0 && (
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

      <AddSpellbookForm characterId={character.id} />

      <Dialog
        open={!!selectedSpell}
        onOpenChange={(open) => !open && setSelectedSpell(null)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSpell?.name}</DialogTitle>
            <DialogDescription>
              Level {selectedSpell?.level} Spell
            </DialogDescription>
          </DialogHeader>
          {selectedSpell && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Link: {selectedSpell.link}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SpellbookCard({
  characterId,
  spellbook,
  onViewSpell,
}: {
  characterId: string;
  spellbook: WizardSpellbook;
  onViewSpell: (spell: Spell) => void;
}) {
  const spellsByLevel = useMemo(() => {
    const grouped: Record<number, Spell[]> = {};
    Object.keys(spellbook.spellsByName).forEach((name) => {
      const spell = findWizardSpellByName(name);
      if (spell) {
        grouped[spell.level] = grouped[spell.level] || [];
        grouped[spell.level].push(spell);
      }
    });
    return grouped;
  }, [spellbook.spellsByName]);

  const [selectedLevel, setSelectedLevel] = useState<number | undefined>(1);
  const [spellPopoverOpen, setSpellPopoverOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const availableSpells = selectedLevel
    ? getWizardSpellsByLevel(selectedLevel)
    : [];

  const handleSelectSpell = async (spellName: string) => {
    const spell = availableSpells.find((s) => s.name === spellName);
    if (!spell) return;
    setAdding(true);
    setAddError(null);
    try {
      await addSpellToWizardSpellbook(
        characterId,
        spellbook.id,
        spell.name,
      );
      setSpellPopoverOpen(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add spell");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card className="space-y-4">
      <CardHeader>
        <CardTitle>{spellbook.name}</CardTitle>
        <CardDescription>{spellbook.numberOfPages} pages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add spell */}
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <Select
              onValueChange={(val) => setSelectedLevel(Number(val))}
              defaultValue={String(selectedLevel)}
            >
              <SelectTrigger className="w-24 h-8 cursor-pointer">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                  <SelectItem
                    key={lvl}
                    value={String(lvl)}
                    className="cursor-pointer"
                  >
                    Level {lvl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover open={spellPopoverOpen} onOpenChange={setSpellPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 cursor-pointer disabled:cursor-not-allowed"
                  disabled={adding}
                >
                  {adding ? "Adding..." : "Add spell"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-72">
                <Command>
                  <CommandInput
                    placeholder="Search spells..."
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>No spells found.</CommandEmpty>
                    <CommandGroup heading={`Level ${selectedLevel ?? ""}`}>
                      {availableSpells.map((spell) => (
                        <CommandItem
                          key={spell.name}
                          value={spell.name}
                          className="cursor-pointer"
                          onSelect={() => handleSelectSpell(spell.name)}
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
          {addError && <p className="text-sm text-destructive">{addError}</p>}
        </div>

        {/* Spells grouped by level */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
            const spells = (spellsByLevel[lvl] || [])
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name));
            if (spells.length === 0) return null;
            return (
              <div key={lvl} className="space-y-2">
                <div className="font-semibold">Level {lvl}</div>
                <div className="space-y-1">
                  {spells.map((spell) => (
                    <div
                      key={spell.name}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span>{spell.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 cursor-pointer"
                        onClick={() => onViewSpell(spell)}
                        title="View spell details"
                      >
                        <Info className="h-4 w-4" />
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

function AddSpellbookForm({ characterId }: { characterId: string }) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add spellbook");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Spellbook</CardTitle>
        <CardDescription>Create a new spellbook.</CardDescription>
      </CardHeader>
      <CardContent>
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

          <Button
            type="submit"
            disabled={saving}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Create Spellbook"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

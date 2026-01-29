import { useId, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { addWizardSpellbook } from "@/firebase/characters";
import { useCharacterById } from "@/hooks/useCharacterById";
import { PageRoute } from "./PageRoute";

export function CreateSpellbookPage() {
  const { characterId } = useParams();
  const { character, isLoading } = useCharacterById(characterId);
  const navigate = useNavigate();
  const nameId = useId();
  const pagesId = useId();
  const [name, setName] = useState("");
  const [pages, setPages] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <div>Loading spellbooks...</div>;
  if (!character) return <div>No character with id {characterId}</div>;

  const wizardProgression = character.class.wizard;
  if (!wizardProgression) {
    return <div>This character has no wizard progression.</div>;
  }

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

      await addWizardSpellbook(character.id, {
        name: trimmedName,
        numberOfPages,
        disabled: false,
      });

      navigate(PageRoute.WIZARD_SPELLBOOKS(character.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add spellbook");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Create Spellbook</h1>
          <p className="text-muted-foreground text-sm">
            Create a new spellbook for {character.name}.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor={nameId}>
                Name
              </label>
              <input
                id={nameId}
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                onChange={(e) => setPages(e.target.value)}
                placeholder="50"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create Spellbook"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

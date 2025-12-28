import { useId, useMemo, useState } from "react";
import { useCharacterById } from "@/hooks/useCharacterById";
import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CharacterClass,
  SpellSlotModifier,
  WizardClassProgression,
} from "@/types/ClassProgression";
import { getSlotsForCaster } from "@/lib/spellSlots";
import { updateWizardProgression } from "@/firebase/characters";

export function WizardEditPage() {
  const { characterId } = useParams();
  const { character, isLoading } = useCharacterById(characterId);

  if (isLoading) {
    return <div>Loading character...</div>;
  }

  if (!character) {
    return <div>No Character with id {characterId}</div>;
  }

  const wizard = character.classes.find(
    (c) => c.className === CharacterClass.WIZARD,
  ) as WizardClassProgression | undefined;

  if (!wizard) {
    return <div>This character has no wizard progression.</div>;
  }

  return (
    <WizardEditor
      characterId={character.id}
      wizard={wizard}
      characterName={character.name}
    />
  );
}

function WizardEditor({
  characterId,
  wizard,
  characterName,
}: {
  characterId: string;
  wizard: WizardClassProgression;
  characterName: string;
}) {
  const [level, setLevel] = useState<number>(wizard.level);
  const [modifiers, setModifiers] = useState<SpellSlotModifier[]>(
    wizard.spellSlotModifiers ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const levelInputId = useId();

  const baseSlots = useMemo(
    () => getSlotsForCaster(CharacterClass.WIZARD, level, []),
    [level],
  );

  const totalSlots = useMemo(
    () => getSlotsForCaster(CharacterClass.WIZARD, level, modifiers),
    [level, modifiers],
  );

  const handleAddModifier = () => {
    // Prefer first unused level, otherwise fall back to "all" if free.
    const usedLevels = modifiers.map((m) => m.spellLevel);
    const nextLevel = [1, 2, 3, 4, 5, 6, 7, 8, 9].find(
      (lvl) => !usedLevels.includes(lvl),
    );
    const spellLevel = nextLevel ?? (usedLevels.includes("all") ? 1 : "all");

    setModifiers((prev) => [
      ...prev,
      { spellLevel, addBase: false, bonus: 0, requiresSpellLevelAccess: true },
    ]);
  };

  const handleModifierChange = (
    idx: number,
    updated: Partial<SpellSlotModifier>,
  ) => {
    setModifiers((prev) =>
      prev.map((mod, i) => (i === idx ? { ...mod, ...updated } : mod)),
    );
  };

  const handleRemoveModifier = (idx: number) => {
    setModifiers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateWizardProgression(characterId, {
        level,
        spellSlotModifiers: modifiers,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save wizard settings",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit Wizard</h1>
          <p className="text-muted-foreground">{characterName}</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Level</CardTitle>
          <CardDescription>
            Set the wizard level to update spell slots.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium" htmlFor={levelInputId}>
              Wizard Level
            </label>

            <select
              id={levelInputId}
              className="w-16 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
            >
              {Array.from({ length: 20 }, (_, idx) => idx + 1).map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spell Slots & Modifiers</CardTitle>
          <CardDescription>
            Base table preview plus custom modifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SpellSlotsPreview baseSlots={baseSlots} totalSlots={totalSlots} />
          <div className="h-px bg-border" />
          <SpellSlotModifiersEditor
            modifiers={modifiers}
            onAddModifier={handleAddModifier}
            onChangeModifier={handleModifierChange}
            onRemoveModifier={handleRemoveModifier}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SpellSlotsPreview({
  baseSlots,
  totalSlots,
}: {
  baseSlots: Record<number, number>;
  totalSlots: Record<number, number>;
}) {
  const renderSlotsRow = (label: string, slots: Record<number, number>) => (
    <tr>
      <td className="px-2 py-1 text-sm font-semibold">{label}</td>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
        <td key={lvl} className="px-2 py-1 text-center text-sm">
          {slots[lvl] || "-"}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className="px-2 py-1 text-sm font-semibold">Spell Level</th>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
              <th key={lvl} className="px-2 py-1 text-sm text-center">
                {lvl}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {renderSlotsRow("Base", baseSlots)}
          {renderSlotsRow("With modifiers", totalSlots)}
        </tbody>
      </table>
    </div>
  );
}

function SpellSlotModifiersEditor({
  modifiers,
  onAddModifier,
  onChangeModifier,
  onRemoveModifier,
}: {
  modifiers: SpellSlotModifier[];
  onAddModifier: () => void;
  onChangeModifier: (idx: number, updated: Partial<SpellSlotModifier>) => void;
  onRemoveModifier: (idx: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">Spell Level</th>
              <th
                className="px-2 py-1 text-left"
                title="Adds the base slot count again (useful for multiplying base slots)."
              >
                Add Base
              </th>
              <th
                className="px-2 py-1 text-left"
                title="Adds a flat bonus (can be negative)."
              >
                Bonus
              </th>
              <th
                className="px-2 py-1 text-left"
                title="When on, only applies if the caster can already cast that spell level."
              >
                Requires Access
              </th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {modifiers.map((mod, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="px-2 py-1">
                  <select
                    value={mod.spellLevel}
                    onChange={(e) =>
                      onChangeModifier(idx, {
                        spellLevel:
                          e.target.value === "all"
                            ? "all"
                            : Number(e.target.value),
                      })
                    }
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                  >
                    <option value="all">All</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Level {lvl}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1 text-left">
                  <input
                    type="checkbox"
                    checked={mod.addBase}
                    onChange={(e) =>
                      onChangeModifier(idx, {
                        addBase: e.target.checked,
                      })
                    }
                  />
                </td>
                <td className="px-2 py-1 text-left">
                  <input
                    type="number"
                    value={mod.bonus}
                    onChange={(e) =>
                      onChangeModifier(idx, {
                        bonus: Number(e.target.value),
                      })
                    }
                    className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-2 py-1 text-left">
                  <input
                    type="checkbox"
                    checked={mod.requiresSpellLevelAccess !== false}
                    onChange={(e) =>
                      onChangeModifier(idx, {
                        requiresSpellLevelAccess: e.target.checked,
                      })
                    }
                  />
                </td>
                <td className="px-2 py-1 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveModifier(idx)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button variant="outline" size="sm" onClick={onAddModifier}>
        Add Modifier
      </Button>
    </div>
  );
}

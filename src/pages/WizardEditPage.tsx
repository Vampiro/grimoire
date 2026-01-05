import { useId, useMemo, useRef, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpellSlotModifier } from "@/types/ClassProgression";
import { WizardClassProgression } from "@/types/WizardClassProgression";
import { getWizardSpellSlots } from "@/lib/spellSlots";
import { updateWizardProgression } from "@/firebase/characters";

/**
 * Page wrapper for editing a wizard's progression and spell slots.
 * @returns Rendered wizard edit page content.
 */
export function WizardEditPage() {
  const { characterId } = useParams();
  const { character, isLoading } = useCharacterById(characterId);

  if (isLoading) {
    return <div>Loading character...</div>;
  }

  if (!character) {
    return <div>No Character with id {characterId}</div>;
  }

  const wizard = character.class.wizard;

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

/**
 * Form controller for editing wizard level and spell slot modifiers.
 * @param characterId Character document id.
 * @param wizard Wizard progression record to edit.
 * @param characterName Display name of the character.
 * @returns Wizard editor layout.
 */
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
  const saveRequestIdRef = useRef(0);

  const baseSlots = useMemo(() => getWizardSpellSlots(level, []), [level]);

  const totalSlots = useMemo(
    () => getWizardSpellSlots(level, modifiers),
    [level, modifiers],
  );

  const saveWizard = (changes: {
    level?: number;
    spellSlotModifiers?: SpellSlotModifier[];
  }) => {
    const requestId = ++saveRequestIdRef.current;
    setSaving(true);
    setError(null);

    updateWizardProgression(characterId, changes)
      .catch((err) => {
        if (requestId !== saveRequestIdRef.current) return;
        setError(
          err instanceof Error ? err.message : "Failed to save wizard settings",
        );
      })
      .finally(() => {
        if (requestId !== saveRequestIdRef.current) return;
        setSaving(false);
      });
  };

  const handleAddModifier = () => {
    // Prefer first unused level, otherwise fall back to "all" if free.
    const usedLevels = modifiers.map((m) => m.spellLevel);
    const nextLevel = [1, 2, 3, 4, 5, 6, 7, 8, 9].find(
      (lvl) => !usedLevels.includes(lvl),
    );
    const spellLevel: SpellSlotModifier["spellLevel"] =
      nextLevel ?? (usedLevels.includes("all") ? 1 : "all");

    const nextModifiers = [
      ...modifiers,
      { spellLevel, addBase: false, bonus: 0, requiresSpellLevelAccess: true },
    ];
    setModifiers(nextModifiers);
    saveWizard({ spellSlotModifiers: nextModifiers });
  };

  const handleModifierChange = (
    idx: number,
    updated: Partial<SpellSlotModifier>,
  ) => {
    const nextModifiers = modifiers.map((mod, i) =>
      i === idx ? { ...mod, ...updated } : mod,
    );
    setModifiers(nextModifiers);
    saveWizard({ spellSlotModifiers: nextModifiers });
  };

  const handleRemoveModifier = (idx: number) => {
    const nextModifiers = modifiers.filter((_, i) => i !== idx);
    setModifiers(nextModifiers);
    saveWizard({ spellSlotModifiers: nextModifiers });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit Wizard</h1>
          <p className="text-muted-foreground">{characterName}</p>
        </div>
        {saving && (
          <div className="text-sm text-muted-foreground">Saving...</div>
        )}
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

            <Select
              value={String(level)}
              onValueChange={(val) => {
                const nextLevel = Number(val);
                setLevel(nextLevel);
                saveWizard({ level: nextLevel });
              }}
            >
              <SelectTrigger id={levelInputId} className="w-16 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-max min-w-max">
                {Array.from({ length: 20 }, (_, idx) => idx + 1).map((lvl) => (
                  <SelectItem key={lvl} value={String(lvl)}>
                    {lvl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

/**
 * Display a comparison of base versus modified spell slots.
 * @param baseSlots Base slot counts by spell level.
 * @param totalSlots Modified slot counts by spell level.
 * @returns Spell slot comparison table.
 */
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

/**
 * Table UI for adding, editing, and removing slot modifiers.
 * @param modifiers Current list of slot modifiers.
 * @param onAddModifier Handler to add a new modifier row.
 * @param onChangeModifier Handler to update a modifier row.
 * @param onRemoveModifier Handler to remove a modifier row.
 * @returns Modifier table UI.
 */
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
                  <Select
                    value={String(mod.spellLevel)}
                    onValueChange={(value) =>
                      onChangeModifier(idx, {
                        spellLevel: value === "all" ? "all" : Number(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-max cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="w-max min-w-max">
                      <SelectItem value="all">All</SelectItem>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                        <SelectItem key={lvl} value={String(lvl)}>
                          Level {lvl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    className="cursor-pointer"
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
                    checked={mod.requiresSpellLevelAccess}
                    onChange={(e) =>
                      onChangeModifier(idx, {
                        requiresSpellLevelAccess: e.target.checked,
                      })
                    }
                    className="cursor-pointer"
                  />
                </td>
                <td className="px-2 py-1 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="cursor-pointer"
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

      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer"
        onClick={onAddModifier}
      >
        Add Modifier
      </Button>
    </div>
  );
}

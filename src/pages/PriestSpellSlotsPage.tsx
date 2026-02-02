import { useMemo, useRef, useState } from "react";
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
import { PriestClassProgression } from "@/types/PriestClassProgression";
import { getPriestSpellSlots } from "@/lib/spellSlots";
import { updatePriestProgression } from "@/firebase/characters";
import { Minus, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Page wrapper for editing a priest's spell slots and modifiers.
 * @returns Rendered priest spell slots page content.
 */
export function PriestSpellSlotsPage() {
  const { characterId } = useParams();
  const { character, isLoading } = useCharacterById(characterId);

  if (isLoading) {
    return <div>Loading character...</div>;
  }

  if (!character) {
    return <div>No Character with id {characterId}</div>;
  }

  const priest = character.class.priest;

  if (!priest) {
    return <div>This character has no priest progression.</div>;
  }

  return <PriestEditor characterId={character.id} priest={priest} />;
}

/**
 * Form controller for editing priest spell slots and modifiers.
 * @param characterId Character document id.
 * @param priest Priest progression record to edit.
 * @returns Priest editor layout.
 */
function PriestEditor({
  characterId,
  priest,
}: {
  characterId: string;
  priest: PriestClassProgression;
}) {
  const saveRequestIdRef = useRef(0);

  const [modifiers, setModifiers] = useState<SpellSlotModifier[]>(
    priest.spellSlotModifiers ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseSlots = useMemo(
    () => getPriestSpellSlots(priest.level, []),
    [priest.level],
  );

  const totalSlots = useMemo(
    () => getPriestSpellSlots(priest.level, modifiers),
    [priest.level, modifiers],
  );

  const savePriest = (changes: {
    spellSlotModifiers?: SpellSlotModifier[];
  }) => {
    const requestId = ++saveRequestIdRef.current;
    setSaving(true);
    setError(null);

    updatePriestProgression(characterId, changes)
      .catch((err) => {
        if (requestId !== saveRequestIdRef.current) return;
        setError(
          err instanceof Error ? err.message : "Failed to save priest settings",
        );
      })
      .finally(() => {
        if (requestId !== saveRequestIdRef.current) return;
        setSaving(false);
      });
  };

  const handleAddModifier = () => {
    const usedLevels = modifiers.map((m) => m.spellLevel);
    const nextLevel = [1, 2, 3, 4, 5, 6, 7].find(
      (lvl) => !usedLevels.includes(lvl),
    );
    const spellLevel: SpellSlotModifier["spellLevel"] =
      nextLevel ?? (usedLevels.includes("all") ? 1 : "all");

    const nextModifiers = [
      ...modifiers,
      { spellLevel, addBase: false, bonus: 0, requiresSpellLevelAccess: true },
    ];
    setModifiers(nextModifiers);
    savePriest({ spellSlotModifiers: nextModifiers });
  };

  const handleModifierChange = (
    idx: number,
    updated: Partial<SpellSlotModifier>,
  ) => {
    const nextModifiers = modifiers.map((mod, i) =>
      i === idx ? { ...mod, ...updated } : mod,
    );
    setModifiers(nextModifiers);
    savePriest({ spellSlotModifiers: nextModifiers });
  };

  const handleRemoveModifier = (idx: number) => {
    const nextModifiers = modifiers.filter((_, i) => i !== idx);
    setModifiers(nextModifiers);
    savePriest({ spellSlotModifiers: nextModifiers });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Priest Spell Slots</h1>
          <p className="text-muted-foreground text-sm">
            See spell slots per level and make any modifications.
          </p>
        </div>
        {saving && (
          <div className="text-sm text-muted-foreground">Saving...</div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

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
      {[1, 2, 3, 4, 5, 6, 7].map((lvl) => (
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
            {[1, 2, 3, 4, 5, 6, 7].map((lvl) => (
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
                    <SelectTrigger className="w-max">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="w-max min-w-max">
                      <SelectItem value="all">All</SelectItem>
                      {[1, 2, 3, 4, 5, 6, 7].map((lvl) => (
                        <SelectItem key={lvl} value={String(lvl)}>
                          Level {lvl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-1 text-left">
                  <Checkbox
                    checked={mod.addBase}
                    onCheckedChange={(checked) =>
                      onChangeModifier(idx, { addBase: checked === true })
                    }
                  />
                </td>
                <td className="px-2 py-1 text-left">
                  <div className="inline-flex items-center">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-r-none"
                      onClick={() =>
                        onChangeModifier(idx, { bonus: mod.bonus - 1 })
                      }
                      title="Decrease bonus"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="h-8 min-w-14 px-2 flex items-center justify-center border-y border-input bg-background text-sm font-semibold">
                      {mod.bonus}
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-l-none"
                      onClick={() =>
                        onChangeModifier(idx, { bonus: mod.bonus + 1 })
                      }
                      title="Increase bonus"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
                <td className="px-2 py-1 text-left">
                  <Checkbox
                    checked={mod.requiresSpellLevelAccess}
                    onCheckedChange={(checked) =>
                      onChangeModifier(idx, {
                        requiresSpellLevelAccess: checked === true,
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

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Plus, Info, Trash2 } from "lucide-react";
import { findSpellById } from "@/lib/spellLookup";
import {
  WizardClassProgression,
  PreparedSpell,
} from "@/types/ClassProgression";
import { getWizardProgressionSpellSlots } from "@/lib/spellSlots";
import { PageRoute } from "@/pages/PageRoute";
import { updateWizardPreparedSpells } from "@/firebase/characters";
import type { Spell } from "@/types/Spell";

interface WizardPreparedSpellsProps {
  spellLevel: number;
  progression: WizardClassProgression;
  characterId: string;
  onViewSpell?: (spell: Spell) => void;
}

/**
 * Renders prepared wizard spells for a given spell level, including slot counts and spellbook selection.
 * Mutations are persisted directly to the wizard progression.
 */
export function WizardPreparedSpells({
  spellLevel,
  progression,
  characterId,
  onViewSpell,
}: WizardPreparedSpellsProps) {
  const spells = progression.preparedSpells[spellLevel] || [];
  const slotMap = getWizardProgressionSpellSlots(progression);
  const maxSlots = slotMap[spellLevel] || 0;
  const castable = spells.filter((s) => !s.used).length;

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLevelSpells = async (
    mutate: (current: PreparedSpell[]) => PreparedSpell[],
  ) => {
    setIsUpdating(true);
    setError(null);
    try {
      const current = progression.preparedSpells[spellLevel] ?? [];
      const nextLevel = mutate(current);
      const nextPrepared = {
        ...progression.preparedSpells,
        [spellLevel]: nextLevel,
      };
      await updateWizardPreparedSpells(characterId, nextPrepared);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update prepared spells",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleSpellUsed = (spellId: string, used: boolean) =>
    updateLevelSpells((current) =>
      current.map((s) => (s.spellId === spellId ? { ...s, used } : s)),
    );

  const handleRemoveSpell = (spellId: string) =>
    updateLevelSpells((current) =>
      current.filter((s) => s.spellId !== spellId),
    );

  const handleAddSpell = (spellId: string) =>
    updateLevelSpells((current) => [...current, { spellId, used: false }]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          Level {spellLevel} ({castable}/{maxSlots})
        </h3>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to={PageRoute.WIZARD_SPELLBOOKS(characterId)}>
              Spellbooks
            </Link>
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" disabled={isUpdating}>
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96">
              <div className="space-y-4">
                <p className="text-sm font-semibold">
                  Add Spell from Spellbook
                </p>
                <div className="space-y-3">
                  {progression.spellbooks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No spellbooks available
                    </p>
                  ) : (
                    progression.spellbooks.map((spellbook) => {
                      // Get all spells of this level from this spellbook
                      const availableSpells = spellbook.spells
                        .map((spellId) => findSpellById(spellId))
                        .filter(
                          (spell): spell is Spell =>
                            spell !== null && spell.level === spellLevel,
                        );

                      if (availableSpells.length === 0) {
                        return (
                          <div key={spellbook.id}>
                            <p className="text-xs text-muted-foreground">
                              {spellbook.name}: No spells at this level
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div key={spellbook.id}>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            {spellbook.name}
                          </p>
                          <Select
                            disabled={isUpdating}
                            onValueChange={(spellName) => {
                              const selectedSpell = availableSpells.find(
                                (s) => s.name === spellName,
                              );
                              if (selectedSpell) {
                                handleAddSpell(
                                  `${selectedSpell.class} - ${selectedSpell.name}`,
                                );
                              }
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select spell..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSpells.map((spell) => (
                                <SelectItem key={spell.name} value={spell.name}>
                                  {spell.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Spells for this level */}
      <div className="space-y-2 pl-4">
        {spells.map((preparedSpell, idx) => {
          const spell = findSpellById(preparedSpell.spellId);
          const spellName = spell?.name || preparedSpell.spellId;

          return (
            <div key={idx} className="flex items-center gap-2">
              <Checkbox
                checked={preparedSpell.used}
                onCheckedChange={(checked) => {
                  handleToggleSpellUsed(
                    preparedSpell.spellId,
                    checked === true,
                  );
                }}
                title="Mark as cast"
                disabled={isUpdating}
              />
              <div className="flex-1 text-sm">{spellName}</div>
              {spell && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => onViewSpell && onViewSpell(spell)}
                  title="View spell details"
                >
                  <Info className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => handleRemoveSpell(preparedSpell.spellId)}
                title="Remove spell"
                disabled={isUpdating}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

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
  PreparedCasterProgression,
  WizardClassProgression,
  CharacterClass,
} from "@/types/ClassProgression";
import { getPreparedSpellSlots } from "@/lib/spellSlots";
import { PageRoute } from "@/pages/PageRoute";
import type { Spell } from "@/types/Spell";

interface PreparedSpellsProps {
  spellLevel: number;
  progression: PreparedCasterProgression;
  characterId: string;
  onToggleSpellUsed?: (spellId: string, used: boolean) => void;
  onRemoveSpell?: (spellId: string) => void;
  onAddSpell?: (spellId: string) => void;
  onViewSpell?: (spell: Spell) => void;
}

export function PreparedSpells({
  spellLevel,
  progression,
  characterId,
  onToggleSpellUsed,
  onRemoveSpell,
  onAddSpell,
  onViewSpell,
}: PreparedSpellsProps) {
  const spells = progression.preparedSpells[spellLevel] || [];
  const slotMap = getPreparedSpellSlots(progression);
  const maxSlots = slotMap[spellLevel] || 0;
  const castable = spells.filter((s) => !s.used).length;

  // Check if this is a wizard progression for showing spellbooks
  const isWizard = progression.className === CharacterClass.WIZARD;
  const wizardProgression = isWizard
    ? (progression as WizardClassProgression)
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          Level {spellLevel} ({castable}/{maxSlots})
        </h3>
        <div className="flex items-center gap-2">
          {isWizard && (
            <Button asChild size="sm" variant="ghost">
              <Link to={PageRoute.WIZARD_SPELLBOOKS(characterId)}>
                Spellbooks
              </Link>
            </Button>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96">
              <div className="space-y-4">
                <p className="text-sm font-semibold">
                  Add Spell from Spellbook
                </p>
                <div className="space-y-3">
                  {!wizardProgression ||
                  wizardProgression.spellbooks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No spellbooks available
                    </p>
                  ) : (
                    wizardProgression.spellbooks.map((spellbook) => {
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
                            onValueChange={(spellName) => {
                              const selectedSpell = availableSpells.find(
                                (s) => s.name === spellName,
                              );
                              if (selectedSpell && onAddSpell) {
                                onAddSpell(
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
                  if (onToggleSpellUsed) {
                    onToggleSpellUsed(preparedSpell.spellId, checked === true);
                  }
                }}
                title="Mark as cast"
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
                onClick={() => {
                  if (onRemoveSpell) {
                    onRemoveSpell(preparedSpell.spellId);
                  }
                }}
                title="Remove spell"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

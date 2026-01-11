import { CastWizardSpells } from "@/components/custom/CastWizardSpells";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCharacterById } from "@/hooks/useCharacterById";
import { getWizardProgressionSpellSlots } from "@/lib/spellSlots";
import { PageRoute } from "@/pages/PageRoute";
import { useParams, Link } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, RotateCcw } from "lucide-react";
import { updateWizardPreparedSpellsLevel } from "@/firebase/characters";
import { useState } from "react";

/**
 * Wizard "Cast Spells" page.
 *
 * Shows prepared spells grouped by level and tracks remaining casts during the
 * current rest period.
 */
export function WizardCastSpellsPage() {
  const { characterId } = useParams();
  const { character, isLoading } = useCharacterById(characterId);
  const [resting, setResting] = useState(false);

  if (isLoading) {
    return <div>Loading prepared spells...</div>;
  }

  if (!character) {
    return <div>No character with id {characterId}</div>;
  }

  const wizard = character.class.wizard;

  if (!wizard) {
    return <div>This character has no wizard progression.</div>;
  }

  const slotMap = getWizardProgressionSpellSlots(wizard);
  const availableLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(
    (lvl) => (slotMap[lvl] ?? 0) > 0,
  );

  const handleRestAll = async () => {
    const ok = window.confirm(
      "Rest? This will restore remaining casts to their rested slot counts.",
    );
    if (!ok) return;

    if (resting) return;
    setResting(true);
    try {
      const levelEntries = Object.entries(wizard.preparedSpells);
      for (const [levelKey, spells] of levelEntries) {
        const level = Number(levelKey);
        const resetLevel = Object.fromEntries(
          Object.entries(spells).map(([spellId, counts]) => [
            spellId,
            { total: counts.total ?? 0, used: 0 },
          ]),
        );
        await updateWizardPreparedSpellsLevel(character.id, level, resetLevel);
      }
    } finally {
      setResting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Cast Spells</h1>
          <p className="text-muted-foreground">
            Prepared spells for {character.name}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Prepared Spells</CardTitle>
            <CardDescription>
              Track remaining casts during this rest period.
            </CardDescription>
          </div>
          <div className="flex items-center gap-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRestAll}
              disabled={resting}
              className="rounded-r-none"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {resting ? "Resting..." : "Rest"}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="Wizard pages"
                  className="rounded-l-none border-l-0"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-2">
                <div className="flex flex-col gap-1 text-sm">
                  <Link
                    to={PageRoute.WIZARD_PREPARE(character.id)}
                    className="rounded px-2 py-1 hover:bg-accent"
                  >
                    Prepare Spells
                  </Link>
                  <Link
                    to={PageRoute.WIZARD_SPELLBOOKS(character.id)}
                    className="rounded px-2 py-1 hover:bg-accent"
                  >
                    Spellbooks
                  </Link>
                  <Link
                    to={PageRoute.WIZARD_SPELL_SLOTS(character.id)}
                    className="rounded px-2 py-1 hover:bg-accent"
                  >
                    Manage Spell Slots
                  </Link>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableLevels.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/40 p-3 text-sm">
              <p className="font-semibold text-foreground">
                No spell slots available yet.
              </p>
              <p className="text-muted-foreground">
                Increase wizard level or adjust spell slot modifiers to gain
                prepared slots.
              </p>
            </div>
          ) : (
            availableLevels.map((spellLevel) => (
              <CastWizardSpells
                key={spellLevel}
                spellLevel={spellLevel}
                progression={wizard}
                characterId={character.id}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

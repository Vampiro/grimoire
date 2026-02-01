import { PreparePriestSpells } from "@/components/custom/PreparePriestSpells";
import { Card, CardContent } from "@/components/ui/card";
import { useCharacterById } from "@/hooks/useCharacterById";
import { getPriestProgressionSpellSlots } from "@/lib/spellSlots";
import { useParams } from "react-router-dom";

/**
 * Priest "Prepare Spells" page.
 *
 * Allows adding spells from the priest list and adjusting rested prepared
 * counts for each spell level.
 */
export function PriestPrepareSpellsPage() {
  const { characterId } = useParams();
  const { character, isLoading } = useCharacterById(characterId);

  if (isLoading) {
    return <div>Loading prepared spells...</div>;
  }

  if (!character) {
    return <div>No character with id {characterId}</div>;
  }

  const priest = character.class.priest;

  if (!priest) {
    return <div>This character has no priest progression.</div>;
  }

  const slotMap = getPriestProgressionSpellSlots(priest);
  const availableLevels = [1, 2, 3, 4, 5, 6, 7].filter(
    (lvl) => (slotMap[lvl] ?? 0) > 0,
  );

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-3xl font-bold">Prepare Spells</h1>
        <p className="text-muted-foreground text-sm">Prepare priest spells.</p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          {availableLevels.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/40 p-3 text-sm">
              <p className="font-semibold text-foreground">
                No spell slots available yet.
              </p>
              <p className="text-muted-foreground">
                Increase priest level or adjust spell slot modifiers to gain
                prepared slots.
              </p>
            </div>
          ) : (
            availableLevels.map((spellLevel) => (
              <PreparePriestSpells
                key={spellLevel}
                spellLevel={spellLevel}
                progression={priest}
                characterId={character.id}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

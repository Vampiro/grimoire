import { CastPriestSpells } from "@/components/custom/CastPriestSpells";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCharacterById } from "@/hooks/useCharacterById";
import { getPriestProgressionSpellSlots } from "@/lib/spellSlots";
import { PageRoute } from "@/pages/PageRoute";
import { useParams, Link } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, RotateCcw } from "lucide-react";
import { updatePriestPreparedSpellsLevel } from "@/firebase/characters";
import { useState } from "react";

/**
 * Priest "Cast Spells" page.
 *
 * Shows prepared spells grouped by level and tracks remaining casts during the
 * current rest period.
 */
export function PriestCastSpellsPage() {
  const { characterId } = useParams();
  const { character, isLoading } = useCharacterById(characterId);
  const [resting, setResting] = useState(false);
  const [confirmRestOpen, setConfirmRestOpen] = useState(false);

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

  const handleRestConfirm = async () => {
    if (resting) return;
    setResting(true);
    try {
      const levelEntries = Object.entries(priest.preparedSpells);
      for (const [levelKey, spells] of levelEntries) {
        const level = Number(levelKey);
        const resetLevel = Object.fromEntries(
          Object.entries(spells).map(([spellId, counts]) => [
            spellId,
            { total: counts.total ?? 0, used: 0 },
          ]),
        );
        await updatePriestPreparedSpellsLevel(character.id, level, resetLevel);
      }
    } finally {
      setResting(false);
      setConfirmRestOpen(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-3xl font-bold">Cast Spells</h1>
        <div className="text-muted-foreground text-sm">Cast priest spells.</div>
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
            <>
              <CastPriestSpells
                spellLevel={availableLevels[0]}
                progression={priest}
                characterId={character.id}
                headerRight={
                  <div className="flex items-center gap-0">
                    <AlertDialog
                      open={confirmRestOpen}
                      onOpenChange={setConfirmRestOpen}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmRestOpen(true)}
                        disabled={resting}
                        className="rounded-r-none"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {resting ? "Resting..." : "Rest"}
                      </Button>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rest?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will restore remaining casts to their rested
                            slot counts.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex gap-3 justify-end">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRestConfirm}>
                            Rest
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label="Priest pages"
                          className="rounded-l-none border-l-0"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-48 p-2">
                        <div className="flex flex-col gap-1 text-sm">
                          <Link
                            to={PageRoute.PRIEST_PREPARE(character.id)}
                            className="rounded px-2 py-1 hover:bg-accent"
                          >
                            Prepare Spells
                          </Link>
                          <Link
                            to={PageRoute.PRIEST_SPELL_SLOTS(character.id)}
                            className="rounded px-2 py-1 hover:bg-accent"
                          >
                            Manage Spell Slots
                          </Link>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                }
              />

              {availableLevels.slice(1).map((spellLevel) => (
                <CastPriestSpells
                  key={spellLevel}
                  spellLevel={spellLevel}
                  progression={priest}
                  characterId={character.id}
                />
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

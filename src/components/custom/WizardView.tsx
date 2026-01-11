import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageRoute } from "@/pages/PageRoute";
import { Character } from "@/types/Character";
import { WizardClassProgression } from "@/types/WizardClassProgression";
import { getWizardProgressionSpellSlots } from "@/lib/spellSlots";
import { PrepareWizardSpells } from "./PrepareWizardSpells";

/** Props for the wizard panel on the character view. */
interface WizardViewProps {
  /** Character being displayed. */
  character: Character;
  /** Wizard progression for the character. */
  wizardProgression: WizardClassProgression;
}

/**
 * Character-page wizard panel.
 *
 * Shows prepared spells by level (using the preparation UI) and links to
 * other wizard tools (spellbooks and slot management).
 */
export function WizardView({ character, wizardProgression }: WizardViewProps) {
  const navigate = useNavigate();
  const slotMap = getWizardProgressionSpellSlots(wizardProgression);
  const availableLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(
    (lvl) => (slotMap[lvl] ?? 0) > 0,
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              Prepared Spells
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to={PageRoute.WIZARD_SPELLBOOKS(character.id)}>
                Spellbooks
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                navigate(PageRoute.WIZARD_SPELL_SLOTS(character.id))
              }
            >
              Spell Slots
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            {availableLevels.map((spellLevel) => {
              return (
                <PrepareWizardSpells
                  key={spellLevel}
                  spellLevel={spellLevel}
                  progression={wizardProgression}
                  characterId={character.id}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

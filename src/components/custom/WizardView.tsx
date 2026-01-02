import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageRoute } from "@/pages/PageRoute";
import { Character } from "@/types/Character";
import { WizardClassProgression } from "@/types/WizardClassProgression";
import { getWizardProgressionSpellSlots } from "@/lib/spellSlots";
import { WizardPreparedSpells } from "./WizardPreparedSpells";

interface WizardViewProps {
  character: Character;
  wizardProgression: WizardClassProgression;
}

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
            <CardTitle>Wizard Level {wizardProgression.level}</CardTitle>
            <CardDescription>Prepared Spells</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              className="cursor-pointer disabled:cursor-not-allowed"
            >
              <Link to={PageRoute.WIZARD_SPELLBOOKS(character.id)}>
                Spellbooks
              </Link>
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer disabled:cursor-not-allowed"
              onClick={() => navigate(PageRoute.WIZARD_EDIT(character.id))}
            >
              Edit Wizard
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            {availableLevels.map((spellLevel) => {
              return (
                <WizardPreparedSpells
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

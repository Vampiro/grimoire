import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageRoute } from "@/pages/PageRoute";
import { Character } from "@/types/Character";
import { WizardClassProgression } from "@/types/ClassProgression";
import { getWizardProgressionSpellSlots } from "@/lib/spellSlots";
import { SpellViewer } from "./SpellViewer";
import { WizardPreparedSpells } from "./WizardPreparedSpells";
import type { Spell } from "@/types/Spell";

interface WizardViewProps {
  character: Character;
  wizardProgression: WizardClassProgression;
}

export function WizardView({ character, wizardProgression }: WizardViewProps) {
  const navigate = useNavigate();
  const [selectedSpellForViewer, setSelectedSpellForViewer] =
    useState<Spell | null>(null);
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
                  onViewSpell={setSelectedSpellForViewer}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedSpellForViewer}
        onOpenChange={(open) => !open && setSelectedSpellForViewer(null)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSpellForViewer?.name}</DialogTitle>
            <DialogDescription>
              Level {selectedSpellForViewer?.level}{" "}
              {selectedSpellForViewer?.class} Spell
            </DialogDescription>
          </DialogHeader>
          {selectedSpellForViewer && (
            <SpellViewer spell={selectedSpellForViewer} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

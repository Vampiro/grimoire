import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { SpellViewer } from "./SpellViewer";
import { WizardPreparedSpells } from "./PreparedSpells";
import type { Spell } from "@/types/Spell";

interface WizardViewProps {
  character: Character;
  wizardProgression: WizardClassProgression;
}

export function WizardView({ character, wizardProgression }: WizardViewProps) {
  const navigate = useNavigate();
  const [selectedSpellForViewer, setSelectedSpellForViewer] =
    useState<Spell | null>(null);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Wizard Level {wizardProgression.level}</CardTitle>
            <CardDescription>Prepared Spells</CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(PageRoute.WIZARD_EDIT(character.id))}
          >
            Edit Wizard
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((spellLevel) => {
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

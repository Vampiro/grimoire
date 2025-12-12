import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageRoute } from "@/pages/PageRoute";
import { Character } from "@/types/Character";
import {
  WizardClassProgression,
  CharacterClass,
} from "@/types/ClassProgression";
import { WizardView } from "./WizardView";

interface CharacterViewProps {
  character: Character;
}

export function CharacterView({ character }: CharacterViewProps) {
  const navigate = useNavigate();

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold">{character.name}</h1>
          <p className="text-muted-foreground">
            {character.classes
              .map((cls) => `${cls.className} (Level ${cls.level})`)
              .join(" / ")}
          </p>
        </div>

        {/* Edit button */}
        <Button
          variant="outline"
          onClick={() => navigate(PageRoute.CHARACTER_EDIT(character.id))}
        >
          Edit Character
        </Button>
      </div>

      {/* Display sections for each class */}
      <div className="space-y-8">
        {character.classes.map((classProgression) => {
          if (classProgression.className === CharacterClass.WIZARD) {
            return (
              <WizardView
                key={classProgression.className}
                character={character}
                wizardProgression={classProgression as WizardClassProgression}
              />
            );
          }
          // TODO: Add PriestView and other classes as needed
          return null;
        })}
      </div>
    </div>
  );
}

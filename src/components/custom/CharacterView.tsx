import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageRoute } from "@/pages/PageRoute";
import { Character } from "@/types/Character";
import { WizardView } from "./WizardView";

interface CharacterViewProps {
  character: Character;
}

export function CharacterView({ character }: CharacterViewProps) {
  const navigate = useNavigate();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{character.name}</h1>
          <p className="text-muted-foreground">
            {[
              character.class.wizard
                ? `${character.class.wizard.className} (Level ${character.class.wizard.level})`
                : null,
              character.class.priest
                ? `${character.class.priest.className} (Level ${character.class.priest.level})`
                : null,
            ]
              .filter(Boolean)
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
        {character.class.wizard && (
          <WizardView
            character={character}
            wizardProgression={character.class.wizard}
          />
        )}
      </div>
    </div>
  );
}

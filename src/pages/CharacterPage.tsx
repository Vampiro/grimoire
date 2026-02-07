import { useCharacterById } from "@/hooks/useCharacterById";
import { Link, useParams } from "react-router-dom";
import { PageRoute } from "./PageRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Removed Separator import
import { ArrowUpRight, Menu } from "lucide-react";

export function CharacterPage() {
  const { id } = useParams();
  const { character, isLoading } = useCharacterById(id);

  if (isLoading) {
    return <div>Loading character...</div>;
  }

  if (!character) {
    return <div>No character with ID {id}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{character.name}</h1>
          <p className="text-muted-foreground text-sm">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where to find things</CardTitle>
          <CardDescription>
            Open the navigation drawer via the{" "}
            <button>
              <Menu className="h-3 w-3" />
            </button>{" "}
            button in the top left. The navigation drawer shows shortcuts for
            this character.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <PageLink
            title="Edit Character"
            description="Update name, class levels, and other details."
            href={PageRoute.CHARACTER_EDIT(character.id)}
          />
        </CardContent>
      </Card>

      {character.class.priest && (
        <Card>
          <CardHeader>
            <CardTitle>Priest Tools</CardTitle>
            <CardDescription>
              Quick links and brief guidance for priest-specific pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PageLink
              title="Cast Spells"
              description="Track prepared spells by level and mark casts/restores during play."
              href={PageRoute.PRIEST_CAST(character.id)}
            />
            <div className="h-px w-full bg-border" />
            <PageLink
              title="Prepare Spells"
              description="Pick which spells are prepared in each slot, by level."
              href={PageRoute.PRIEST_PREPARE(character.id)}
            />
            <div className="h-px w-full bg-border" />
            <PageLink
              title="Castable Spells List"
              description="Browse priest spells in the Spell Explorer filtered to your level and sphere access. Favorite spells so you can filter by them when preparing spells."
              href={`${PageRoute.SPELLS}?priest=1&wizard=0&min=0&max=${Math.min(
                9,
                Math.max(0, character.class.priest.level),
              )}${
                character.class.priest.majorSpheres?.length
                  ? `&majorSpheres=${character.class.priest.majorSpheres.join(",")}`
                  : ""
              }${
                character.class.priest.minorSpheres?.length
                  ? `&minorSpheres=${character.class.priest.minorSpheres.join(",")}`
                  : ""
              }&quest=0&unknown=0`}
            />
            <div className="h-px w-full bg-border" />
            <PageLink
              title="Manage Spell Slots"
              description="Adjust slot modifiers and review base vs. modified slot tables."
              href={PageRoute.PRIEST_SPELL_SLOTS(character.id)}
            />
          </CardContent>
        </Card>
      )}

      {character.class.wizard && (
        <Card>
          <CardHeader>
            <CardTitle>Wizard Tools</CardTitle>
            <CardDescription>
              Quick links and brief guidance for wizard-specific pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PageLink
              title="Cast Spells"
              description="Track prepared spells by level and mark casts/restores during play."
              href={PageRoute.WIZARD_CAST(character.id)}
            />
            <div className="h-px w-full bg-border" />
            <PageLink
              title="Prepare Spells"
              description="Pick which spells are prepared in each slot, by level. The spells you can add are filtered based on your known spells and active spellbooks."
              href={PageRoute.WIZARD_PREPARE(character.id)}
            />
            <div className="h-px w-full bg-border" />
            <PageLink
              title="Spellbooks"
              description="Manage learned spells by spellbook, add/remove spells, and organize pages. You can also temporarily disable spellbooks so their spells don't show up when preparing."
              href={PageRoute.WIZARD_SPELLBOOKS(character.id)}
            />
            <div className="h-px w-full bg-border" />
            <PageLink
              title="Known Spells"
              description="Track and review your known spells by level.
              These are spells your wizard has learned, not necessarily those that are in your spellbooks or prepared."
              href={PageRoute.WIZARD_KNOWN_SPELLS(character.id)}
            />
            <div className="h-px w-full bg-border" />
            <PageLink
              title="Manage Spell Slots"
              description="Adjust slot modifiers and review base vs. modified slot tables."
              href={PageRoute.WIZARD_SPELL_SLOTS(character.id)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PageLink({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Button
        asChild
        variant="ghost"
        className="justify-start px-0 text-base font-semibold p-0"
      >
        <Link
          to={href}
          className="inline-flex items-center gap-2 [&:has(>svg)]:px-2"
        >
          {title}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </Button>
      <p className="text-sm text-muted-foreground px-2">{description}</p>
    </div>
  );
}

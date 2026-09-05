import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageRoute } from "./PageRoute";
import { userAtom } from "@/globalState";

export function HomePage() {
  const user = useAtomValue(userAtom);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">AD&amp;D 2e Grimoire</h1>
          <p className="text-sm text-muted-foreground">
            A spellcasting companion for Advanced Dungeons &amp; Dragons 2nd
            Edition. Browse every spell, build wizard spellbooks, manage priest
            spheres, and track preparation and casting across your characters.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to={PageRoute.SPELLS}>Open Spell Explorer</Link>
          </Button>
          {user && (
            <Button asChild variant="outline">
              <Link to={PageRoute.CHARACTERS}>Go to Characters</Link>
            </Button>
          )}
        </div>
        {!user && (
          <p className="text-xs text-muted-foreground">
            Sign in with Google from the top-right menu to unlock characters,
            class tools, and notes.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Getting Started</h2>
        <Card>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                Sign in to enable character management and saved settings.
              </li>
              <li>
                Create a character and add Wizard and/or Priest classes with
                their levels.
              </li>
              <li>
                For Priests, choose major and minor spheres to define access.
              </li>
              <li>
                Open the character drawer to jump into spell slots, preparation,
                and casting tools.
              </li>
            </ol>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Spell Explorer</h2>
        <Card>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              The Spell Explorer is the full spell index. Filter by class, level
              range, and priest spheres, then open any spell to read the full
              description.
            </p>
            <p>
              When signed in, you can favorite spells for quick recall and see
              those favorites across wizard and priest tools.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Priest Workflow</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">End-to-End Priest Flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Define major and minor spheres when creating the character to
                control spell access.
              </li>
              <li>
                Manage spell slots to set daily capacity and any modifiers.
              </li>
              <li>
                Use Spells in your Spheres to view only spells that match the
                priest&apos;s spheres and level. You can favorite spells from
                the Spell Explorer and filter on them when picking spells to
                prepare.
              </li>
              <li>
                Prepare spells from eligible lists after resting, filling slots
                by level.
              </li>
              <li>
                Cast spells to track remaining prepared slots during the day.
              </li>
            </ol>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Wizard Workflow</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">End-to-End Wizard Flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Manage spell slots to capture daily capacity and any modifiers.
              </li>
              <li>
                Build spellbooks and add spells, tracking page limits and book
                organization.
              </li>
              <li>
                Mark known spells so preparation and casting tools reflect the
                wizard&apos;s actual repertoire.
              </li>
              <li>
                Prepare spells from known spells after resting, filling slots by
                level.
              </li>
              <li>
                Cast spells to track remaining prepared slots during the
                adventure day.
              </li>
            </ol>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Spell Details &amp; Notes</h2>
        <Card>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Every spell has a dedicated view with full text, quick links, and
              any saved notes.
            </p>
            <p>
              Notes and favorites are tied to your account, so your campaign
              prep follows you across devices.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

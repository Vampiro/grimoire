import { useState } from "react";
import { useAtomValue } from "jotai";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { charactersAtom } from "@/globalState";
import { deleteCharacter } from "@/firebase/characters";
import { PageRoute } from "@/pages/PageRoute";

export function CharacterList() {
  const characters = useAtomValue(charactersAtom);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedCharacters = [...characters].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  /** Delete a character and refresh list */
  const handleDelete = async (characterId: string) => {
    setDeletingId(characterId);
    setError(null);
    try {
      await deleteCharacter(characterId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete character",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="text-sm text-destructive">{error}</div>}
      <div className="space-y-3">
        {sortedCharacters.map((c) => {
          const classSummary = [
            c.class.wizard
              ? `${c.class.wizard.className} (Level ${c.class.wizard.level})`
              : null,
            c.class.priest
              ? `${c.class.priest.className} (Level ${c.class.priest.level})`
              : null,
          ]
            .filter(Boolean)
            .join(" / ");

          return (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link
                    to={PageRoute.CHARACTER_VIEW(c.id)}
                    className="block truncate text-xl font-semibold hover:underline"
                  >
                    {c.name}
                  </Link>
                  <div className="text-sm text-muted-foreground">
                    {classSummary || "No class"}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                  >
                    <Link to={PageRoute.CHARACTER_VIEW(c.id)}>View</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                  >
                    <Link to={PageRoute.CHARACTER_EDIT(c.id)}>Edit</Link>
                  </Button>
                  <Popover
                    open={confirmDeleteId === c.id}
                    onOpenChange={(open) =>
                      setConfirmDeleteId(open ? c.id : null)
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === c.id}
                      >
                        {deletingId === c.id ? "Deleting..." : "Delete"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            Delete character?
                          </div>
                          <div className="text-xs text-muted-foreground">
                            This will permanently delete{" "}
                            <span className="font-medium">{c.name}</span>.
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={deletingId === c.id}
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={deletingId === c.id}
                            onClick={() => {
                              setConfirmDeleteId(null);
                              void handleDelete(c.id);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {sortedCharacters.length === 0 && (
          <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm">
            <div className="font-semibold">No characters yet.</div>
            <div className="text-muted-foreground">
              Use the + button to create one.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { CharacterList } from "@/components/custom/CharacterList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCharacter } from "@/firebase/characters";
import { CharacterClass } from "@/types/ClassProgression";

export function CharactersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [classLevels, setClassLevels] = useState<
    Partial<Record<"wizard" | "priest", number>>
  >({});
  const [addClassSelectKey, setAddClassSelectKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const levelOptions = useMemo(
    () => Array.from({ length: 20 }, (_, idx) => String(idx + 1)),
    [],
  );

  const remainingClasses = useMemo(() => {
    const remaining: Array<{ key: "wizard" | "priest"; label: string }> = [];
    if (!classLevels.wizard) remaining.push({ key: "wizard", label: "Wizard" });
    if (!classLevels.priest) remaining.push({ key: "priest", label: "Priest" });
    return remaining;
  }, [classLevels.priest, classLevels.wizard]);

  const handleAddClass = (klass: "wizard" | "priest") => {
    setClassLevels((prev) => ({ ...prev, [klass]: prev[klass] ?? 1 }));
    // Reset the add-class dropdown back to its "Add class" state.
    setAddClassSelectKey((k) => k + 1);
  };

  const handleRemoveClass = (klass: "wizard" | "priest") => {
    setClassLevels((prev) => {
      const next = { ...prev };
      delete next[klass];
      return next;
    });
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setCreateError("Name is required.");
      return;
    }

    if (!classLevels.wizard && !classLevels.priest) {
      setCreateError("Add at least one class.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      await createCharacter({
        name: trimmed,
        class: {
          ...(classLevels.wizard
            ? {
                wizard: {
                  className: CharacterClass.WIZARD,
                  level: classLevels.wizard,
                  preparedSpells: {},
                  spellbooksById: {},
                  spellSlotModifiers: [],
                },
              }
            : {}),
          ...(classLevels.priest
            ? {
                priest: {
                  className: CharacterClass.PRIEST,
                  level: classLevels.priest,
                  preparedSpells: {},
                  spellSlotModifiers: [],
                },
              }
            : {}),
        },
      });

      setCreateOpen(false);
      setName("");
      setClassLevels({});
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create character",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Characters</h1>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="cursor-pointer"
                  aria-label="Create character"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Character</DialogTitle>
                  <DialogDescription>
                    Choose a name and add class levels.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Name</div>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Elminster"
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">Classes</div>

                      <Select
                        key={addClassSelectKey}
                        onValueChange={(val) => {
                          if (val === "__none__") return;
                          handleAddClass(val as "wizard" | "priest");
                        }}
                      >
                        <SelectTrigger
                          className="h-7 w-7 justify-center p-0 cursor-pointer disabled:cursor-not-allowed data-[size=sm]:h-7 data-[size=sm]:min-h-7 [&_svg:last-child]:hidden"
                          aria-label="Add class"
                          size="sm"
                          disabled={remainingClasses.length === 0}
                        >
                          <Plus className="h-3 w-3" />
                        </SelectTrigger>
                        <SelectContent className="w-max min-w-max">
                          {remainingClasses.length === 0 ? (
                            <div className="space-y-1 px-3 py-3 text-sm">
                              <div className="text-muted-foreground">
                                All classes already added.
                              </div>
                            </div>
                          ) : (
                            remainingClasses.map((c) => (
                              <SelectItem
                                key={c.key}
                                value={c.key}
                                className="cursor-pointer"
                              >
                                {c.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {(classLevels.wizard || classLevels.priest) && (
                      <div className="space-y-2">
                        {classLevels.wizard && (
                          <div className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted/50">
                            <div className="text-sm font-medium">Wizard</div>
                            <span className="ml-auto text-xs text-muted-foreground">
                              Level
                            </span>
                            <Select
                              value={String(classLevels.wizard)}
                              onValueChange={(v) =>
                                setClassLevels((prev) => ({
                                  ...prev,
                                  wizard: Number(v),
                                }))
                              }
                            >
                              <SelectTrigger className="w-20 cursor-pointer">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="w-max min-w-max">
                                {levelOptions.map((lvl) => (
                                  <SelectItem key={lvl} value={lvl}>
                                    {lvl}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="cursor-pointer"
                              onClick={() => handleRemoveClass("wizard")}
                              aria-label="Remove wizard class"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {classLevels.priest && (
                          <div className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted/50">
                            <div className="text-sm font-medium">Priest</div>
                            <span className="ml-auto text-xs text-muted-foreground">
                              Level
                            </span>
                            <Select
                              value={String(classLevels.priest)}
                              onValueChange={(v) =>
                                setClassLevels((prev) => ({
                                  ...prev,
                                  priest: Number(v),
                                }))
                              }
                            >
                              <SelectTrigger className="w-20 cursor-pointer">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="w-max min-w-max">
                                {levelOptions.map((lvl) => (
                                  <SelectItem key={lvl} value={lvl}>
                                    {lvl}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="cursor-pointer"
                              onClick={() => handleRemoveClass("priest")}
                              aria-label="Remove priest class"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {createError && (
                    <div className="text-sm text-destructive">
                      {createError}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    onClick={handleCreate}
                    disabled={creating}
                    className="cursor-pointer"
                  >
                    {creating ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-muted-foreground">
            Create and manage your roster.
          </p>
        </div>
      </div>

      <CharacterList />
    </div>
  );
}

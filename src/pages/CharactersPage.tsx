import { useEffect, useMemo, useState } from "react";
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
import { useNavigate } from "react-router-dom";
import { PageRoute } from "./PageRoute";
import { MobileFullScreenDialogContent } from "@/components/custom/MobileFullScreenDialogContent";

export function CharactersPage() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [classLevels, setClassLevels] = useState<
    Partial<Record<"wizard" | "priest", number>>
  >({});
  const [addClassSelectKey, setAddClassSelectKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [classHintError, setClassHintError] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // When the modal closes, reset the form state so reopening starts fresh.
  useEffect(() => {
    if (createOpen) return;
    setName("");
    setClassLevels({});
    setCreateError(null);
    setClassHintError(false);
    setNameError(null);
    setAddClassSelectKey((k) => k + 1);
  }, [createOpen]);

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
    setCreateError(null);
    setClassHintError(false);
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
      setNameError("Name is required.");
      return;
    }
    setNameError(null);

    if (!classLevels.wizard && !classLevels.priest) {
      setCreateError(null);
      setClassHintError(true);
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const newCharacterId = await createCharacter({
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
      setClassHintError(false);
      setNameError(null);

      navigate(PageRoute.CHARACTER_VIEW(newCharacterId));
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
                  aria-label="Create character"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>

              <MobileFullScreenDialogContent>
                <DialogHeader>
                  <DialogTitle>Create Character</DialogTitle>
                  <DialogDescription>
                    Choose a name and add classes and class levels.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex w-full items-center gap-2 text-sm font-medium">
                      <span>Name</span>
                      {nameError && (
                        <span className="text-xs text-destructive">
                          {nameError}
                        </span>
                      )}
                    </div>
                    <input
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (nameError) setNameError(null);
                      }}
                      placeholder="e.g. Aragorn"
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
                          className="h-7 w-7 justify-center p-0 data-[size=sm]:h-7 data-[size=sm]:min-h-7 [&_svg:last-child]:hidden"
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
                              <SelectItem key={c.key} value={c.key}>
                                {c.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {!classLevels.wizard && !classLevels.priest && (
                      <div
                        className={`text-xs ${classHintError ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        Add at least one class to continue.
                      </div>
                    )}

                    {(classLevels.wizard || classLevels.priest) && (
                      <div className="space-y-2">
                        {classLevels.wizard && (
                          <div className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted/50">
                            <div className="text-sm font-medium">Wizard</div>
                            <Select
                              value={String(classLevels.wizard)}
                              onValueChange={(v) =>
                                setClassLevels((prev) => ({
                                  ...prev,
                                  wizard: Number(v),
                                }))
                              }
                            >
                              <SelectTrigger className="w-24">
                                <span className="text-sm">
                                  {classLevels.wizard
                                    ? `Level ${classLevels.wizard}`
                                    : "Level"}
                                </span>
                                <SelectValue className="sr-only" />
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
                            <Select
                              value={String(classLevels.priest)}
                              onValueChange={(v) =>
                                setClassLevels((prev) => ({
                                  ...prev,
                                  priest: Number(v),
                                }))
                              }
                            >
                              <SelectTrigger className="w-24">
                                <span className="text-sm">
                                  {classLevels.priest
                                    ? `Level ${classLevels.priest}`
                                    : "Level"}
                                </span>
                                <SelectValue className="sr-only" />
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
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </MobileFullScreenDialogContent>
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

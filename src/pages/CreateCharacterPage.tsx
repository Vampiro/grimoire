import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { createCharacter } from "@/firebase/characters";
import { CharacterClass } from "@/types/ClassProgression";
import { PRIEST_SPHERE_OPTIONS } from "@/lib/priestSpheres";
import { PageRoute } from "./PageRoute";

export function CreateCharacterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [classLevels, setClassLevels] = useState<
    Partial<Record<"wizard" | "priest", number>>
  >({});
  const [addClassSelectKey, setAddClassSelectKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [classHintError, setClassHintError] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [priestMajorSpheres, setPriestMajorSpheres] = useState<string[]>([]);
  const [priestMinorSpheres, setPriestMinorSpheres] = useState<string[]>([]);

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
    if (klass === "priest") {
      setPriestMajorSpheres([]);
      setPriestMinorSpheres([]);
    }
  };

  const normalizeSpheres = (values: Iterable<string>) => {
    const set = new Set(values);
    return PRIEST_SPHERE_OPTIONS.filter((sphere) => set.has(sphere));
  };

  const toggleSphere = (sphere: string, access: "major" | "minor") => {
    const source =
      access === "major" ? priestMajorSpheres : priestMinorSpheres;
    const next = new Set(source);
    if (next.has(sphere)) {
      next.delete(sphere);
    } else {
      next.add(sphere);
    }
    const normalized = normalizeSpheres(next);
    if (access === "major") {
      setPriestMajorSpheres(normalized);
    } else {
      setPriestMinorSpheres(normalized);
    }
  };

  const adjustClassLevel = (klass: "wizard" | "priest", delta: number) => {
    setClassLevels((prev) => {
      const current = prev[klass] ?? 1;
      const nextLevel = Math.min(20, Math.max(1, current + delta));
      return { ...prev, [klass]: nextLevel };
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
                  knownSpellsById: {},
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
                  knownSpellsById: {},
                  spellSlotModifiers: [],
                  ...(priestMajorSpheres.length > 0
                    ? { majorSpheres: priestMajorSpheres }
                    : {}),
                  ...(priestMinorSpheres.length > 0
                    ? { minorSpheres: priestMinorSpheres }
                    : {}),
                },
              }
            : {}),
        },
      });

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
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Create Character</h1>
          <p className="text-muted-foreground text-sm">
            Choose a name and add classes and class levels.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <div className="flex w-full items-center gap-2 text-sm font-medium">
              <span>Name</span>
              {nameError && (
                <span className="text-xs text-destructive">{nameError}</span>
              )}
            </div>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="e.g. Aragorn"
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
                <SelectContent
                  className="w-max min-w-max"
                  position="popper"
                  align="start"
                  sideOffset={4}
                >
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
                    <div className="inline-flex items-center">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-r-none"
                        onClick={() => adjustClassLevel("wizard", -1)}
                        disabled={(classLevels.wizard ?? 1) <= 1}
                        title="Decrease level"
                      >
                        -
                      </Button>
                      <Input
                        readOnly
                        value={`Level ${classLevels.wizard ?? 1}`}
                        className="h-8 w-24 rounded-none border-y border-input bg-background px-2 text-center text-sm font-semibold shadow-none"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-l-none"
                        onClick={() => adjustClassLevel("wizard", 1)}
                        disabled={(classLevels.wizard ?? 1) >= 20}
                        title="Increase level"
                      >
                        +
                      </Button>
                    </div>
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
                  <div className="space-y-2 rounded-md px-2 py-1 transition-colors hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">Priest</div>
                      <div className="inline-flex items-center">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-r-none"
                          onClick={() => adjustClassLevel("priest", -1)}
                          disabled={(classLevels.priest ?? 1) <= 1}
                          title="Decrease level"
                        >
                          -
                        </Button>
                        <Input
                          readOnly
                          value={`Level ${classLevels.priest ?? 1}`}
                          className="h-8 w-24 rounded-none border-y border-input bg-background px-2 text-center text-sm font-semibold shadow-none"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-l-none"
                          onClick={() => adjustClassLevel("priest", 1)}
                          disabled={(classLevels.priest ?? 1) >= 20}
                          title="Increase level"
                        >
                          +
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveClass("priest")}
                        aria-label="Remove priest class"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Major Spheres
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {priestMajorSpheres.length > 0
                            ? `${priestMajorSpheres.length} selected`
                            : "None selected"}
                        </div>
                        <ScrollArea className="h-40 rounded-sm border p-2">
                          <div className="grid grid-cols-2 gap-2">
                            {PRIEST_SPHERE_OPTIONS.map((sphere) => (
                              <label
                                key={`create-major-${sphere}`}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Checkbox
                                  checked={priestMajorSpheres.includes(sphere)}
                                  onCheckedChange={() =>
                                    toggleSphere(sphere, "major")
                                  }
                                />
                                <span>{sphere}</span>
                              </label>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Minor Spheres (levels 1-3)
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {priestMinorSpheres.length > 0
                            ? `${priestMinorSpheres.length} selected`
                            : "None selected"}
                        </div>
                        <ScrollArea className="h-40 rounded-sm border p-2">
                          <div className="grid grid-cols-2 gap-2">
                            {PRIEST_SPHERE_OPTIONS.map((sphere) => (
                              <label
                                key={`create-minor-${sphere}`}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Checkbox
                                  checked={priestMinorSpheres.includes(sphere)}
                                  onCheckedChange={() =>
                                    toggleSphere(sphere, "minor")
                                  }
                                />
                                <span>{sphere}</span>
                              </label>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {createError && (
            <div className="text-sm text-destructive">{createError}</div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

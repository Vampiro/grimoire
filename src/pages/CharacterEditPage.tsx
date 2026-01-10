import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  firestoreDeleteField,
  updateCharacterFields,
} from "@/firebase/characters";
import { useCharacterById } from "@/hooks/useCharacterById";
import { CharacterClass } from "@/types/ClassProgression";
import { Plus, Trash2 } from "lucide-react";

export function CharacterEditPage() {
  const { characterId } = useParams();
  const { character, isLoading } = useCharacterById(characterId);

  const [name, setName] = useState("");
  const [classLevels, setClassLevels] = useState<
    Partial<Record<"wizard" | "priest", number>>
  >({});
  const [addClassSelectKey, setAddClassSelectKey] = useState(0);
  const [confirmRemove, setConfirmRemove] = useState<
    "wizard" | "priest" | null
  >(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const baselineRef = useRef<{
    name: string;
    classLevels: typeof classLevels;
  } | null>(null);
  const saveRequestIdRef = useRef(0);

  // Initialize form state once when the character loads.
  // Intentionally does not re-init on subsequent atom updates.
  // (Keeps local edits stable while the global list syncs.)
  useEffect(() => {
    if (!character) return;
    if (baselineRef.current) return;

    const initialName = character.name.trim();

    const initialClassLevels: Partial<Record<"wizard" | "priest", number>> = {
      ...(character.class.wizard
        ? { wizard: character.class.wizard.level }
        : {}),
      ...(character.class.priest
        ? { priest: character.class.priest.level }
        : {}),
    };

    baselineRef.current = {
      name: initialName,
      classLevels: initialClassLevels,
    };
    setSaving(false);
    setSaveError(null);

    setName(initialName);
    setClassLevels(initialClassLevels);
  }, [character]);

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

  const isDirty = (() => {
    const baseline = baselineRef.current;
    if (!baseline) return false;
    if (name !== baseline.name) return true;
    const w0 = baseline.classLevels.wizard ?? null;
    const p0 = baseline.classLevels.priest ?? null;
    const w1 = classLevels.wizard ?? null;
    const p1 = classLevels.priest ?? null;
    return w0 !== w1 || p0 !== p1;
  })();

  const validationError = (() => {
    if (!isDirty) return null;
    if (!name.trim()) return "Name is required.";
    return null;
  })();

  const runSave = (
    updates: Record<string, unknown>,
    nextBaseline: {
      name: string;
      classLevels: typeof classLevels;
    },
  ) => {
    if (!character) return;

    const requestId = ++saveRequestIdRef.current;
    setSaving(true);
    setSaveError(null);

    updateCharacterFields(character.id, updates)
      .then(() => {
        if (requestId !== saveRequestIdRef.current) return;
        baselineRef.current = nextBaseline;
      })
      .catch((err) => {
        if (requestId !== saveRequestIdRef.current) return;
        setSaveError(
          err instanceof Error ? err.message : "Failed to save character",
        );
      })
      .finally(() => {
        if (requestId !== saveRequestIdRef.current) return;
        setSaving(false);
      });
  };

  const handleNameCommit = () => {
    if (!character) return;
    const baseline = baselineRef.current;
    if (!baseline) return;

    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed === baseline.name) return;

    runSave(
      { name: trimmed },
      { name: trimmed, classLevels: baseline.classLevels },
    );
  };

  const handleAddClass = (klass: "wizard" | "priest") => {
    if (!character) return;
    const baseline = baselineRef.current;
    if (!baseline) return;

    const nextLevel = classLevels[klass] ?? 1;
    const nextClassLevels = { ...classLevels, [klass]: nextLevel };
    setClassLevels(nextClassLevels);
    setAddClassSelectKey((k) => k + 1);

    if (klass === "wizard") {
      runSave(
        { "class.wizard": buildNewWizardClass(nextLevel) },
        { name: baseline.name, classLevels: nextClassLevels },
      );
    } else {
      runSave(
        { "class.priest": buildNewPriestClass(nextLevel) },
        { name: baseline.name, classLevels: nextClassLevels },
      );
    }
  };

  const handleSetClassLevel = (klass: "wizard" | "priest", lvl: number) => {
    if (!character) return;
    const baseline = baselineRef.current;
    if (!baseline) return;

    const nextClassLevels = { ...classLevels, [klass]: lvl };
    setClassLevels(nextClassLevels);

    const baselineLevel = baseline.classLevels[klass];
    if (baselineLevel === lvl) return;

    runSave(
      {
        [klass === "wizard" ? "class.wizard.level" : "class.priest.level"]: lvl,
      },
      { name: baseline.name, classLevels: nextClassLevels },
    );
  };

  const handleConfirmRemoveClass = (klass: "wizard" | "priest") => {
    if (!character) return;
    const baseline = baselineRef.current;
    if (!baseline) return;

    const nextClassLevels = { ...classLevels };
    delete nextClassLevels[klass];

    setClassLevels(nextClassLevels);
    setConfirmRemove(null);

    runSave(
      {
        [klass === "wizard" ? "class.wizard" : "class.priest"]:
          firestoreDeleteField(),
      },
      { name: baseline.name, classLevels: nextClassLevels },
    );
  };

  const buildNewWizardClass = (level: number) => ({
    className: CharacterClass.WIZARD,
    level,
    preparedSpells: {},
    spellbooksById: {},
    spellSlotModifiers: [],
  });

  const buildNewPriestClass = (level: number) => ({
    className: CharacterClass.PRIEST,
    level,
    preparedSpells: {},
    spellSlotModifiers: [],
  });

  if (isLoading) {
    return <div>Loading character...</div>;
  }

  if (!character) {
    return <div>No Character with id {characterId}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Edit Character</h1>
          <p className="text-muted-foreground">Update name and classes.</p>
        </div>

        {saving && (
          <div className="text-sm text-muted-foreground">Saving...</div>
        )}
      </div>

      {saveError && <div className="text-sm text-destructive">{saveError}</div>}

      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex w-full items-center gap-2 text-sm font-medium">
            <span>Name</span>
            {validationError && (
              <span className="text-xs text-destructive">
                {validationError}
              </span>
            )}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
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

          {(classLevels.wizard || classLevels.priest) && (
            <div className="space-y-2">
              {classLevels.wizard && (
                <div className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted/50">
                  <div className="text-sm font-medium">Wizard</div>
                  <Select
                    value={String(classLevels.wizard)}
                    onValueChange={(v) =>
                      handleSetClassLevel("wizard", Number(v))
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

                  <Popover
                    open={confirmRemove === "wizard"}
                    onOpenChange={(open) =>
                      setConfirmRemove(open ? "wizard" : null)
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove wizard class"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            Remove Wizard?
                          </div>
                          <div className="text-xs text-muted-foreground">
                            This will remove the Wizard class from this
                            character.
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmRemove(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleConfirmRemoveClass("wizard")}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {classLevels.priest && (
                <div className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted/50">
                  <div className="text-sm font-medium">Priest</div>
                  <Select
                    value={String(classLevels.priest)}
                    onValueChange={(v) =>
                      handleSetClassLevel("priest", Number(v))
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

                  <Popover
                    open={confirmRemove === "priest"}
                    onOpenChange={(open) =>
                      setConfirmRemove(open ? "priest" : null)
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove priest class"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            Remove Priest?
                          </div>
                          <div className="text-xs text-muted-foreground">
                            This will remove the Priest class from this
                            character.
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmRemove(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleConfirmRemoveClass("priest")}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

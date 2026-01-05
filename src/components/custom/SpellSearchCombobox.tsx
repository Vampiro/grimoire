import { useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { priestSpellsAtom, wizardSpellsAtom } from "@/globalState";
import { openSpellViewer } from "@/lib/spellLookup";
import type { Spell } from "@/types/Spell";

const MAX_RESULTS = 200;

type SpellSearchEntry = {
  id: string;
  name: string;
  meta: string;
  spell: Spell;
};

export function SpellSearchCombobox({ closeMenu }: { closeMenu: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wizardSpells = useAtomValue(wizardSpellsAtom);
  const priestSpells = useAtomValue(priestSpellsAtom);
  const [query, setQuery] = useState("");

  // Autofocus when opened
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  const queryNormalized = query.trim().toLowerCase();

  const allSpells = useMemo((): SpellSearchEntry[] => {
    const wizardEntries = wizardSpells.map((spell) => ({
      id: `wizard:${String(spell.id)}`,
      name: spell.name,
      meta: `Wizard Level ${spell.level}`,
      spell,
    }));

    const priestEntries = priestSpells.map((spell) => ({
      id: `priest:${String(spell.id)}`,
      name: spell.name,
      meta: `Priest Level ${spell.level}`,
      spell,
    }));

    return [...wizardEntries, ...priestEntries].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [priestSpells, wizardSpells]);

  const matches = useMemo(() => {
    if (!queryNormalized) {
      return {
        items: allSpells.slice(0, MAX_RESULTS),
        total: allSpells.length,
      };
    }

    const filtered = allSpells.filter((s) =>
      s.name.toLowerCase().includes(queryNormalized),
    );
    return { items: filtered.slice(0, MAX_RESULTS), total: filtered.length };
  }, [allSpells, queryNormalized]);

  const isCapped = matches.total > matches.items.length;
  const shownCount = matches.items.length;
  const totalCount = matches.total;

  const handleSelect = (id: string) => {
    const entry = allSpells.find((s) => s.id === id);
    if (!entry) return;
    closeMenu();
    openSpellViewer(entry.spell);
  };

  return (
    <Command>
      <CommandInput
        ref={inputRef}
        placeholder="Search spells..."
        className="h-9"
        value={query}
        onValueChange={setQuery}
      />

      <ScrollArea type="always" className="h-[300px]">
        <CommandList className="max-h-none overflow-visible">
          {matches.total === 0 ? (
            <CommandEmpty>No spells found.</CommandEmpty>
          ) : (
            <>
              <CommandGroup heading="Spells">
                {matches.items.map((spell) => (
                  <CommandItem
                    key={spell.id}
                    value={`${spell.name} ${spell.meta}`}
                    onSelect={() => handleSelect(spell.id)}
                  >
                    <div className="flex w-full items-start gap-3">
                      <span className="min-w-0 flex-1 whitespace-normal break-words">
                        {spell.name}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-right">
                        {spell.meta}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>

              {isCapped && (
                <div className="text-muted-foreground px-2 py-2 text-xs">
                  Showing first {shownCount} of {totalCount} results. Continue
                  typing to narrow the list.
                </div>
              )}
            </>
          )}
        </CommandList>
      </ScrollArea>
    </Command>
  );
}

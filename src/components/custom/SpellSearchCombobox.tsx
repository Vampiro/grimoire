import { useEffect, useMemo, useRef } from "react";
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

export function SpellSearchCombobox({ closeMenu }: { closeMenu: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wizardSpells = useAtomValue(wizardSpellsAtom);
  const priestSpells = useAtomValue(priestSpellsAtom);

  // Autofocus when opened
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  const allSpells = useMemo(
    () => [...wizardSpells, ...priestSpells],
    [wizardSpells, priestSpells],
  );

  const handleSelect = (name: string) => {
    const spell = allSpells.find((s) => s.name === name);
    if (!spell) return;
    closeMenu();
    openSpellViewer(spell);
  };

  return (
    <Command>
      <CommandInput
        ref={inputRef}
        placeholder="Search spells..."
        className="h-9"
      />

      <ScrollArea type="always" className="h-[300px]">
        <CommandList className="max-h-none overflow-visible">
          <CommandEmpty>No spells found.</CommandEmpty>

          {/* --- Wizard Spells --- */}
          <CommandGroup heading="Wizard Spells">
            {wizardSpells.map((spell) => (
              <CommandItem
                key={spell.id}
                value={spell.name}
                className="cursor-pointer"
                onSelect={handleSelect}
              >
                {spell.name}
              </CommandItem>
            ))}
          </CommandGroup>

          {/* --- Priest Spells --- */}
          <CommandGroup heading="Priest Spells">
            {priestSpells.map((spell) => (
              <CommandItem
                key={spell.id}
                value={spell.name}
                className="cursor-pointer"
                onSelect={handleSelect}
              >
                {spell.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </ScrollArea>
    </Command>
  );
}

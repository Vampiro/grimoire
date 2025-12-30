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
import { priestSpellsAtom, wizardSpellsAtom } from "@/globalState";

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
    window.open(spell.link, "_blank"); // ← open in new tab/window
  };

  return (
    <Command>
      <CommandInput
        ref={inputRef}
        placeholder="Search spells..."
        className="h-9"
      />

      <CommandList>
        <CommandEmpty>No spells found.</CommandEmpty>

        {/* --- Wizard Spells --- */}
        <CommandGroup heading="Wizard Spells">
          {wizardSpells.map((spell) => (
            <CommandItem
              key={spell.name}
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
              key={spell.name}
              value={spell.name}
              className="cursor-pointer"
              onSelect={handleSelect}
            >
              {spell.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

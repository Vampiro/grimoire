import { useEffect, useRef } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { priestSpells } from "@/data/priestSpells";
import { wizardSpells } from "@/data/wizardSpells";

export function SpellSearchCombobox({ closeMenu }: { closeMenu: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus when opened
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  const handleSelect = (name: string) => {
    const all = [...wizardSpells, ...priestSpells];
    const spell = all.find((s) => s.name === name);
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

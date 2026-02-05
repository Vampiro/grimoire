import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMemo, useState } from "react";

export interface ComboboxProps<T> {
  /** List of items to choose from */
  items: T[];
  /** Map item → display label */
  getLabel: (item: T) => string;
  /** Map item → unique key */
  getKey: (item: T) => string;
  /** Controlled value */
  value?: T;
  /** Called when a new item is selected */
  onChange?: (item?: T) => void;
  /** Placeholder when nothing selected */
  placeholder?: string;
}

export function Combobox<T>({
  items,
  getLabel,
  getKey,
  value,
  onChange,
  placeholder = "Select…",
}: ComboboxProps<T>) {
  const [open, setOpen] = useState(false);

  // Map keys to objects for easy lookup
  const lookup = useMemo(() => {
    const map = new Map<string, T>();
    for (const item of items) {
      map.set(getKey(item), item);
    }
    return map;
  }, [items, getKey]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="w-full">
        <div className="border rounded px-3 py-2 text-left cursor-pointer w-full">
          {value ? getLabel(value) : placeholder}
        </div>
      </PopoverTrigger>

      <PopoverContent className="p-0 w-[250px]">
        <Command>
          <CommandInput
            placeholder="Search..."
            className="text-base sm:text-sm"
          />
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandList>
            <CommandGroup>
              {items.map((item) => {
                const key = getKey(item);
                return (
                  <CommandItem
                    key={key}
                    value={key}
                    onSelect={() => {
                      const selected = lookup.get(key);
                      onChange?.(selected);
                      setOpen(false);
                    }}
                  >
                    {getLabel(item)}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

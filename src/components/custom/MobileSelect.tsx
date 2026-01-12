"use client";

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { MobileDialog } from "./MobileDialog";

type MobileSelectProps<T> = {
  open: boolean;
  onOpenChange(open: boolean): void;

  items: T[];
  value?: T;
  onChange(item?: T): void;

  getLabel(item: T): string;
  getKey(item: T): string;
  isItemDisabled?(item: T): boolean;

  title?: string;
  placeholder?: string;
  emptyText?: string;
  limit?: number;
};

const DEFAULT_LIMIT = 200;

export function MobileSelect<T>({
  open,
  onOpenChange,
  items,
  value,
  onChange,
  getLabel,
  getKey,
  isItemDisabled,
  title,
  placeholder = "Search…",
  emptyText = "No results found.",
  limit = DEFAULT_LIMIT,
}: MobileSelectProps<T>) {
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const base = normalized
      ? items.filter((item) =>
          getLabel(item).toLowerCase().includes(normalized)
        )
      : items;

    return base.slice().sort((a, b) =>
      getLabel(a).localeCompare(getLabel(b), undefined, {
        sensitivity: "base",
      })
    );
  }, [items, getLabel, normalized]);

  const limited = filtered.slice(0, limit);
  const isCapped = filtered.length > limited.length;

  const handleSelect = (key: string) => {
    const item = items.find((it) => getKey(it) === key);
    if (item && isItemDisabled?.(item)) return;
    onChange(item);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <MobileDialog open={open} onOpenChange={onOpenChange}>
      <Command
        shouldFilter={false}
        className="flex h-full flex-col bg-background"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold">{title ?? "Select"}</div>
        </div>

        {/* Search */}
        <div className="border-b px-4 py-2">
          <CommandInput
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder={placeholder}
            className="h-11"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <CommandList className="p-2 max-h-full">
            {limited.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : (
              limited.map((item) => {
                const key = getKey(item);
                const label = getLabel(item);
                const selected = value && getKey(value) === key;
                const disabled = isItemDisabled?.(item);

                return (
                  <CommandItem
                    key={key}
                    value={key}
                    onSelect={handleSelect}
                    disabled={disabled}
                    className={cn(
                      "min-h-[44px]",
                      selected && "bg-accent",
                      disabled && "opacity-60"
                    )}
                  >
                    {label}
                  </CommandItem>
                );
              })
            )}
          </CommandList>
        </div>

        {/* Footer */}
        {isCapped && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            Showing first {limit} results. Type to narrow.
          </div>
        )}
      </Command>
    </MobileDialog>
  );
}

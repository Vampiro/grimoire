"use client";

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { useMemo, useState } from "react";

type MobileSelectProps<T> = {
  open: boolean;
  onOpenChange(open: boolean): void;

  items: T[];
  value?: T;
  onChange(item?: T): void;

  getLabel(item: T): string;
  getKey(item: T): string;

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
    onChange(item);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0",
          "h-[100dvh] max-h-[100dvh] w-full",
          "rounded-none",
          "animate-none" // 🚫 critical for iOS keyboard
        )}
      >
        <Command
          shouldFilter={false}
          className="flex h-full flex-col bg-background"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="text-sm font-semibold">{title ?? "Select"}</div>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                onOpenChange(false);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
              aria-label="Close"
            >
              <XIcon className="h-4 w-4" />
            </button>
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
            <CommandList className="p-2">
              {limited.length === 0 ? (
                <CommandEmpty>{emptyText}</CommandEmpty>
              ) : (
                limited.map((item) => {
                  const key = getKey(item);
                  const label = getLabel(item);
                  const selected = value && getKey(value) === key;

                  return (
                    <CommandItem
                      key={key}
                      value={key}
                      onSelect={handleSelect}
                      className={cn("min-h-[44px]", selected && "bg-accent")}
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
      </DialogContent>
    </Dialog>
  );
}

"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { MobileFullScreenDialogContent } from "./MobileFullScreenDialogContent";
import { X } from "lucide-react";

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
  getCategory?(item: T): string | undefined;
  categoryLabel?(category: string): string;
  renderItem?(item: T): ReactNode;
  autoFocus?: boolean;
  inputRightSlot?: ReactNode;
  preventAutoFocus?: boolean;
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
  getCategory,
  categoryLabel = (cat) => cat,
  renderItem,
  autoFocus = true,
  inputRightSlot,
  preventAutoFocus = false,
}: MobileSelectProps<T>) {
  const [query, setQuery] = useState("");
  const [isLandscape, setIsLandscape] = useState(false);
  const shouldAutoFocus = autoFocus && !preventAutoFocus && !isLandscape;
  const shouldPreventAutoFocus = preventAutoFocus || isLandscape;

  useEffect(() => {
    if (open) {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(orientation: landscape)");
    const update = () => setIsLandscape(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener("change", update);
    } else {
      media.addListener(update);
    }
    window.addEventListener("resize", update);
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", update);
      } else {
        media.removeListener(update);
      }
      window.removeEventListener("resize", update);
    };
  }, []);

  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const base = normalized
      ? items.filter((item) =>
          getLabel(item).toLowerCase().includes(normalized),
        )
      : items;

    return base.slice().sort((a, b) =>
      getLabel(a).localeCompare(getLabel(b), undefined, {
        sensitivity: "base",
        numeric: true,
      }),
    );
  }, [items, getLabel, normalized]);

  // Group items by category if getCategory is provided
  const groupedItems = useMemo(() => {
    if (!getCategory) {
      return { uncategorized: filtered };
    }

    const groups: Record<string, T[]> = {};
    for (const item of filtered) {
      const category = getCategory(item) ?? "uncategorized";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    }

    // Sort categories
    const sortedCategories = Object.keys(groups).sort((a, b) => {
      if (a === "uncategorized") return 1;
      if (b === "uncategorized") return -1;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });

    const result: Record<string, T[]> = {};
    for (const cat of sortedCategories) {
      result[cat] = groups[cat];
    }
    return result;
  }, [filtered, getCategory]);

  // Flatten for limit calculation
  const limitedFlat = filtered.slice(0, limit);
  const isCapped = filtered.length > limitedFlat.length;

  // Apply limit per category if categorizing
  const limitedGrouped = useMemo(() => {
    if (!getCategory) {
      return { uncategorized: limitedFlat };
    }

    const groups: Record<string, T[]> = {};
    let remaining = limit;
    const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
      if (a === "uncategorized") return 1;
      if (b === "uncategorized") return -1;
      return a.localeCompare(b, undefined, { sensitivity: "base" });
    });

    for (const cat of sortedCategories) {
      if (remaining <= 0) break;
      const items = groupedItems[cat];
      const take = Math.min(items.length, remaining);
      groups[cat] = items.slice(0, take);
      remaining -= take;
    }

    return groups;
  }, [getCategory, groupedItems, limitedFlat, limit]);

  const handleSelect = (key: string) => {
    const item = items.find((it) => getKey(it) === key);
    if (item && isItemDisabled?.(item)) return;
    onChange(item);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <MobileFullScreenDialogContent
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          if (shouldPreventAutoFocus) {
            event.preventDefault();
          }
        }}
      >
        <Command
          shouldFilter={false}
          className="flex h-full flex-col bg-background"
        >
          {/* Header */}
          {!isLandscape && (
            <div className="flex items-center justify-between border-b px-4 py-1">
              <div className="text-sm font-semibold">{title ?? "Select"}</div>
              <DialogClose asChild>
                <button
                  type="button"
                  className="cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>
          )}

          {/* Search */}
          <div className="border-b px-1 md:px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <CommandInput
                  autoFocus={shouldAutoFocus}
                  value={query}
                  onValueChange={setQuery}
                  placeholder={placeholder}
                  className="h-11 w-full"
                  rightSlot={inputRightSlot}
                />
              </div>
              {isLandscape && (
                <DialogClose asChild>
                  <button
                    type="button"
                    className="cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogClose>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <CommandList className="p-2 max-h-full">
              {filtered.length === 0 ? (
                <CommandEmpty>{emptyText}</CommandEmpty>
              ) : getCategory ? (
                Object.entries(limitedGrouped).map(
                  ([category, categoryItems]) => {
                    if (categoryItems.length === 0) return null;
                    return (
                      <CommandGroup
                        key={category}
                        heading={categoryLabel(category)}
                      >
                        {categoryItems.map((item) => {
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
                                disabled && "opacity-60",
                              )}
                            >
                              {renderItem ? renderItem(item) : label}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    );
                  },
                )
              ) : (
                limitedFlat.map((item) => {
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
                        disabled && "opacity-60",
                      )}
                    >
                      {renderItem ? renderItem(item) : label}
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
      </MobileFullScreenDialogContent>
    </Dialog>
  );
}

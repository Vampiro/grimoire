"use client";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { MobileSelect } from "./MobileSelect";

type BaseProps<T> = {
  items: T[];
  getLabel(item: T): string;
  getKey(item: T): string;
  value?: T;
  onChange?(item?: T): void;
  isItemDisabled?(item: T): boolean;
  placeholder?: string;
  emptyText?: string;
  limit?: number;
  className?: string;
  title?: string;
  getCategory?(item: T): string | undefined;
  categoryLabel?(category: string): string;
  open?: boolean;
  onOpenChange?(open: boolean): void;
  contentOnly?: boolean;
};

const DEFAULT_LIMIT = 200;

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () =>
      setIsMobile(mq.matches || navigator.maxTouchPoints > 0);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function SelectWithSearch<T>(props: BaseProps<T>) {
  const {
    items,
    getLabel,
    getKey,
    value,
    onChange,
    isItemDisabled,
    placeholder = "Select…",
    emptyText = "No results found.",
    limit = DEFAULT_LIMIT,
    className,
    title,
    getCategory,
    categoryLabel = (cat) => cat,
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    contentOnly = false,
  } = props;

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [query, setQuery] = useState("");
  const isMobile = useIsMobile();

  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const base = normalized
      ? items.filter((item) =>
          getLabel(item).toLowerCase().includes(normalized)
        )
      : items;
    return [...base].sort((a, b) =>
      getLabel(a).localeCompare(getLabel(b), undefined, {
        sensitivity: "base",
        numeric: true,
      })
    );
  }, [getLabel, items, normalized]);

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
    onChange?.(item);
    if (!contentOnly) {
      setOpen(false);
    }
  };

  const triggerLabel = value ? getLabel(value) : placeholder;

  const content = (
    <Command
      className="flex h-full flex-col bg-background"
      shouldFilter={false}
    >
      <CommandInput
        autoFocus
        value={query}
        onValueChange={setQuery}
        placeholder="Search..."
        className="h-12"
      />
      <ScrollArea className="flex-1 min-h-0 h-full">
        <CommandList className={`p-2 ${isMobile ? "max-h-none" : ""} h-full`}>
          {filtered.length === 0 ? (
            <CommandEmpty>{emptyText}</CommandEmpty>
          ) : getCategory ? (
            Object.entries(limitedGrouped).map(([category, categoryItems]) => {
              if (categoryItems.length === 0) return null;
              return (
                <CommandGroup key={category} heading={categoryLabel(category)}>
                  {categoryItems.map((item) => {
                    const key = getKey(item);
                    const disabled = isItemDisabled?.(item);
                    return (
                      <CommandItem
                        key={key}
                        value={key}
                        onSelect={handleSelect}
                        disabled={disabled}
                      >
                        {getLabel(item)}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })
          ) : (
            limitedFlat.map((item) => {
              const key = getKey(item);
              const disabled = isItemDisabled?.(item);
              return (
                <CommandItem
                  key={key}
                  value={key}
                  onSelect={handleSelect}
                  disabled={disabled}
                >
                  {getLabel(item)}
                </CommandItem>
              );
            })
          )}
        </CommandList>
      </ScrollArea>
      {isCapped && (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          Showing first {limit} results. Type to narrow further.
        </div>
      )}
    </Command>
  );

  const trigger = (
    <button
      type="button"
      className={cn(
        "flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm h-9 text-foreground",
        "dark:bg-input/30 dark:hover:bg-input/50",
        "transition-[color,box-shadow,background-color] outline-none cursor-pointer",
        "hover:bg-accent/50",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => setOpen(!open)}
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <span className="truncate">{triggerLabel}</span>
      <ChevronDownIcon className="h-4 w-4" />
    </button>
  );

  // If contentOnly, just return the content without Popover/trigger
  if (contentOnly) {
    return content;
  }

  if (isMobile) {
    return (
      <>
        {trigger}
        <MobileSelect
          open={open}
          onOpenChange={setOpen}
          items={items}
          value={value}
          onChange={(item) => onChange?.(item)}
          getLabel={getLabel}
          getKey={getKey}
          isItemDisabled={isItemDisabled}
          title={title}
          emptyText={emptyText}
          limit={limit}
          getCategory={getCategory}
          categoryLabel={categoryLabel}
        />
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="p-0 w-80" align="start" sideOffset={8}>
        {content}
      </PopoverContent>
    </Popover>
  );
}

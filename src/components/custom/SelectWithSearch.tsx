"use client";

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

type BaseProps<T> = {
  items: T[];
  getLabel(item: T): string;
  getKey(item: T): string;
  value?: T;
  onChange?(item?: T): void;
  placeholder?: string;
  emptyText?: string;
  limit?: number;
  className?: string;
};

const DEFAULT_LIMIT = 200;

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches || navigator.maxTouchPoints > 0);
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
    placeholder = "Select…",
    emptyText = "No results found.",
    limit = DEFAULT_LIMIT,
    className,
  } = props;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const isMobile = useIsMobile();

  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const base = normalized
      ? items.filter((item) => getLabel(item).toLowerCase().includes(normalized))
      : items;
    return [...base].sort((a, b) =>
      getLabel(a).localeCompare(getLabel(b), undefined, { sensitivity: "base" }),
    );
  }, [getLabel, items, normalized]);

  const limited = filtered.slice(0, limit);
  const isCapped = filtered.length > limited.length;

  const handleSelect = (key: string) => {
    const item = items.find((it) => getKey(it) === key);
    onChange?.(item);
    setOpen(false);
  };

  const triggerLabel = value ? getLabel(value) : placeholder;

  const content = (
    <Command className="flex h-full flex-col bg-background" shouldFilter={false}>
      <CommandInput
        autoFocus
        value={query}
        onValueChange={setQuery}
        placeholder="Search..."
        className="h-12"
      />
      <ScrollArea className="flex-1 min-h-0 h-full">
        <CommandList className={`p-2 ${ isMobile ? "max-h-none" : ""} h-full`}>
          {limited.length === 0 ? (
            <CommandEmpty>{emptyText}</CommandEmpty>
          ) : (
            limited.map((item) => {
              const key = getKey(item);
              return (
                <CommandItem key={key} value={key} onSelect={handleSelect}>
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
        "flex w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm",
        "hover:bg-accent/50",
        className,
      )}
      onClick={() => setOpen((v) => !v)}
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <span className="truncate">{triggerLabel}</span>
      <span className="text-muted-foreground text-xs">{isMobile ? "Open" : "▾"}</span>
    </button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="top"
          className="h-[100dvh] max-h-[100dvh] w-full rounded-none border-0 p-0"
        >
          {content}
        </SheetContent>
      </Sheet>
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

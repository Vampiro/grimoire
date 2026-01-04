import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { priestSpellsAtom, wizardSpellsAtom } from "@/globalState";
import { useAtomValue } from "jotai";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SpellSearchCombobox } from "./SpellSearchCombobox";

interface DndWikiSearchProps {
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function DndWikiSearch(props: DndWikiSearchProps) {
  const wizardSpells = useAtomValue(wizardSpellsAtom);
  const priestSpells = useAtomValue(priestSpellsAtom);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [contentWidthPx, setContentWidthPx] = useState<number>(288);

  const longestLabel = useMemo(() => {
    const labels: string[] = [];

    for (const spell of wizardSpells) {
      labels.push(`${spell.name} Wizard Level ${spell.level}`);
    }

    for (const spell of priestSpells) {
      labels.push(`${spell.name} Priest Level ${spell.level}`);
    }

    let longest = "";
    for (const label of labels) {
      if (label.length > longest.length) longest = label;
    }

    return longest;
  }, [priestSpells, wizardSpells]);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const style = window.getComputedStyle(el);
    const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.font = font;

    const textWidth = ctx.measureText(longestLabel).width;
    // Padding + gap + a bit of breathing room.
    const padded = Math.ceil(textWidth + 64);
    setContentWidthPx(Math.max(288, padded));
  }, [longestLabel]);

  return (
    <Popover open={props.open} onOpenChange={props.onOpenChange}>
      <PopoverTrigger className="p-2 rounded-full hover:bg-accent cursor-pointer">
        <Search className="h-5 w-5" onClick={() => props.onOpenChange(true)} />
      </PopoverTrigger>

      <span
        ref={measureRef}
        className="pointer-events-none absolute -z-10 opacity-0 text-sm"
      >
        {longestLabel}
      </span>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="max-w-[90vw] p-0"
        style={{ width: contentWidthPx }}
      >
        <SpellSearchCombobox closeMenu={() => props.onOpenChange(false)} />
      </PopoverContent>
    </Popover>
  );
}

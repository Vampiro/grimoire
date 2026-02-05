import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Search } from "lucide-react";
import { SelectWithSearch } from "./SelectWithSearch";
import { useAtomValue } from "jotai";
import { priestSpellsAtom, wizardSpellsAtom } from "@/globalState";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageRoute } from "@/pages/PageRoute";
import type { Spell } from "@/types/Spell";

interface DndWikiSearchProps {
  open: boolean;
  onOpenChange(open: boolean): void;
}

type SpellSearchEntry = {
  id: string;
  name: string;
  meta: string;
  spell: Spell;
};

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () =>
      setIsMobile(mq.matches || navigator.maxTouchPoints > 0);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function useIsLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(orientation: landscape)");
    const update = () => setIsLandscape(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener("change", update);
    } else {
      mq.addListener(update);
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener("change", update);
      } else {
        mq.removeListener(update);
      }
    };
  }, []);

  return isLandscape;
}

export function DndWikiSearch(props: DndWikiSearchProps) {
  const wizardSpells = useAtomValue(wizardSpellsAtom);
  const priestSpells = useAtomValue(priestSpellsAtom);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();

  const items = useMemo((): SpellSearchEntry[] => {
    const wizardEntries = wizardSpells.map((spell) => ({
      id: `wizard:${String(spell.id)}`,
      name: spell.name,
      meta: `Wizard Level ${spell.level}`,
      spell,
    }));

    const priestEntries = priestSpells.map((spell) => ({
      id: `priest:${String(spell.id)}`,
      name: spell.name,
      meta: `Priest Level ${spell.level}`,
      spell,
    }));

    return [...wizardEntries, ...priestEntries].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [priestSpells, wizardSpells]);

  const handleSelect = (entry?: SpellSearchEntry) => {
    if (!entry) return;
    props.onOpenChange(false);
    navigate(PageRoute.SPELL_VIEW(entry.spell.id));
  };

  const searchContent = (
    <SelectWithSearch
      items={items}
      getLabel={(item) => item.name}
      getKey={(item) => item.id}
      renderItem={(item) => (
        <div className="flex w-full items-start gap-3">
          <span className="min-w-0 flex-1 whitespace-normal break-words">
            {item.name}
          </span>
          <span className="text-muted-foreground shrink-0 text-right">
            {item.meta}
          </span>
        </div>
      )}
      onChange={handleSelect}
      placeholder="Search spells..."
      emptyText="No spells found."
      title="Search Spells"
      limit={200}
      contentOnly
      open={props.open}
      onOpenChange={props.onOpenChange}
      autoFocus={isMobile && !isLandscape}
      preventAutoFocus={isMobile && isLandscape}
    />
  );

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className="p-2 rounded-full hover:bg-accent cursor-pointer"
          onClick={() => props.onOpenChange(true)}
          aria-label="Search spells"
        >
          <Search className="h-5 w-5" />
        </button>
        {searchContent}
      </>
    );
  }

  return (
    <Popover open={props.open} onOpenChange={props.onOpenChange}>
      <PopoverTrigger className="p-2 rounded-full hover:bg-accent cursor-pointer">
        <Search className="h-5 w-5" onClick={() => props.onOpenChange(true)} />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[500px] max-w-[90vw] p-0"
      >
        {searchContent}
      </PopoverContent>
    </Popover>
  );
}

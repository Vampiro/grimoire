import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Search } from "lucide-react";
import { SpellSearchCombobox } from "./SpellSearchCombobox";

interface DndWikiSearchProps {
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function DndWikiSearch(props: DndWikiSearchProps) {
  return (
    <Popover open={props.open} onOpenChange={props.onOpenChange}>
      <PopoverTrigger className="p-2 rounded-full hover:bg-accent cursor-pointer">
        <Search className="h-5 w-5" onClick={() => props.onOpenChange(true)} />
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-72 p-0">
        <SpellSearchCombobox closeMenu={() => props.onOpenChange(false)} />
      </PopoverContent>
    </Popover>
  );
}

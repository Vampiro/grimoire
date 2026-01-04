import { useAtom } from "jotai";
import { activeSpellForViewerAtom } from "@/globalState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SpellViewer } from "./SpellViewer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSpellDescription } from "@/hooks/useSpellDescription";

/** Global spell viewer dialog driven by atoms. */
export function SpellViewerDialog() {
  const [activeSpell, setActiveSpell] = useAtom(activeSpellForViewerAtom);

  // Centralized description lookup so the dialog and the viewer body don't
  // duplicate the wizard/priest fallback logic.
  const { description } = useSpellDescription(activeSpell);

  const close = () => setActiveSpell(null);

  return (
    <Dialog open={!!activeSpell} onOpenChange={(open) => !open && close()}>
      <DialogContent className="h-[80vh] w-[90vw] max-w-none sm:max-w-none xl:max-w-[80vw] 2xl:max-w-[70vw] gap-4">
        {activeSpell && description && (
          <DialogHeader>
            <DialogTitle>{description.metadata.name}</DialogTitle>
            {/* Subtitle shown directly under the title in the dialog header. */}
            <div className="text-xs text-muted-foreground capitalize">
              {activeSpell.spellClass} Spell Level: {activeSpell.level}
            </div>
          </DialogHeader>
        )}
        <ScrollArea type="always">
          {activeSpell ? (
            <div className="p-4 pt-0">
              <SpellViewer spell={activeSpell} showTitle={false} />
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

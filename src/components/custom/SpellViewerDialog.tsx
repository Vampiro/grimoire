import { useAtom } from "jotai";
import { activeSpellForViewerAtom, spellDataStatusAtom } from "@/globalState";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SpellViewer } from "./SpellViewer";
import { ScrollArea } from "@/components/ui/scroll-area";

/** Global spell viewer dialog driven by atoms. */
export function SpellViewerDialog() {
  const [activeSpell, setActiveSpell] = useAtom(activeSpellForViewerAtom);
  const [spellStatus] = useAtom(spellDataStatusAtom);

  const close = () => setActiveSpell(null);

  return (
    <Dialog open={!!activeSpell} onOpenChange={(open) => !open && close()}>
      <DialogContent className="w-[96vw] max-w-none sm:max-w-none md:max-w-6xl lg:max-w-7xl h-[80vh] overflow-hidden grid-rows-[auto,1fr]">
        <ScrollArea type="always" className="h-full min-h-0 mt-6">
          {activeSpell ? (
            spellStatus.ready ? (
              <div className="p-4">
                <SpellViewer spell={activeSpell} />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Loading spell descriptions...
              </div>
            )
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

import { useAtom } from "jotai";
import { activeSpellForViewerAtom, spellDataStatusAtom } from "@/globalState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SpellViewer } from "./SpellViewer";

/** Global spell viewer dialog driven by atoms. */
export function SpellViewerDialog() {
  const [activeSpell, setActiveSpell] = useAtom(activeSpellForViewerAtom);
  const [spellStatus] = useAtom(spellDataStatusAtom);

  const close = () => setActiveSpell(null);

  return (
    <Dialog open={!!activeSpell} onOpenChange={(open) => !open && close()}>
      <DialogContent className="w-[96vw] max-w-none sm:max-w-none md:max-w-6xl lg:max-w-7xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activeSpell?.name ?? "Spell"}</DialogTitle>
          {activeSpell && (
            <DialogDescription>
              Level {activeSpell.level} {activeSpell.spellClass}
            </DialogDescription>
          )}
        </DialogHeader>
        {activeSpell ? (
          spellStatus.ready ? (
            <SpellViewer spell={activeSpell} />
          ) : (
            <div className="text-sm text-muted-foreground">
              Loading spell descriptions...
            </div>
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

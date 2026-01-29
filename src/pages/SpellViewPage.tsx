import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SpellViewer } from "@/components/custom/SpellViewer";
import { spellNotesAtom } from "@/globalState";
import { findPriestSpellById, findWizardSpellById } from "@/lib/spellLookup";
import { isSpellNoteEmpty } from "@/lib/spellNotes";

export function SpellViewPage() {
  const { spellId } = useParams();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const spellNotes = useAtomValue(spellNotesAtom);

  const spell = useMemo(() => {
    const id = Number(spellId);
    if (!Number.isFinite(id)) return null;
    return findWizardSpellById(id) ?? findPriestSpellById(id);
  }, [spellId]);

  const note = spell ? spellNotes[String(spell.id)] : undefined;
  const hasNote = !!note && !isSpellNoteEmpty(note);

  if (!spellId) {
    return <div>Missing spell id.</div>;
  }

  if (!spell) {
    return <div>No spell found with id {spellId}.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{spell.name}</h1>
          <p className="text-muted-foreground text-sm capitalize">
            {spell.spellClass} Spell Level: {spell.level}
          </p>
        </div>
        {!isEditingNote && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsEditingNote(true)}
          >
            {hasNote ? "Edit Note" : "Add Note"}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="space-y-4">
          <SpellViewer
            spell={spell}
            showTitle={false}
            noteEditing={isEditingNote}
            onNoteEditingChange={setIsEditingNote}
            hideNoteActionButton={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}

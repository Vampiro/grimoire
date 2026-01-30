import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SpellViewer } from "@/components/custom/SpellViewer";
import { spellDataStatusAtom, spellNotesAtom, userAtom } from "@/globalState";
import { findPriestSpellById, findWizardSpellById } from "@/lib/spellLookup";
import { isSpellNoteEmpty } from "@/lib/spellNotes";

export function SpellViewPage() {
  const { spellId } = useParams();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const user = useAtomValue(userAtom);
  const spellStatus = useAtomValue(spellDataStatusAtom);
  const spellNotes = useAtomValue(spellNotesAtom);

  const spell = useMemo(() => {
    if (!spellStatus.ready) return null;
    const id = Number(spellId);
    if (!Number.isFinite(id)) return null;
    return findWizardSpellById(id) ?? findPriestSpellById(id);
  }, [spellId, spellStatus.ready]);

  const note = spell ? spellNotes[String(spell.id)] : undefined;
  const hasNote = !!note && !isSpellNoteEmpty(note);
  const canEditNotes = !!user;

  useEffect(() => {
    if (!canEditNotes && isEditingNote) {
      setIsEditingNote(false);
    }
  }, [canEditNotes, isEditingNote]);

  if (!spellId) {
    return <div>Missing spell id.</div>;
  }

  if (!spellStatus.ready) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading spell data...
      </div>
    );
  }

  if (spellStatus.error) {
    return (
      <div className="text-sm text-destructive">{spellStatus.error}</div>
    );
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
        {canEditNotes && !isEditingNote && (
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
            noteEditing={canEditNotes ? isEditingNote : false}
            onNoteEditingChange={canEditNotes ? setIsEditingNote : undefined}
            hideNoteActionButton={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}

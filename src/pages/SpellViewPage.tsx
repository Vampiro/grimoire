import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SpellViewer } from "@/components/custom/SpellViewer";
import {
  favoriteSpellIdsAtom,
  spellDataStatusAtom,
  spellNotesAtom,
  userAtom,
} from "@/globalState";
import { findPriestSpellById, findWizardSpellById } from "@/lib/spellLookup";
import { isSpellNoteEmpty } from "@/lib/spellNotes";
import { getSpellLevelDisplay } from "@/lib/spellLevels";
import {
  addUserFavoriteSpell,
  removeUserFavoriteSpell,
} from "@/firebase/userSettings";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function SpellViewPage() {
  const { spellId } = useParams();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const user = useAtomValue(userAtom);
  const spellStatus = useAtomValue(spellDataStatusAtom);
  const spellNotes = useAtomValue(spellNotesAtom);
  const favoriteSpellIds = useAtomValue(favoriteSpellIdsAtom);
  const navigate = useNavigate();
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const location = useLocation();
  const locState = location.state as
    | undefined
    | { showBack?: boolean; from?: string };
  const showBack = !!locState?.showBack;

  const spell = useMemo(() => {
    if (!spellStatus.ready) return null;
    const id = Number(spellId);
    if (!Number.isFinite(id)) return null;
    return findWizardSpellById(id) ?? findPriestSpellById(id);
  }, [spellId, spellStatus.ready]);

  const note = spell ? spellNotes[String(spell.id)] : undefined;
  const hasNote = !!note && !isSpellNoteEmpty(note);
  const canEditNotes = !!user;
  const isFavorite = spell
    ? favoriteSpellIds.includes(String(spell.id))
    : false;

  useEffect(() => {
    if (!canEditNotes && isEditingNote) {
      setIsEditingNote(false);
    }
  }, [canEditNotes, isEditingNote]);

  useEffect(() => {
    setIsEditingNote(false);
  }, [spell?.id]);

  const handleToggleFavorite = async () => {
    if (!user || !spell || favoriteSaving) return;
    setFavoriteSaving(true);
    try {
      if (isFavorite) {
        await removeUserFavoriteSpell(user.uid, String(spell.id));
      } else {
        await addUserFavoriteSpell(user.uid, String(spell.id));
      }
    } finally {
      setFavoriteSaving(false);
    }
  };

  if (!spellId) {
    return <div>Missing spell id.</div>;
  }

  if (!spellStatus.ready) {
    return (
      <div className="text-sm text-muted-foreground">Loading spell data...</div>
    );
  }

  if (spellStatus.error) {
    return <div className="text-sm text-destructive">{spellStatus.error}</div>;
  }

  if (!spell) {
    return <div>No spell found with id {spellId}.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold leading-tight">
            <span>{spell.name}</span>
            {user && (
              <>
                {"\u00A0"}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleToggleFavorite}
                  disabled={favoriteSaving}
                  aria-label={
                    isFavorite ? "Remove from favorites" : "Add to favorites"
                  }
                  className="h-7 w-7 inline-flex align-baseline -translate-y-px"
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      isFavorite
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-muted-foreground",
                    )}
                  />
                </Button>
              </>
            )}
          </h1>
          <p className="text-muted-foreground text-sm capitalize">
            {spell.spellClass} Spell Level: {getSpellLevelDisplay(spell)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
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
          {showBack && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          )}
        </div>
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

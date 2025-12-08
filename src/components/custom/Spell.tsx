import { fetchSpell, WikiPageJson } from "@/data/wikiFetch";
import { Spell } from "@/types/Spell";
import { useState, useEffect } from "react";

interface SpellViewerProps {
  spell: Spell;
}

/**
 * Displays a spell by fetching its wiki data
 */
export default function SpellViewer({ spell }: SpellViewerProps) {
  const [data, setData] = useState<WikiPageJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    async function loadSpell() {
      setLoading(true);
      setError(null);
      try {
        const spellData = await fetchSpell(spell);
        if (!canceled) setData(spellData);
      } catch (err: any) {
        if (!canceled) setError(err.message || "Failed to fetch spell");
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    loadSpell();

    return () => {
      canceled = true;
    };
  }, [spell]);

  if (loading) return <p>Loading {spell.name}...</p>;
  if (error)
    return (
      <p>
        Error loading {spell.name}: {error}
      </p>
    );

  console.log(data);

  return (
    <div className="p-4 border rounded-md bg-card text-card-foreground">
      <h2 className="text-xl font-bold">{spell.name}</h2>
      <p>Class: {spell.class}</p>
      <p>Level: {spell.level}</p>
      <div
        className="mt-2 [&_p]:my-3 [&_h1]:text-3xl [&_h2]:text-2xl [&_h3]:text-xl [&_h4]:text-lg [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: data?.description || "" }}
      />
    </div>
  );
}

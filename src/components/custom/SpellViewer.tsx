import { fetchSpell, WikiPageJson } from "@/wikiFetch";
import { Spell } from "@/types/Spell";
import { useState, useEffect, Fragment } from "react";

interface SpellViewerProps {
  spell: Spell;
}

/**
 *
 * @param props Component props.
 * @returns
 */
export function SpellViewer(props: SpellViewerProps) {
  const { spell } = props;
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

  if (data) {
    data.sections;

    return (
      <div className="p-4 border rounded-md bg-card text-card-foreground">
        <div className="grid grid-cols-[400px_1fr] gap-4">
          <div className="border-r border-border pr-4">
            <SpellSections name={spell.name} sections={data.sections} />
          </div>
          <div>
            <div
              className="mt-2 [&_p]:my-3 [&_h1]:text-3xl [&_h2]:text-2xl [&_h3]:text-xl [&_h4]:text-lg [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: data?.description || "" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return <div>No data.</div>;
}

const SpellSections = ({
  name,
  sections,
}: {
  name: string;
  sections: WikiPageJson["sections"];
}) => {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-4">{name}</h2>
      <div
        className="grid grid-cols-[minmax(0,max-content)_1fr] gap-x-4 gap-y-2"
        style={{ height: "fit-content" }}
      >
        {Object.entries(sections).map(([sectionName, items]) => (
          <Fragment key={sectionName}>
            {items.map((item) => (
              <Fragment key={item.label}>
                <div className="font-semibold" style={{ maxWidth: 150 }}>
                  {item.label}
                </div>
                <div className="break-words">{item.value}</div>
              </Fragment>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

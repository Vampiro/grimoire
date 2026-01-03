import { Spell } from "@/types/Spell";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useMemo } from "react";
import { useAtomValue } from "jotai";
import {
  priestSpellDescriptionsAtom,
  spellDataStatusAtom,
  wizardSpellDescriptionsAtom,
} from "@/globalState";
import type { SpellDescriptionJson } from "@/types/Resources";
import "./SpellViewer.css";

interface SpellViewerProps {
  spell: Spell;
}

/**
 * Displays detailed information about a spell, including its description and metadata.
 *
 * @param props - The component props
 * @param props.spell - The spell to display
 * @returns The SpellViewer component
 */
export function SpellViewer(props: SpellViewerProps) {
  const { spell } = props;
  const wizardDescriptions = useAtomValue(wizardSpellDescriptionsAtom);
  const priestDescriptions = useAtomValue(priestSpellDescriptionsAtom);
  const spellStatus = useAtomValue(spellDataStatusAtom);

  const description: SpellDescriptionJson | undefined = useMemo(() => {
    const key = String(spell.id);
    if (spell.spellClass === "wizard") {
      return wizardDescriptions[key] ?? priestDescriptions[key];
    }
    if (spell.spellClass === "priest") {
      return priestDescriptions[key] ?? wizardDescriptions[key];
    }
    return wizardDescriptions[key] ?? priestDescriptions[key];
  }, [priestDescriptions, spell.id, spell.spellClass, wizardDescriptions]);

  const metadataEntries = useMemo(() => {
    if (!description) return [] as Array<[string, string]>;
    return Object.entries(description.metadata)
      .filter(([, v]) => v !== undefined && String(v).trim().length > 0)
      .map(([k, v]) => [k.trim(), String(v ?? "").trim()] as [string, string])
      .filter(([k, v]) => k.length > 0 && v.length > 0 && k !== "name")
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [description]);

  const sectionEntries = useMemo(() => {
    if (!description) return [] as Array<[string, string]>;
    // Preserve section order from source; do not sort.
    return Object.entries(description.sections)
      .map(([k, v]) => [k.trim(), String(v ?? "").trim()] as [string, string])
      .filter(([k, v]) => k.length > 0 && v.length > 0);
  }, [description]);

  const formatValue = (value: string) =>
    value.replace(/<br\s*\/?>(\s*)/gi, "\n").trim();

  if (!spellStatus.ready) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading spell descriptions...
      </div>
    );
  }

  if (!description) {
    return (
      <div className="text-sm text-muted-foreground">
        No description found for {spell.name} (page {spell.id}).
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-lg font-semibold leading-tight">
          {description.metadata.name}
        </div>
        <div className="text-xs text-muted-foreground">
          {spell.spellClass.toUpperCase()} · Level {spell.level} · page{" "}
          {spell.id}
        </div>
        {description.wikiLink && (
          <div className="text-xs text-muted-foreground">
            Source: {description.wikiLink}
          </div>
        )}
      </div>

      {metadataEntries.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold">Details</div>
          <Table>
            <TableBody>
              {metadataEntries.map(([k, v]) => (
                <TableRow key={k}>
                  <TableCell className="w-px pr-4 font-medium text-muted-foreground whitespace-nowrap">
                    {k}
                  </TableCell>
                  <TableCell className="whitespace-pre-wrap break-words">
                    {formatValue(v)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {sectionEntries.length > 0 ? (
        <div className="space-y-6">
          {sectionEntries.map(([heading, content], index) => (
            <section key={`${heading}-${index}`} className="space-y-2">
              <div
                className="prose prose-sm max-w-none text-sm leading-relaxed break-words"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </section>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          No page sections available.
        </div>
      )}
    </div>
  );
}

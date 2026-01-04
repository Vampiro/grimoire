import { Spell } from "@/types/Spell";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useMemo } from "react";
import { useSpellDescription } from "@/hooks/useSpellDescription";
import "./SpellViewer.css";

interface SpellViewerProps {
  /** The spell to render. */
  spell: Spell;

  /**
   * Whether to show the viewer's internal title block.
   *
   * @remarks
   * Some callers (like the global dialog) render the title in a `DialogHeader`
   * and want the body content to omit it to avoid duplication.
   */
  showTitle?: boolean;
}

/**
 * Displays detailed information about a spell, including its description and metadata.
 *
 * @param props - The component props
 * @param props.spell - The spell to display
 * @returns The SpellViewer component
 */
export function SpellViewer(props: SpellViewerProps) {
  const { spell, showTitle = true } = props;

  // Centralized description lookup + "ready" status (avoids duplicating
  // wizard/priest map fallback logic in multiple components).
  const { ready, description } = useSpellDescription(spell);

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

  if (!ready) {
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
        {/* Optional header area; can be suppressed when the caller provides a title. */}
        {showTitle && (
          <>
            <div className="text-lg font-semibold leading-tight">
              {description.metadata.name}
            </div>
            {/* Small subtitle line requested for both dialog + inline viewer. */}
            <div className="text-xs text-muted-foreground capitalize">
              {spell.spellClass} Spell Level: {spell.level}
            </div>
          </>
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

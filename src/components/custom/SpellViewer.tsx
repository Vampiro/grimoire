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

    const m = description.metadata;
    const entries: Array<[string, string | React.ReactNode]> = [];

    const add = (label: string, value: unknown) => {
      if (value === undefined || value === null) return;
      const text = String(value).trim();
      if (text.length === 0) return;
      entries.push([label, text]);
    };

    const addNode = (label: string, node: React.ReactNode) => {
      entries.push([label, node]);
    };

    // Known metadata fields (ordered).
    // Note: name/class/level are shown elsewhere (title/subtitle), so we omit them here.

    add("School", m.school);
    add("Sphere", m.sphere);
    add("Range", m.range);
    add("Duration", m.duration);
    add("AOE", m.aoe);
    add("Save", m.save);
    add("Preparation Time", m.preparationTime);
    add("Casting Time", m.castingTime);

    // Requirements row: includes V/S/M and any additional notes.
    const requirementParts: React.ReactNode[] = [];
    if (String(m.quest ?? "").trim() === "1") {
      // Some pages flag spells as "Quest".
      requirementParts.push("Quest");
    }

    if (m.verbal) requirementParts.push("V");
    if (m.somatic) requirementParts.push("S");
    if (m.material) requirementParts.push("M");

    const explicitRequirements = String(m.requirements ?? "").trim();
    if (explicitRequirements.length > 0) {
      requirementParts.push(explicitRequirements);
    }

    if (requirementParts.length > 0) {
      const formatted = requirementParts.flatMap((part, index) =>
        index === 0 ? [part] : [", ", part],
      );
      addNode("Requirements", <span>{formatted}</span>);
    }

    add("Source", m.source);

    // PO: Spells & Magic
    add("Subtlety", m.subtlety);
    add("Knockdown", m.knockdown);
    add("Sensory", m.sensory);
    add("Critical", m.critical);

    return entries;
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
    <div className="space-y-4">
      {/* Optional header area; can be suppressed when the caller provides a title. */}
      {showTitle && (
        <div className="space-y-1">
          <div className="text-lg font-semibold leading-tight">
            {description.metadata.name}
          </div>
          {/* Small subtitle line requested for both dialog + inline viewer. */}
          <div className="text-xs text-muted-foreground capitalize">
            {spell.spellClass} Spell Level: {spell.level}
          </div>
        </div>
      )}

      {metadataEntries.length > 0 && (
        <div className="space-y-2">
          <Table>
            <TableBody className="[&_tr:last-child]:border-b">
              {metadataEntries.map(([k, v]) => (
                <TableRow key={k}>
                  <TableCell className="w-px pr-4 font-medium text-muted-foreground whitespace-nowrap">
                    {k}
                  </TableCell>
                  <TableCell className="whitespace-pre-wrap break-words">
                    {typeof v === "string" ? formatValue(v) : v}
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

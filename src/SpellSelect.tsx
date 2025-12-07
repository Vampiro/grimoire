import { Combobox } from "@/components/custom/Combobox";
import { Spell } from "./types/Spell";

interface SpellSelectProps {
  spells: Spell[];
  value: Spell | undefined;
  onChange(val: Spell | undefined): void;
}

export function SpellSelect(props: SpellSelectProps) {
  return (
    <Combobox<Spell>
      items={props.spells}
      getKey={(s) => s.name}
      getLabel={(s) => s.name}
      value={props.value}
      onChange={props.onChange}
      placeholder="Select a spell..."
    />
  );
}

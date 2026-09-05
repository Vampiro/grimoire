import { CharacterClass, PreparedCasterProgression } from "./ClassProgression";

export interface PriestClassProgression extends PreparedCasterProgression {
  /** The priest class. */
  className: CharacterClass.PRIEST;
  /** Set-like map of priest spell ids available for preparation. */
  knownSpellsById?: Record<string, true>;
  /** Major access spheres (all spell levels). */
  majorSpheres?: string[];
  /** Minor access spheres (levels 1-3 only). */
  minorSpheres?: string[];
}

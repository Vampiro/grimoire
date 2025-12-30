import {
  PriestClassProgression,
  WizardClassProgression,
} from "./ClassProgression";

/**
 * Represents a single D&D character.
 */
export interface Character {
  id: string; // Firestore doc ID
  name: string; // Character name
  class: {
    priest?: PriestClassProgression;
    wizard?: WizardClassProgression;
  };
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

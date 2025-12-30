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
  classes: (WizardClassProgression | PriestClassProgression)[]; // e.g., [{ className: "Wizard", ...wizard_details }]
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

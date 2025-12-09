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
  /**
   * Starts at 1. Every time it is updated (update sent to database), it should be sent as the previous revision + 1.
   * This will be enforced as a Firebase rule to ensure things don't get out of sync between devices.
   */
  revision: number;
}

/**
 * Represents a single D&D character.
 */
export interface Character {
  id: string; // Firestore doc ID
  name: string; // Character name
  class: string; // e.g., "Wizard"
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

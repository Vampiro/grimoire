// Only install DOM matchers when a DOM exists.
// This keeps Node-environment unit tests (e.g. generator tooling) working.
const hasWindow =
  typeof (globalThis as { window?: unknown }).window !== "undefined";

if (hasWindow) {
  void import("@testing-library/jest-dom/vitest");
}

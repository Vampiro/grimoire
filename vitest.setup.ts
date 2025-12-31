// Only install DOM matchers when a DOM exists.
// This keeps Node-environment unit tests (e.g. generator tooling) working.
if (typeof window !== "undefined") {
	void import("@testing-library/jest-dom/vitest");
}

import "@testing-library/jest-dom/vitest";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { charactersAtom, priestSpellsAtom, store } from "@/globalState";
import {
  addPriestKnownSpell,
  removePriestKnownSpell,
} from "@/firebase/characters";
import { CharacterClass } from "@/types/ClassProgression";
import { PriestKnownSpellsPage } from "./PriestKnownSpellsPage";
import { PriestPrepareSpellsPage } from "./PriestPrepareSpellsPage";

vi.mock("@/firebase/characters", () => ({
  addPriestKnownSpell: vi.fn().mockResolvedValue(undefined),
  removePriestKnownSpell: vi.fn().mockResolvedValue(undefined),
  refreshCharacters: vi.fn().mockResolvedValue(undefined),
  updatePriestPreparedSpellsLevel: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/resourceCache", () => ({ getResourceCached: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  Element.prototype.scrollIntoView = vi.fn();
  store.set(charactersAtom, [
    {
      id: "priest",
      name: "Priest",
      createdAt: 0,
      updatedAt: 0,
      class: {
        priest: {
          className: CharacterClass.PRIEST,
          level: 1,
          preparedSpells: {},
          knownSpellsById: { "1": true },
        },
      },
    },
  ]);
  store.set(priestSpellsAtom, [
    { id: 1, name: "Bless", level: 1, spellClass: "priest" },
    { id: 2, name: "Command", level: 1, spellClass: "priest" },
  ]);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function showPage(path = "/characters/priest/priest/known_spells") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/characters/:characterId/priest/known_spells"
          element={<PriestKnownSpellsPage />}
        />
        <Route
          path="/characters/:characterId/priest/prepare"
          element={<PriestPrepareSpellsPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function updateKnown(known: Record<string, true>) {
  act(() =>
    store.set(
      charactersAtom,
      store.get(charactersAtom).map((c) => ({
        ...c,
        class: { priest: { ...c.class.priest!, knownSpellsById: known } },
      })),
    ),
  );
}

it("adds a spell through search, reflects saved knowledge, and removes it in delete mode", async () => {
  showPage();
  expect(
    await screen.findByRole("heading", { name: "Known Spells (1)" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Add Known Spell" }));
  expect(
    (await screen.findByRole("option", { name: "Bless (known)" })).getAttribute(
      "aria-disabled",
    ),
  ).toBe("true");
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "Command" },
  });
  fireEvent.click(await screen.findByRole("option", { name: "Command" }));
  await waitFor(() =>
    expect(addPriestKnownSpell).toHaveBeenCalledWith("priest", 2),
  );
  updateKnown({ "1": true, "2": true });
  expect(
    await screen.findByRole("heading", { name: "Known Spells (2)" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Known spells options" }));
  fireEvent.click(await screen.findByRole("switch", { name: "Delete Mode" }));
  fireEvent.keyDown(screen.getByRole("switch", { name: "Delete Mode" }), {
    key: "Escape",
  });
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Remove Command from known spells",
    }),
  );
  await waitFor(() =>
    expect(removePriestKnownSpell).toHaveBeenCalledWith("priest", 2),
  );
  updateKnown({ "1": true });
  expect(
    await screen.findByRole("heading", { name: "Known Spells (1)" }),
  ).toBeTruthy();
});

it("offers only known spells for preparation", async () => {
  showPage("/characters/priest/priest/prepare");
  fireEvent.click(
    await screen.findByRole("button", { name: "Add prepared spell" }),
  );
  expect(await screen.findByRole("option", { name: "Bless" })).toBeTruthy();
  expect(screen.queryByRole("option", { name: "Command" })).toBeNull();
});

it("shows an empty list after removal of the last known spell", async () => {
  updateKnown({});
  showPage();
  expect(await screen.findByText("No known spells yet.")).toBeTruthy();
  cleanup();
  showPage("/characters/priest/priest/prepare");
  expect(
    await screen.findByText(/Add spells to Known Spells before preparing them/),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Add prepared spell" }));
  expect(screen.queryByRole("option")).toBeNull();
});

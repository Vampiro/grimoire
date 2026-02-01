// @vitest-environment node
import { describe, expect, it } from "vitest";
import { fetchAllCategoryMembers } from "./categoryMembersApi";

describe("fetchAllCategoryMembers", () => {
  it("paginates using cmcontinue until exhausted", async () => {
    const calls: string[] = [];

    const fetchFn = (async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : ((input as { url?: string }).url ?? String(input));

      calls.push(url);

      // First page
      if (calls.length === 1) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            continue: { cmcontinue: "NEXT", continue: "-||" },
            query: {
              categorymembers: [{ pageid: 1, ns: 0, title: "A" }],
            },
          }),
        } as unknown as Response;
      }

      // Second (final) page
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({
          query: {
            categorymembers: [{ pageid: 2, ns: 0, title: "B" }],
          },
        }),
      } as unknown as Response;
    }) satisfies typeof fetch;

    const out = await fetchAllCategoryMembers(
      {
        categoryName: "Wizard Spells",
        categoryTitle: "Category:Wizard_Spells",
        maxRequestsPerSecond: 1000,
      },
      fetchFn,
    );

    expect(out.categoryName).toBe("Wizard Spells");
    expect(out.categoryMembers).toEqual([
      { pageid: 1, title: "A" },
      { pageid: 2, title: "B" },
    ]);

    expect(calls.length).toBe(2);
    expect(calls[0]).toContain("cmtitle=Category%3AWizard_Spells");
    expect(calls[1]).toContain("cmcontinue=NEXT");
  });
});

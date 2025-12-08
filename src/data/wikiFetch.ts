import { Spell } from "@/types/Spell";

export interface WikiPageJson {
  name: string;
  sections: Record<string, { label: string; value: string }[]>;
  description: string;
}

const serverProxyBaseUrl = import.meta.env.VITE_PROXY_BASE_URL;

/**
 * Fetches a spell from the AD&D 2e wiki via your Vercel proxy.
 *
 * @param spell The spell to fetch.
 * @returns The parsed JSON from the Fandom API
 */
export async function fetchSpell(spell: Spell): Promise<WikiPageJson> {
  const spellPage = getSpellPageFromLink(spell.link);
  const encodedName = encodeURIComponent(spellPage);
  const url = `${serverProxyBaseUrl}/api/adnd2ewiki/${encodedName}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch spell: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data as WikiPageJson;
}

/**
 * Extracts the AD&D 2e wiki page name from a full spell link.
 *
 * @param link - Full spell URL (e.g., "https://adnd2e.fandom.com/wiki/Alert_Vigil_(Priest_Spell)")
 * @returns The page name to use in the API (e.g., "Alert_Vigil_(Priest_Spell)")
 */
export function getSpellPageFromLink(link: string): string {
  try {
    const url = new URL(link);
    if (!url.pathname.startsWith("/wiki/")) {
      throw new Error("Invalid AD&D 2e wiki URL");
    }
    // Remove the "/wiki/" prefix
    return url.pathname.replace("/wiki/", "");
  } catch (err) {
    console.error("Failed to parse spell page from link:", link, err);
    throw err;
  }
}

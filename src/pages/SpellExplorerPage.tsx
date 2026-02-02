import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAtomValue } from "jotai";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  priestSpellDescriptionsAtom,
  priestSpellsAtom,
  spellDataStatusAtom,
  wizardSpellDescriptionsAtom,
  wizardSpellsAtom,
} from "@/globalState";
import { cn } from "@/lib/utils";
import { PageRoute } from "@/pages/PageRoute";
import type { Spell } from "@/types/Spell";

const LEVEL_MIN = 0;
const LEVEL_MAX = 9;

const SPHERE_OPTIONS = [
  "All",
  "Animal",
  "Astral",
  "Charm",
  "Chaos",
  "Combat",
  "Cosmos",
  "Creation",
  "Divination",
  "Elemental",
  "Elemental Air",
  "Elemental Earth",
  "Elemental Fire",
  "Elemental Silt",
  "Elemental Water",
  "Guardian",
  "Healing",
  "Law",
  "Necromantic",
  "Numbers",
  "Plant",
  "Protection",
  "Summoning",
  "Sun",
  "Thought",
  "Time",
  "Travelers",
  "War",
  "Wards",
  "Weather",
  "Unknown",
];

const SPHERE_SORT = new Map(
  SPHERE_OPTIONS.map((sphere, index) => [sphere, index]),
);

const DEFAULT_PAGE_SIZE = 15;

type SortKey = "level" | "name" | "class" | "sphere";
type SortDirection = "asc" | "desc";

type ExplorerSpell = Spell & {
  spheres: string[];
};

const clampLevel = (value: number) =>
  Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, value));

const parseLevel = (value: string | null, fallback: number) => {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampLevel(parsed) : fallback;
};

const parsePositiveInt = (value: string | null, fallback: number) => {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const normalizeSpheres = (values: string[]) =>
  values
    .filter((value) => SPHERE_SORT.has(value))
    .sort((a, b) => {
      const aIndex = SPHERE_SORT.get(a) ?? 0;
      const bIndex = SPHERE_SORT.get(b) ?? 0;
      return aIndex === bIndex ? a.localeCompare(b) : aIndex - bIndex;
    });

const compareStrings = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: "base" });

export function SpellExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const spellStatus = useAtomValue(spellDataStatusAtom);
  const wizardSpells = useAtomValue(wizardSpellsAtom);
  const priestSpells = useAtomValue(priestSpellsAtom);
  const wizardDescriptions = useAtomValue(wizardSpellDescriptionsAtom);
  const priestDescriptions = useAtomValue(priestSpellDescriptionsAtom);

  const filters = useMemo(() => {
    const priestParam = searchParams.get("priest");
    const wizardParam = searchParams.get("wizard");
    const minParam = searchParams.get("min");
    const maxParam = searchParams.get("max");
    const spheresParam = searchParams.get("spheres");
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("perPage");

    const priest = priestParam ? priestParam !== "0" : true;
    const wizard = wizardParam ? wizardParam !== "0" : true;
    const min = parseLevel(minParam, LEVEL_MIN);
    const max = parseLevel(maxParam, LEVEL_MAX);
    const levelMin = Math.min(min, max);
    const levelMax = Math.max(min, max);

    const spheres = spheresParam
      ? normalizeSpheres(
          spheresParam
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        )
      : [];

    return {
      priest,
      wizard,
      levelMin,
      levelMax,
      spheres,
      page: parsePositiveInt(pageParam, 1),
      pageSize: parsePositiveInt(pageSizeParam, DEFAULT_PAGE_SIZE),
    };
  }, [searchParams]);

  const [sort, setSort] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({ key: "level", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [levelRange, setLevelRange] = useState<[number, number]>([
    LEVEL_MIN,
    LEVEL_MAX,
  ]);
  const tableTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLevelRange([filters.levelMin, filters.levelMax]);
  }, [filters.levelMin, filters.levelMax]);

  useEffect(() => {
    setPage(filters.page);
    setPageSize(filters.pageSize);
  }, [filters.page, filters.pageSize]);

  useEffect(() => {
    const hasPage = searchParams.has("page");
    const hasPerPage = searchParams.has("perPage");
    if (hasPage && hasPerPage) return;

    const params = new URLSearchParams(searchParams);
    if (!hasPage) params.set("page", "1");
    if (!hasPerPage) params.set("perPage", String(DEFAULT_PAGE_SIZE));
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const updateParams = (
    next: Partial<typeof filters> & { page?: number; pageSize?: number },
  ) => {
    const params = new URLSearchParams(searchParams);
    const priest = next.priest ?? filters.priest;
    const wizard = next.wizard ?? filters.wizard;
    const levelMin = next.levelMin ?? filters.levelMin;
    const levelMax = next.levelMax ?? filters.levelMax;
    const spheres = next.spheres ?? filters.spheres;
    const nextPage = next.page ?? filters.page;
    const nextPageSize = next.pageSize ?? filters.pageSize;

    params.set("priest", priest ? "1" : "0");
    params.set("wizard", wizard ? "1" : "0");
    params.set("min", String(levelMin));
    params.set("max", String(levelMax));
    params.set("page", String(nextPage));
    params.set("perPage", String(nextPageSize));

    if (spheres.length > 0) {
      params.set("spheres", normalizeSpheres(spheres).join(","));
    } else {
      params.delete("spheres");
    }

    setSearchParams(params, { replace: true });
  };

  const allSpells = useMemo<ExplorerSpell[]>(() => {
    const rows: ExplorerSpell[] = [];

    for (const spell of wizardSpells) {
      const metadata = wizardDescriptions[String(spell.id)]?.metadata;
      rows.push({
        ...spell,
        spheres: metadata?.spheres ?? [],
      });
    }

    for (const spell of priestSpells) {
      const metadata = priestDescriptions[String(spell.id)]?.metadata;
      rows.push({
        ...spell,
        spheres: metadata?.spheres ?? [],
      });
    }

    return rows;
  }, [wizardSpells, priestSpells, wizardDescriptions, priestDescriptions]);

  const filteredSpells = useMemo(() => {
    return allSpells.filter((spell) => {
      if (!filters.priest && spell.spellClass === "priest") return false;
      if (!filters.wizard && spell.spellClass === "wizard") return false;
      if (spell.level < filters.levelMin || spell.level > filters.levelMax)
        return false;
      if (filters.spheres.length > 0) {
        if (!spell.spheres?.length) return false;
        const hasMatch = spell.spheres.some((sphere) =>
          filters.spheres.includes(sphere),
        );
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [allSpells, filters]);

  const sortedSpells = useMemo(() => {
    const next = [...filteredSpells];
    const direction = sort.direction === "asc" ? 1 : -1;

    next.sort((a, b) => {
      let cmp = 0;
      switch (sort.key) {
        case "level":
          cmp = a.level - b.level;
          break;
        case "name":
          cmp = compareStrings(a.name, b.name);
          break;
        case "class":
          cmp = compareStrings(a.spellClass, b.spellClass);
          break;
        case "sphere": {
          const aSphere = a.spheres?.join(", ") ?? "";
          const bSphere = b.spheres?.join(", ") ?? "";
          cmp = compareStrings(aSphere, bSphere);
          break;
        }
        default:
          cmp = 0;
      }

      if (cmp !== 0) {
        return cmp * direction;
      }

      const levelCmp = a.level - b.level;
      if (levelCmp !== 0) return levelCmp;

      return compareStrings(a.name, b.name);
    });

    return next;
  }, [filteredSpells, sort]);

  const pageCount = Math.max(1, Math.ceil(sortedSpells.length / pageSize));

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const pagedSpells = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedSpells.slice(start, start + pageSize);
  }, [page, pageSize, sortedSpells]);

  const toggleSphere = (sphere: string) => {
    const next = new Set(filters.spheres);
    if (next.has(sphere)) {
      next.delete(sphere);
    } else {
      next.add(sphere);
    }
    updateParams({
      spheres: normalizeSpheres(Array.from(next)),
      page: 1,
    });
  };

  const handleSort = (key: SortKey) => {
    setSort((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
    updateParams({ page: 1 });
  };

  const sortIcon = (key: SortKey) => {
    if (sort.key !== key) return null;
    return sort.direction === "asc" ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  if (spellStatus.loading && !spellStatus.ready) {
    return <div>Loading spell data...</div>;
  }

  if (spellStatus.error) {
    return <div className="text-sm text-destructive">{spellStatus.error}</div>;
  }

  const showSphereColumn = filteredSpells.some(
    (spell) => spell.spheres && spell.spheres.length > 0,
  );
  const columnCount = showSphereColumn ? 4 : 3;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Spell Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Browse and filter wizard and priest spells.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <Card className="lg:w-72 py-0">
          <CardContent className="space-y-4 pt-4 pb-2">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Classes
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="filter-priest">Priest</Label>
                <Switch
                  id="filter-priest"
                  checked={filters.priest}
                  onCheckedChange={(checked) =>
                    updateParams({ priest: checked, page: 1 })
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="filter-wizard">Wizard</Label>
                <Switch
                  id="filter-wizard"
                  checked={filters.wizard}
                  onCheckedChange={(checked) =>
                    updateParams({ wizard: checked, page: 1 })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Level Range
              </div>
              <div className="text-sm text-muted-foreground">
                {levelRange[0]} to {levelRange[1]}
              </div>
              <Slider
                value={levelRange}
                min={LEVEL_MIN}
                max={LEVEL_MAX}
                step={1}
                onValueChange={(value) => {
                  const [min, max] = value;
                  setLevelRange([
                    clampLevel(Math.min(min, max)),
                    clampLevel(Math.max(min, max)),
                  ]);
                }}
                onValueCommit={(value) => {
                  const [min, max] = value;
                  updateParams({
                    levelMin: clampLevel(Math.min(min, max)),
                    levelMax: clampLevel(Math.max(min, max)),
                    page: 1,
                  });
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Spheres
              </div>
              <div className="text-xs text-muted-foreground">
                {filters.spheres.length > 0
                  ? `${filters.spheres.length} selected`
                  : "Any sphere"}
              </div>
              <ScrollArea className="h-56 rounded-sm border p-2">
                <div className="grid grid-cols-2 gap-2">
                  {SPHERE_OPTIONS.map((sphere) => (
                    <label
                      key={sphere}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={filters.spheres.includes(sphere)}
                        onCheckedChange={() => toggleSphere(sphere)}
                      />
                      <span>{sphere}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {sortedSpells.length} spells
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 py-0">
          <CardContent className="py-4">
            <div ref={tableTopRef} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto p-0 text-xs font-semibold"
                      onClick={() => handleSort("name")}
                    >
                      Name
                      <span className="ml-1 inline-flex">
                        {sortIcon("name")}
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto p-0 text-xs font-semibold"
                      onClick={() => handleSort("class")}
                    >
                      Class
                      <span className="ml-1 inline-flex">
                        {sortIcon("class")}
                      </span>
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto p-0 text-xs font-semibold"
                      onClick={() => handleSort("level")}
                    >
                      Level
                      <span className="ml-1 inline-flex">
                        {sortIcon("level")}
                      </span>
                    </Button>
                  </TableHead>
                  {showSphereColumn && (
                    <TableHead className="min-w-48">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto p-0 text-xs font-semibold"
                        onClick={() => handleSort("sphere")}
                      >
                        Sphere
                        <span className="ml-1 inline-flex">
                          {sortIcon("sphere")}
                        </span>
                      </Button>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSpells.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={columnCount}
                      className="py-6 text-center"
                    >
                      <div className="text-sm text-muted-foreground">
                        No spells match these filters.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {pagedSpells.map((spell) => (
                  <TableRow key={`${spell.spellClass}:${spell.id}`}>
                    <TableCell className="whitespace-normal">
                      <Link
                        to={PageRoute.SPELL_VIEW(spell.id)}
                        className={cn(
                          "font-medium hover:underline",
                          spell.spellClass === "wizard"
                            ? "text-sky-600 dark:text-sky-400"
                            : "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {spell.name}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">
                      {spell.spellClass}
                    </TableCell>
                    <TableCell>{spell.level}</TableCell>
                    {showSphereColumn && (
                      <TableCell className="whitespace-normal">
                        {spell.spheres?.length ? spell.spheres.join(", ") : "—"}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {sortedSpells.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm text-muted-foreground">
                <div>
                  Page {page} of {pageCount}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => {
                      const nextPage = Math.max(1, page - 1);
                      setPage(nextPage);
                      updateParams({ page: nextPage });
                      tableTopRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= pageCount}
                    onClick={() => {
                      const nextPage = Math.min(pageCount, page + 1);
                      setPage(nextPage);
                      updateParams({ page: nextPage });
                      tableTopRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

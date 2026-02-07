import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { logout, signInWithGoogle } from "@/firebase/auth";
import { charactersAtom, userAtom } from "@/globalState";
import { PageRoute } from "@/pages/PageRoute";
import { useAtomValue } from "jotai";
import { Menu, User, X } from "lucide-react";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useMatch, useNavigate } from "react-router-dom";
import { NavbarSearch } from "./NavbarSearch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Top navigation bar.
 *
 * Provides character-scoped navigation via a left drawer (including wizard pages
 * when applicable) plus wiki search and account actions.
 */
export function Navbar() {
  const user = useAtomValue(userAtom);
  const characters = useAtomValue(charactersAtom);
  const [open, setOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const closeMenu = () => setOpen(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [persistedCharacterId, setPersistedCharacterId] = useState<
    string | null
  >(null);
  const drawerTriggerRef = useRef<HTMLButtonElement | null>(null);
  // Blur the trigger before Vaul sets aria-hidden so the focused element isn't hidden.
  const blurDrawerTrigger = () => {
    drawerTriggerRef.current?.blur();
  };
  const handleDrawerTriggerPointerDown = () => {
    blurDrawerTrigger();
  };
  const handleDrawerTriggerKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "Spacebar"
    ) {
      blurDrawerTrigger();
    }
  };

  // Resolve current character from any character-scoped route.
  const matchCharacterIdDeep = useMatch("/characters/:characterId/*");
  const matchCharacterId = useMatch("/characters/:characterId");
  const matchIdDeep = useMatch("/characters/:id/*");
  const matchId = useMatch("/characters/:id");
  const lastCharacterStorageKey = "dnd2e-grimoire:last-character-id";

  const readStoredCharacterId = () => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(lastCharacterStorageKey);
    } catch {
      return null;
    }
  };

  const writeStoredCharacterId = (characterId: string | null) => {
    if (typeof window === "undefined") return;
    try {
      if (!characterId) {
        window.localStorage.removeItem(lastCharacterStorageKey);
      } else {
        window.localStorage.setItem(lastCharacterStorageKey, characterId);
      }
    } catch {
      // Ignore storage failures (private mode, blocked storage).
    }
  };

  const selectedCharacterId =
    matchCharacterIdDeep?.params.characterId ??
    matchCharacterId?.params.characterId ??
    matchIdDeep?.params.id ??
    matchId?.params.id;
  const sanitizedCharacterId =
    selectedCharacterId === "new" ? undefined : selectedCharacterId;

  useEffect(() => {
    if (sanitizedCharacterId) {
      setPersistedCharacterId(sanitizedCharacterId);
      writeStoredCharacterId(sanitizedCharacterId);
    }
  }, [sanitizedCharacterId]);

  useEffect(() => {
    if (!user) return;
    if (sanitizedCharacterId) return;
    if (persistedCharacterId) return;
    if (characters.length === 0) return;

    const storedId = readStoredCharacterId();
    if (storedId && characters.some((c) => c.id === storedId)) {
      setPersistedCharacterId(storedId);
      return;
    }

    const fallbackId = characters[0]?.id;
    if (fallbackId) {
      setPersistedCharacterId(fallbackId);
      writeStoredCharacterId(fallbackId);
    }
  }, [characters, persistedCharacterId, sanitizedCharacterId, user]);

  const avatarUrl = user?.photoURL ?? user?.providerData?.[0]?.photoURL ?? null;

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

  const activeCharacterId = useMemo(() => {
    const hasPersisted =
      persistedCharacterId &&
      characters.some((c) => c.id === persistedCharacterId);
    if (sanitizedCharacterId) return sanitizedCharacterId;
    if (hasPersisted) return persistedCharacterId;
    return undefined;
  }, [characters, persistedCharacterId, sanitizedCharacterId]);

  const selectedCharacter = characters.find((c) => c.id === activeCharacterId);

  const sortedCharacters = useMemo(
    () => [...characters].sort((a, b) => a.name.localeCompare(b.name)),
    [characters],
  );

  const scrollQuillNoBgSrc = `${import.meta.env.BASE_URL}scroll-quill-no-bg.png`;
  const priestCastableLink = useMemo(() => {
    if (!selectedCharacter?.class.priest) return null;
    const priest = selectedCharacter.class.priest;
    const params = new URLSearchParams();
    params.set("priest", "1");
    params.set("wizard", "0");
    params.set("min", "0");
    params.set("max", String(Math.min(9, Math.max(0, priest.level))));
    params.set("quest", "0");
    params.set("unknown", "0");
    if (priest.majorSpheres?.length) {
      params.set("majorSpheres", priest.majorSpheres.join(","));
    }
    if (priest.minorSpheres?.length) {
      params.set("minorSpheres", priest.minorSpheres.join(","));
    }
    return `${PageRoute.SPELLS}?${params.toString()}`;
  }, [selectedCharacter]);
  const isPriestCastableActive = useMemo(() => {
    if (!selectedCharacter?.class.priest) return false;
    if (location.pathname !== PageRoute.SPELLS) return false;

    const priest = selectedCharacter.class.priest;
    const params = new URLSearchParams(location.search);
    const allowedKeys = new Set([
      "priest",
      "wizard",
      "min",
      "max",
      "quest",
      "unknown",
      "majorSpheres",
      "minorSpheres",
      "page",
      "perPage",
    ]);

    for (const key of params.keys()) {
      if (!allowedKeys.has(key)) return false;
    }

    if (params.get("priest") !== "1") return false;
    if (params.get("wizard") !== "0") return false;
    if (params.get("min") !== "0") return false;
    const expectedMax = String(Math.min(9, Math.max(0, priest.level)));
    if (params.get("max") !== expectedMax) return false;
    if (params.get("quest") !== "0") return false;
    if (params.get("unknown") !== "0") return false;

    const normalizeList = (value: string | null) =>
      value
        ? value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];
    const normalizeSet = (items: string[]) => Array.from(new Set(items)).sort();
    const listsEqual = (a: string[], b: string[]) =>
      a.length === b.length && a.every((value, index) => value === b[index]);

    const expectedMajor = normalizeSet(priest.majorSpheres ?? []);
    const expectedMinor = normalizeSet(priest.minorSpheres ?? []);
    const actualMajor = normalizeSet(normalizeList(params.get("majorSpheres")));
    const actualMinor = normalizeSet(normalizeList(params.get("minorSpheres")));

    if (!listsEqual(expectedMajor, actualMajor)) return false;
    if (!listsEqual(expectedMinor, actualMinor)) return false;

    return true;
  }, [location.pathname, location.search, selectedCharacter?.class.priest]);

  /** Returns true when the current location matches the given path/prefix. */
  const isActivePath = (path: string | undefined, exact = false) => {
    if (!path) return false;
    return exact
      ? location.pathname === path
      : location.pathname.startsWith(path);
  };

  return (
    <nav className="w-full h-14 bg-background border-b flex items-center justify-between">
      {/* Left side (nav trigger + title) */}
      <div className="flex items-center gap-2">
        <Drawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          direction="left"
          handleOnly
          autoFocus
        >
          <DrawerTrigger asChild>
            <button
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-background hover:bg-accent cursor-pointer"
              aria-label="Open navigation"
              ref={drawerTriggerRef}
              onPointerDown={handleDrawerTriggerPointerDown}
              onKeyDown={handleDrawerTriggerKeyDown}
            >
              <Menu className="h-5 w-5" />
            </button>
          </DrawerTrigger>
          <Link to={PageRoute.HOME} aria-label="Go to Home">
            <img
              src={scrollQuillNoBgSrc}
              alt="Grimoire scroll"
              className="h-6 w-6 object-contain"
            />
          </Link>
          {user && selectedCharacter && (
            <div
              className="text-lg font-semibold"
              title={selectedCharacter.name}
            >
              {selectedCharacter.name}
            </div>
          )}
          <DrawerContent className="max-w-sm">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <DrawerTitle className="text-base font-semibold flex items-center gap-2">
                  {/* Icon from: https://www.svgrepo.com/svg/307026/quill */}
                  <img
                    src={scrollQuillNoBgSrc}
                    alt="Grimoire scroll"
                    className="h-8 w-8 object-contain"
                  />
                  AD&D 2e Grimoire
                </DrawerTitle>
                <DrawerDescription className="sr-only">
                  Navigation links for characters.
                </DrawerDescription>
                <DrawerClose asChild>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent cursor-pointer"
                    aria-label="Close navigation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DrawerClose>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {user ? (
                  <>
                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Selected character
                      </div>
                      {sortedCharacters.length > 0 ? (
                        <div className="space-y-2">
                          <Select
                            value={activeCharacterId ?? ""}
                            onValueChange={(value) => {
                              if (!value) return;
                              setPersistedCharacterId(value);
                              writeStoredCharacterId(value);
                              navigate(PageRoute.CHARACTER_VIEW(value));
                              setDrawerOpen(true);
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose a character" />
                            </SelectTrigger>
                            <SelectContent>
                              {sortedCharacters.map((character) => (
                                <SelectItem
                                  key={character.id}
                                  value={character.id}
                                >
                                  {character.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {selectedCharacter ? (
                            <div className="flex flex-col gap-1">
                              <DrawerClose asChild>
                                <Link
                                  to={PageRoute.CHARACTER_VIEW(
                                    selectedCharacter.id,
                                  )}
                                  className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                                    isActivePath(
                                      PageRoute.CHARACTER_VIEW(
                                        selectedCharacter.id,
                                      ),
                                      true,
                                    )
                                      ? "font-semibold bg-accent text-foreground"
                                      : ""
                                  }`}
                                >
                                  {isActivePath(
                                    PageRoute.CHARACTER_VIEW(
                                      selectedCharacter.id,
                                    ),
                                    true,
                                  ) && (
                                    <span
                                      className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                                      aria-hidden
                                    />
                                  )}
                                  View Character
                                </Link>
                              </DrawerClose>
                              <DrawerClose asChild>
                                <Link
                                  to={PageRoute.CHARACTER_EDIT(
                                    selectedCharacter.id,
                                  )}
                                  className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                                    isActivePath(
                                      PageRoute.CHARACTER_EDIT(
                                        selectedCharacter.id,
                                      ),
                                      true,
                                    )
                                      ? "font-semibold bg-accent text-foreground"
                                      : ""
                                  }`}
                                >
                                  {isActivePath(
                                    PageRoute.CHARACTER_EDIT(
                                      selectedCharacter.id,
                                    ),
                                    true,
                                  ) && (
                                    <span
                                      className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                                      aria-hidden
                                    />
                                  )}
                                  Edit Character
                                </Link>
                              </DrawerClose>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Select a character to see quick links.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No characters yet.
                        </p>
                      )}
                    </div>

                    {selectedCharacter?.class.priest && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Priest
                        </div>
                        <div className="flex flex-col gap-1">
                          <DrawerClose asChild>
                            <Link
                              to={PageRoute.PRIEST_CAST(selectedCharacter.id)}
                              className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                                isActivePath(
                                  PageRoute.PRIEST_CAST(selectedCharacter.id),
                                )
                                  ? "font-semibold bg-accent text-foreground"
                                  : ""
                              }`}
                            >
                              {isActivePath(
                                PageRoute.PRIEST_CAST(selectedCharacter.id),
                              ) && (
                                <span
                                  className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                                  aria-hidden
                                />
                              )}
                              Cast Spells
                            </Link>
                          </DrawerClose>
                          <DrawerClose asChild>
                            <Link
                              to={PageRoute.PRIEST_PREPARE(
                                selectedCharacter.id,
                              )}
                              className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                                isActivePath(
                                  PageRoute.PRIEST_PREPARE(
                                    selectedCharacter.id,
                                  ),
                                )
                                  ? "font-semibold bg-accent text-foreground"
                                  : ""
                              }`}
                            >
                              {isActivePath(
                                PageRoute.PRIEST_PREPARE(selectedCharacter.id),
                              ) && (
                                <span
                                  className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                                  aria-hidden
                                />
                              )}
                              Prepare Spells
                            </Link>
                          </DrawerClose>
                          {priestCastableLink && (
                            <DrawerClose asChild>
                              <Link
                                to={priestCastableLink}
                                className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                                  isPriestCastableActive
                                    ? "font-semibold bg-accent text-foreground"
                                    : ""
                                }`}
                              >
                                {isPriestCastableActive && (
                                  <span
                                    className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                                    aria-hidden
                                  />
                                )}
                                Castable Spells List
                              </Link>
                            </DrawerClose>
                          )}
                          <DrawerClose asChild>
                            <Link
                              to={PageRoute.PRIEST_SPELL_SLOTS(
                                selectedCharacter.id,
                              )}
                              className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                                isActivePath(
                                  PageRoute.PRIEST_SPELL_SLOTS(
                                    selectedCharacter.id,
                                  ),
                                )
                                  ? "font-semibold bg-accent text-foreground"
                                  : ""
                              }`}
                            >
                              {isActivePath(
                                PageRoute.PRIEST_SPELL_SLOTS(
                                  selectedCharacter.id,
                                ),
                              ) && (
                                <span
                                  className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                                  aria-hidden
                                />
                              )}
                              Manage Spell Slots
                            </Link>
                          </DrawerClose>
                        </div>
                      </div>
                    )}

                    {selectedCharacter?.class.wizard && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Wizard
                        </div>
                        <div className="flex flex-col gap-1">
                          <DrawerClose asChild>
                            <Link
                              to={PageRoute.WIZARD_CAST(selectedCharacter.id)}
                              className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                                isActivePath(
                                  PageRoute.WIZARD_CAST(selectedCharacter.id),
                                )
                                  ? "font-semibold bg-accent text-foreground"
                                  : ""
                              }`}
                            >
                              {isActivePath(
                                PageRoute.WIZARD_CAST(selectedCharacter.id),
                              ) && (
                                <span
                                  className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                                  aria-hidden
                                />
                              )}
                              Cast Spells
                            </Link>
                          </DrawerClose>
                          <DrawerClose asChild>
                            <Link
                              to={PageRoute.WIZARD_PREPARE(
                                selectedCharacter.id,
                              )}
                              className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                                isActivePath(
                                  PageRoute.WIZARD_PREPARE(
                                    selectedCharacter.id,
                                  ),
                                )
                                  ? "font-semibold bg-accent text-foreground"
                                  : ""
                              }`}
                            >
                              {isActivePath(
                                PageRoute.WIZARD_PREPARE(selectedCharacter.id),
                              ) && (
                                <span
                                  className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                                  aria-hidden
                                />
                              )}
                              Prepare Spells
                            </Link>
                          </DrawerClose>
                          <DrawerClose asChild>
                            <Link
                              to={PageRoute.WIZARD_SPELLBOOKS(
                                selectedCharacter.id,
                              )}
                              className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                                isActivePath(
                                  PageRoute.WIZARD_SPELLBOOKS(
                                    selectedCharacter.id,
                                  ),
                                )
                                  ? "font-semibold bg-accent text-foreground"
                                  : ""
                              }`}
                            >
                              {isActivePath(
                                PageRoute.WIZARD_SPELLBOOKS(
                                  selectedCharacter.id,
                                ),
                              ) && (
                                <span
                                  className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                                  aria-hidden
                                />
                              )}
                              Spellbooks
                            </Link>
                          </DrawerClose>
                          <DrawerClose asChild>
                            <Link
                              to={PageRoute.WIZARD_KNOWN_SPELLS(
                                selectedCharacter.id,
                              )}
                              className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                                isActivePath(
                                  PageRoute.WIZARD_KNOWN_SPELLS(
                                    selectedCharacter.id,
                                  ),
                                )
                                  ? "font-semibold bg-accent text-foreground"
                                  : ""
                              }`}
                            >
                              {isActivePath(
                                PageRoute.WIZARD_KNOWN_SPELLS(
                                  selectedCharacter.id,
                                ),
                              ) && (
                                <span
                                  className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                                  aria-hidden
                                />
                              )}
                              Known Spells
                            </Link>
                          </DrawerClose>
                          <DrawerClose asChild>
                            <Link
                              to={PageRoute.WIZARD_SPELL_SLOTS(
                                selectedCharacter.id,
                              )}
                              className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                                isActivePath(
                                  PageRoute.WIZARD_SPELL_SLOTS(
                                    selectedCharacter.id,
                                  ),
                                )
                                  ? "font-semibold bg-accent text-foreground"
                                  : ""
                              }`}
                            >
                              {isActivePath(
                                PageRoute.WIZARD_SPELL_SLOTS(
                                  selectedCharacter.id,
                                ),
                              ) && (
                                <span
                                  className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                                  aria-hidden
                                />
                              )}
                              Manage Spell Slots
                            </Link>
                          </DrawerClose>
                        </div>
                      </div>
                    )}

                    <div className="h-px bg-border" />
                    <div className="flex flex-col gap-1">
                      <DrawerClose asChild>
                        <Link
                          to={PageRoute.HOME}
                          className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                            isActivePath(PageRoute.HOME, true)
                              ? "font-semibold bg-accent text-foreground"
                              : ""
                          }`}
                        >
                          {isActivePath(PageRoute.HOME, true) && (
                            <span
                              className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                              aria-hidden
                            />
                          )}
                          Home
                        </Link>
                      </DrawerClose>
                      <DrawerClose asChild>
                        <Link
                          to={PageRoute.CHARACTERS}
                          className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                            isActivePath(PageRoute.CHARACTERS, true)
                              ? "font-semibold bg-accent text-foreground"
                              : ""
                          }`}
                        >
                          {isActivePath(PageRoute.CHARACTERS, true) && (
                            <span
                              className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                              aria-hidden
                            />
                          )}
                          Characters
                        </Link>
                      </DrawerClose>
                      <DrawerClose asChild>
                        <Link
                          to={PageRoute.SPELLS}
                          className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                            isActivePath(PageRoute.SPELLS, true)
                              ? "font-semibold bg-accent text-foreground"
                              : ""
                          }`}
                        >
                          {isActivePath(PageRoute.SPELLS, true) && (
                            <span
                              className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                              aria-hidden
                            />
                          )}
                          Spell Explorer
                        </Link>
                      </DrawerClose>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 text-sm">
                    <p className="text-muted-foreground">
                      Sign in to access characters and class tools.
                    </p>
                    <button
                      className="text-left px-2 py-2 rounded hover:bg-accent cursor-pointer"
                      onClick={async () => {
                        closeMenu();
                        await signInWithGoogle();
                        navigate(PageRoute.CHARACTERS);
                      }}
                    >
                      Sign in with Google
                    </button>
                    <div className="h-px bg-border" />
                    <div className="flex flex-col gap-1">
                      <DrawerClose asChild>
                        <Link
                          to={PageRoute.HOME}
                          className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                            isActivePath(PageRoute.HOME, true)
                              ? "font-semibold bg-accent text-foreground"
                              : ""
                          }`}
                        >
                          {isActivePath(PageRoute.HOME, true) && (
                            <span
                              className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                              aria-hidden
                            />
                          )}
                          Home
                        </Link>
                      </DrawerClose>
                      <DrawerClose asChild>
                        <Link
                          to={PageRoute.SPELLS}
                          className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                            isActivePath(PageRoute.SPELLS, true)
                              ? "font-semibold bg-accent text-foreground"
                              : ""
                          }`}
                        >
                          {isActivePath(PageRoute.SPELLS, true) && (
                            <span
                              className="absolute -left-1.5 top-1 bottom-1 w-0.5 rounded-full bg-white"
                              aria-hidden
                            />
                          )}
                          Spell Explorer
                        </Link>
                      </DrawerClose>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Right side icons */}
      <div className="flex items-center">
        <NavbarSearch />
        {/* Account menu */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-2 rounded-full hover:bg-accent cursor-pointer"
              aria-label="Account menu"
            >
              {avatarUrl && !avatarError ? (
                <img
                  src={avatarUrl}
                  alt={user?.displayName ?? "User avatar"}
                  className="h-6 w-6 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <User className="h-5 w-5" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-2">
            <div className="flex flex-col gap-1">
              {user && (
                <>
                  <Link
                    to={PageRoute.SETTINGS}
                    className="px-2 py-2 rounded hover:bg-accent cursor-pointer"
                    onClick={closeMenu}
                  >
                    Settings
                  </Link>
                  <Link
                    to={PageRoute.ABOUT}
                    className="px-2 py-2 rounded hover:bg-accent cursor-pointer"
                    onClick={closeMenu}
                  >
                    About
                  </Link>
                  <button
                    className="text-left px-2 py-2 rounded hover:bg-accent cursor-pointer"
                    onClick={() => {
                      closeMenu();
                      logout();
                      navigate(PageRoute.HOME);
                    }}
                  >
                    Sign Out
                  </button>
                </>
              )}

              {!user && (
                <>
                  <Link
                    to={PageRoute.ABOUT}
                    className="px-2 py-2 rounded hover:bg-accent cursor-pointer"
                    onClick={closeMenu}
                  >
                    About
                  </Link>
                  <button
                    className="text-left px-2 py-2 rounded hover:bg-accent cursor-pointer"
                    onClick={async () => {
                      closeMenu();
                      await signInWithGoogle();
                      navigate(PageRoute.CHARACTERS);
                    }}
                  >
                    Sign in with Google
                  </button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </nav>
  );
}

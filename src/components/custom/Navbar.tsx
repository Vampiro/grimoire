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
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useMatch, useNavigate } from "react-router-dom";
import { DndWikiSearch } from "./NavbarSearch";
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
  const closeMenu = () => setOpen(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [persistedCharacterId, setPersistedCharacterId] = useState<
    string | null
  >(null);

  // Resolve current character from any character-scoped route.
  const matchCharacterIdDeep = useMatch("/characters/:characterId/*");
  const matchCharacterId = useMatch("/characters/:characterId");
  const matchIdDeep = useMatch("/characters/:id/*");
  const matchId = useMatch("/characters/:id");

  const selectedCharacterId =
    matchCharacterIdDeep?.params.characterId ??
    matchCharacterId?.params.characterId ??
    matchIdDeep?.params.id ??
    matchId?.params.id;

  useEffect(() => {
    if (selectedCharacterId) {
      setPersistedCharacterId(selectedCharacterId);
    }
  }, [selectedCharacterId]);

  const activeCharacterId = useMemo(() => {
    const hasPersisted =
      persistedCharacterId &&
      characters.some((c) => c.id === persistedCharacterId);
    if (selectedCharacterId) return selectedCharacterId;
    if (hasPersisted) return persistedCharacterId;
    return undefined;
  }, [characters, persistedCharacterId, selectedCharacterId]);

  const selectedCharacter = characters.find((c) => c.id === activeCharacterId);

  const sortedCharacters = useMemo(
    () => [...characters].sort((a, b) => a.name.localeCompare(b.name)),
    [characters],
  );

  const scrollQuillNoBgSrc = `${import.meta.env.BASE_URL}scroll-quill-no-bg.png`;

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
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="left">
          <DrawerTrigger asChild>
            <button
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-background hover:bg-accent cursor-pointer"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          </DrawerTrigger>
          <img
            src={scrollQuillNoBgSrc}
            alt="Grimoire scroll"
            className="h-6 w-6 object-contain"
          />
          {selectedCharacter && (
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
                          navigate(PageRoute.CHARACTER_VIEW(value));
                          setDrawerOpen(true);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a character" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedCharacters.map((character) => (
                            <SelectItem key={character.id} value={character.id}>
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
                                PageRoute.CHARACTER_VIEW(selectedCharacter.id),
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
                                PageRoute.CHARACTER_EDIT(selectedCharacter.id),
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
                          to={PageRoute.WIZARD_PREPARE(selectedCharacter.id)}
                          className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                            isActivePath(
                              PageRoute.WIZARD_PREPARE(selectedCharacter.id),
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
                          to={PageRoute.WIZARD_SPELLBOOKS(selectedCharacter.id)}
                          className={`relative rounded-md pl-3 pr-2 py-1 text-sm hover:bg-accent ${
                            isActivePath(
                              PageRoute.WIZARD_SPELLBOOKS(selectedCharacter.id),
                            )
                              ? "font-semibold bg-accent text-foreground"
                              : ""
                          }`}
                        >
                          {isActivePath(
                            PageRoute.WIZARD_SPELLBOOKS(selectedCharacter.id),
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
                            PageRoute.WIZARD_SPELL_SLOTS(selectedCharacter.id),
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
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Right side icons */}
      <div className="flex items-center">
        {/* Account menu */}
        <Popover open={open} onOpenChange={setOpen}>
          <DndWikiSearch
            open={searchOpen}
            onOpenChange={(open) => setSearchOpen(open)}
          />
          <PopoverTrigger className="p-2 rounded-full hover:bg-accent cursor-pointer">
            <User className="h-5 w-5" />
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
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </nav>
  );
}

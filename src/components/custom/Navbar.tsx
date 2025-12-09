import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { logout, signInWithGoogle } from "@/firebase/auth";
import { userAtom } from "@/globalState";
import { PageRoute } from "@/pages/PageRoute";
import { useAtomValue } from "jotai";
import { User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DndWikiSearch } from "./NavbarSearch";

export function Navbar() {
  const user = useAtomValue(userAtom);
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <nav className="w-full h-14 bg-background border-b flex items-center px-4 justify-between">
      {/* Left side (logo or title) */}
      <div className="text-xl font-semibold">Grimoire</div>

      {/* Right side icons */}
      <div className="flex items-center gap-4">
        {/* Account menu */}
        <Popover open={open} onOpenChange={setOpen}>
          <DndWikiSearch
            open={searchOpen}
            onOpenChange={(open) => setSearchOpen(open)}
          />
          <PopoverTrigger className="p-2 rounded-full hover:bg-accent">
            <User className="h-5 w-5" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-2">
            <div className="flex flex-col gap-1">
              {user && (
                <>
                  <Link
                    to={PageRoute.CHARACTERS}
                    className="px-2 py-2 rounded hover:bg-accent"
                    onClick={closeMenu}
                  >
                    Characters
                  </Link>
                  <button
                    className="text-left px-2 py-2 rounded hover:bg-accent"
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
                  className="text-left px-2 py-2 rounded hover:bg-accent"
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

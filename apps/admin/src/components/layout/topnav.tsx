"use client";

import { useRouter } from "next/navigation";
import { Moon, Sun, LogOut, User as UserIcon, Menu } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@rmsm/ui";
import { useThemeStore } from "@/lib/theme-store";
import { useAuthStore } from "@/lib/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { Breadcrumbs } from "./breadcrumbs";

export function Topnav({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  async function handleLogout() {
    await logout.mutateAsync();
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMobileNav} aria-label="Open navigation menu">
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      <div className="flex-1">
        <Breadcrumbs />
      </div>

      <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}>
        {theme === "light" ? <Moon className="h-4 w-4" aria-hidden="true" /> : <Sun className="h-4 w-4" aria-hidden="true" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="User menu">
            <UserIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="max-w-[220px] truncate font-normal text-muted-foreground">{user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLogout} disabled={logout.isPending}>
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            {logout.isPending ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

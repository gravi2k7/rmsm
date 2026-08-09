"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Moon, Sun, LogOut, User as UserIcon, Menu, LineChart } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rmsm/ui";
import { useThemeStore } from "@/lib/theme-store";
import { useAuthStore } from "@/lib/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { WorkspaceSwitcher, OrganizationSwitcher, NotificationCenter, SearchTrigger } from "@/components/dashboard/header";
import { Breadcrumbs } from "./breadcrumbs";

export function Topnav({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  async function handleLogout() {
    await logout.mutateAsync();
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center gap-2 border-b bg-card px-4 md:gap-3 md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenMobileNav} aria-label="Open navigation menu">
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      {/* RMSM logo — visible on mobile/tablet where Sidebar (which already
       * shows the same mark) is collapsed behind the drawer trigger above.
       * Hidden at md+ since Sidebar's own logo is on-screen there already,
       * avoiding a duplicate mark rather than because Header "lacks" one. */}
      <Link href="/dashboard" className="flex items-center gap-2 md:hidden" aria-label="RMSM Trader home">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LineChart className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
      </Link>

      {/* Phase 2 — Workspace/Organization Switchers. Hidden below md so a
       * narrow viewport doesn't have to fit five interactive controls plus
       * breadcrumbs in one row; both remain reachable via their own full
       * surfaces once those exist (Phase 5 revisits mobile placement). */}
      <div className="hidden items-center gap-1 md:flex">
        <WorkspaceSwitcher />
        <OrganizationSwitcher />
      </div>

      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      <SearchTrigger />
      <NotificationCenter />

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
          <DropdownMenuItem onSelect={() => router.push("/settings/profile")}>Profile</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/settings/preferences")}>Preferences</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/settings/security")}>Security settings</DropdownMenuItem>
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

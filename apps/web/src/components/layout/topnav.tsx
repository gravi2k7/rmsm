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
import {
  WorkspaceSwitcher,
  OrganizationSwitcher,
  NotificationCenter,
  SearchTrigger,
} from "@/components/dashboard/header";
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
    <header className="md:border-border md:bg-card md:text-foreground flex h-14 items-center gap-1 border-b border-white/10 bg-[#07111f]/80 px-2 text-white shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-2xl md:h-16 md:gap-3 md:border-b md:px-6 md:shadow-none md:backdrop-blur-none">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white md:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      {/* RMSM logo — visible on mobile/tablet where Sidebar (which already
       * shows the same mark) is collapsed behind the drawer trigger above.
       * Hidden at md+ since Sidebar's own logo is on-screen there already,
       * avoiding a duplicate mark rather than because Header "lacks" one. */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 rounded-xl px-1.5 py-1 md:hidden"
        aria-label="RMSM Trader home"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.12)]">
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

      <Button
        variant="ghost"
        size="icon"
        className="md:text-foreground md:hover:bg-accent md:hover:text-accent-foreground hidden h-10 w-10 rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white md:flex md:h-9 md:w-9 md:border-transparent md:bg-transparent"
        onClick={toggleTheme}
        aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      >
        {theme === "light" ? (
          <Moon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Sun className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:text-foreground md:hover:bg-accent md:hover:text-accent-foreground h-10 w-10 rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white md:h-9 md:w-9 md:border-transparent md:bg-transparent"
            aria-label="User menu"
          >
            <UserIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-muted-foreground max-w-[220px] truncate font-normal">
            {user?.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.push("/settings/profile")}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/settings/preferences")}>
            Preferences
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push("/settings/security")}>
            Security settings
          </DropdownMenuItem>
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

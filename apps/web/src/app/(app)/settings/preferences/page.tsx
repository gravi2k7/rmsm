"use client";

import { useEffect, useState } from "react";
import { Palette, LayoutGrid, Bell, Keyboard, Monitor } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Switch, Button, toast, Skeleton } from "@rmsm/ui";
import { useThemeStore } from "@/lib/theme-store";
import { usePreferencesStore, type TableDensity, type DefaultLandingPage } from "@/features/preferences/store";
import { useUserAccount, useUpdateProfile } from "@/features/profile/hooks/use-profile";
import { CANDLE_INTERVALS, ASSET_CLASSES } from "@/features/preferences/constants";

const LANDING_PAGES: { value: DefaultLandingPage; label: string }[] = [
  { value: "/dashboard", label: "Dashboard" },
  { value: "/market", label: "Market Watch" },
  { value: "/portfolio", label: "Portfolio" },
  { value: "/opportunities", label: "Opportunity Feed" },
  { value: "/decisions", label: "Decision Center" },
  { value: "/orders", label: "Order Management" },
];

const KEYBOARD_SHORTCUTS = [
  { keys: "⌘/Ctrl + K", action: "Open command palette / global search" },
  { keys: "G then D", action: "Go to Dashboard" },
  { keys: "G then M", action: "Go to Market Watch" },
  { keys: "G then P", action: "Go to Portfolio" },
  { keys: "?", action: "Show this shortcuts list (command palette)" },
];

function ThemeCard() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="h-4 w-4" aria-hidden="true" />
          Theme
        </CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")}>
          Light
        </Button>
        <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")}>
          Dark
        </Button>
      </CardContent>
    </Card>
  );
}

function DashboardPreferencesCard() {
  const { tableDensity, defaultTimeframe, defaultMarket, defaultLandingPage, setTableDensity, setDefaultTimeframe, setDefaultMarket, setDefaultLandingPage } =
    usePreferencesStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          Dashboard Preferences
        </CardTitle>
        <CardDescription>Saved on this device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Table density</Label>
          <Select value={tableDensity} onValueChange={(v: TableDensity) => setTableDensity(v)}>
            <SelectTrigger className="w-40" aria-label="Table density">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Label>Default timeframe</Label>
          <Select value={defaultTimeframe} onValueChange={setDefaultTimeframe}>
            <SelectTrigger className="w-40" aria-label="Default timeframe">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CANDLE_INTERVALS.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Label>Default market</Label>
          <Select value={defaultMarket} onValueChange={setDefaultMarket}>
            <SelectTrigger className="w-40" aria-label="Default market">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_CLASSES.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Label>Default landing page</Label>
          <Select value={defaultLandingPage} onValueChange={(v: DefaultLandingPage) => setDefaultLandingPage(v)}>
            <SelectTrigger className="w-40" aria-label="Default landing page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANDING_PAGES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationPreferencesCard() {
  const accountQuery = useUserAccount();
  const updateProfile = useUpdateProfile();
  const [prefs, setPrefs] = useState<{ email: boolean; push: boolean; sms: boolean; marketing: boolean }>({
    email: true,
    push: true,
    sms: false,
    marketing: false,
  });

  useEffect(() => {
    const saved = accountQuery.data?.profile?.notificationPreferences;
    if (saved) {
      setPrefs({ email: saved.email ?? true, push: saved.push ?? true, sms: saved.sms ?? false, marketing: saved.marketing ?? false });
    }
  }, [accountQuery.data]);

  function toggle(key: keyof typeof prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    updateProfile.mutate(
      { notificationPreferences: next },
      { onError: () => toast.error("Failed to save notification preference.") },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" aria-hidden="true" />
          Notification Preferences
        </CardTitle>
        <CardDescription>Saved to your account via the Enterprise API.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {accountQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          (["email", "push", "sms", "marketing"] as const).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={`pref-${key}`} className="capitalize">
                {key} notifications
              </Label>
              <Switch id={`pref-${key}`} checked={prefs[key]} onCheckedChange={(checked) => toggle(key, checked)} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SessionPreferencesCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Monitor className="h-4 w-4" aria-hidden="true" />
          Session
        </CardTitle>
        <CardDescription>Remember Me is set at login. Manage active sessions from Security settings.</CardDescription>
      </CardHeader>
    </Card>
  );
}

function AccessibilityCard() {
  const reduceMotion = usePreferencesStore((s) => s.reduceMotion);
  const setReduceMotion = usePreferencesStore((s) => s.setReduceMotion);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Keyboard className="h-4 w-4" aria-hidden="true" />
          Accessibility &amp; Keyboard Shortcuts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="reduce-motion">Reduce motion</Label>
          <Switch id="reduce-motion" checked={reduceMotion} onCheckedChange={setReduceMotion} />
        </div>
        <ul className="space-y-1.5 text-sm">
          {KEYBOARD_SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between">
              <span className="text-muted-foreground">{s.action}</span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{s.keys}</kbd>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function PreferencesPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Preferences</h1>
        <p className="text-sm text-muted-foreground">Customize how the trading workspace looks and behaves.</p>
      </div>
      <ThemeCard />
      <DashboardPreferencesCard />
      <NotificationPreferencesCard />
      <SessionPreferencesCard />
      <AccessibilityCard />
    </div>
  );
}

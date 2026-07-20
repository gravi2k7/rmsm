"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Tabs, TabsList, TabsTrigger, TabsContent, Button, Switch, Label } from "@rmsm/ui";
import { Moon, Sun } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useAuthStore } from "@/lib/auth-store";
import { useThemeStore } from "@/lib/theme-store";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div>
      <PageHeader title="Settings" description="Account preferences and platform configuration." />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="notifications">Email &amp; Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 max-w-lg space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{user?.email ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Roles</span>
                <span>{user?.roles.join(", ") || "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="theme-toggle" className="flex items-center gap-2">
                  {theme === "dark" ? <Moon className="h-4 w-4" aria-hidden="true" /> : <Sun className="h-4 w-4" aria-hidden="true" />}
                  Dark Mode
                </Label>
                <Switch id="theme-toggle" checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Security</CardTitle>
              <CardDescription>Session and login activity for your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/audit">View Login History &amp; Active Sessions</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="mt-4 max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">API Connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base URL</span>
                <span className="font-mono">{process.env.NEXT_PUBLIC_API_URL ?? "/api/v1"}</span>
              </div>
              <p className="text-xs text-muted-foreground">Every request from this console goes through this base URL, versioned at /api/v1.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email &amp; Notifications</CardTitle>
              <CardDescription>Provider configuration and delivery metrics live in the Notification Center.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/notifications">Open Notification Center</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserCircle, AlertCircle, CheckCircle2, History, ArrowRight } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Label, Alert, AlertDescription, Skeleton, Badge } from "@rmsm/ui";
import { useUserAccount, useUpdateProfile, useLoginHistory } from "@/features/profile/hooks/use-profile";
import { ApiError } from "@/lib/api-client";

const TIMEZONES = ["UTC", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney"];
const LANGUAGES = [{ code: "en", label: "English" }, { code: "es", label: "Español" }, { code: "fr", label: "Français" }, { code: "de", label: "Deutsch" }, { code: "ja", label: "日本語" }];

function ProfileOverviewCard() {
  const accountQuery = useUserAccount();
  const updateProfile = useUpdateProfile();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const profile = accountQuery.data?.profile;
    if (profile) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
      setPhone(profile.phone ?? "");
      setTimezone(profile.timezone);
      setLanguage(profile.language);
    }
  }, [accountQuery.data]);

  function handleSave() {
    updateProfile.mutate({ firstName, lastName, phone: phone || undefined, timezone, language });
  }

  if (accountQuery.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (accountQuery.isError || !accountQuery.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Couldn&apos;t load your profile.</AlertDescription>
      </Alert>
    );
  }

  const account = accountQuery.data;
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || account.email[0]?.toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCircle className="h-4 w-4" aria-hidden="true" />
          Profile
        </CardTitle>
        <CardDescription>Your display name, contact details, and regional settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {updateProfile.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{updateProfile.error instanceof ApiError ? updateProfile.error.message : "Failed to update profile."}</AlertDescription>
          </Alert>
        )}
        {updateProfile.isSuccess && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>Profile updated.</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-4">
          {/* Avatar upload isn't offered here: avatarUrl accepts any URL
              server-side, but there's no file-upload/storage endpoint in
              the API to produce one from a picked image — an honest gap,
              not an oversight. */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">{initials}</div>
          <div>
            <p className="font-medium">{account.email}</p>
            <p className="text-xs text-muted-foreground">
              {account.emailVerifiedAt ? "Email verified" : "Email not verified"} · Member since {new Date(account.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 555 5555" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select id="timezone" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <select id="language" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button onClick={handleSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? "Saving…" : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ActivityTimelineCard() {
  const historyQuery = useLoginHistory(1, 10);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" aria-hidden="true" />
            Activity Timeline
          </CardTitle>
          <CardDescription>Your recent sign-in attempts.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings/security">
            Sessions &amp; devices <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {historyQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : historyQuery.isError ? (
          <p className="text-sm text-muted-foreground">Couldn&apos;t load activity history.</p>
        ) : historyQuery.data && historyQuery.data.data.length > 0 ? (
          <ul className="divide-y">
            {historyQuery.data.data.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={entry.success ? "success" : "destructive"}>{entry.success ? "Success" : "Failed"}</Badge>
                  <span className="text-muted-foreground">{entry.ipAddress ?? "Unknown IP"}</span>
                  {entry.reason && <span className="text-xs text-muted-foreground">({entry.reason})</span>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal information and view recent activity.</p>
      </div>
      <ProfileOverviewCard />
      <ActivityTimelineCard />
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { usePreferencesStore } from "@/features/preferences/store";
import { SplashScreen } from "@/components/shared/splash-screen";

export default function RootPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const defaultLandingPage = usePreferencesStore((s) => s.defaultLandingPage);

  useEffect(() => {
    router.replace(isAuthenticated ? defaultLandingPage : "/login");
  }, [isAuthenticated, defaultLandingPage, router]);

  return <SplashScreen />;
}

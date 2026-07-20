import { LineChart } from "lucide-react";

export function SplashScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <LineChart className="h-6 w-6" aria-hidden="true" />
      </div>
      <span className="text-sm text-muted-foreground">Loading RMSM…</span>
    </div>
  );
}

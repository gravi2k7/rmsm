"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/data-states";
import { usePermissions } from "@/features/rbac/hooks/use-rbac";
import type { Permission } from "@/features/rbac/types";

export default function PermissionsPage() {
  const permissions = usePermissions();

  if (permissions.isLoading) return <LoadingState />;
  if (permissions.error) return <ErrorState error={permissions.error} onRetry={() => permissions.refetch()} />;
  if (!permissions.data || permissions.data.length === 0) return <EmptyState title="No permissions defined" />;

  const grouped = permissions.data.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.group] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Permissions" description="Every permission key the platform recognizes, grouped by domain. Assign these to roles from the Roles page." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([group, perms]) => (
            <Card key={group}>
              <CardHeader>
                <CardTitle className="text-base capitalize">{group}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {perms.map((permission) => (
                  <div key={permission.id}>
                    <p className="font-mono text-sm">{permission.key}</p>
                    {permission.description && <p className="text-xs text-muted-foreground">{permission.description}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}

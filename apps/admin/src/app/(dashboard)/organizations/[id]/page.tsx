"use client";

import { use, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@rmsm/ui";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Tabs, TabsList, TabsTrigger, TabsContent } from "@rmsm/ui";
import { Archive, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingState, ErrorState } from "@/components/shared/data-states";
import { useOrganization, useUpdateOrganization, useArchiveOrganization, useRestoreOrganization, useMembers } from "@/features/organizations/hooks/use-organizations";
import { MembersTable } from "@/features/organizations/components/members-table";
import { InviteMemberDialog } from "@/features/organizations/components/invite-member-dialog";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const organization = useOrganization(id);
  const updateOrganization = useUpdateOrganization(id);
  const archiveOrganization = useArchiveOrganization();
  const restoreOrganization = useRestoreOrganization();
  const members = useMembers(id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (organization.data) {
      reset({
        name: organization.data.name,
        description: organization.data.description ?? "",
        timezone: organization.data.timezone,
        currency: organization.data.currency,
        country: organization.data.country ?? "",
        website: organization.data.website ?? "",
      });
    }
  }, [organization.data, reset]);

  if (organization.isLoading) return <LoadingState />;
  if (organization.error || !organization.data) return <ErrorState error={organization.error} onRetry={() => organization.refetch()} />;

  const data = organization.data;

  async function onSubmit(values: FormValues) {
    try {
      await updateOrganization.mutateAsync({ ...values, website: values.website || undefined });
      toast.success("Organization updated.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to update organization.");
    }
  }

  async function handleArchive() {
    try {
      await archiveOrganization.mutateAsync(id);
      toast.success("Organization archived.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to archive organization.");
    }
  }

  async function handleRestore() {
    try {
      await restoreOrganization.mutateAsync(id);
      toast.success("Organization restored.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to restore organization.");
    }
  }

  return (
    <div>
      <PageHeader
        title={data.name}
        description={`/${data.slug}`}
        actions={
          data.status === "ARCHIVED" ? (
            <Button variant="outline" onClick={handleRestore} disabled={restoreOrganization.isPending}>
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Restore
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleArchive} disabled={archiveOrganization.isPending}>
              <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
              Archive
            </Button>
          )
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview &amp; Settings</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Details <StatusBadge status={data.status} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" {...register("name")} aria-invalid={!!errors.name} />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" {...register("description")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input id="timezone" {...register("timezone")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input id="currency" {...register("currency")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" {...register("country")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" {...register("website")} aria-invalid={!!errors.website} />
                    {errors.website && <p className="text-sm text-destructive">{errors.website.message}</p>}
                  </div>
                </div>
                <Button type="submit" disabled={!isDirty || updateOrganization.isPending}>
                  {updateOrganization.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <div className="mb-4 flex justify-end">
            <InviteMemberDialog organizationId={id} />
          </div>
          <MembersTable organizationId={id} members={members.data} isLoading={members.isLoading} error={members.error} onRetry={() => members.refetch()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

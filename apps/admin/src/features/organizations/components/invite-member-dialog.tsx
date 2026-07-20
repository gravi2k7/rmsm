"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, AlertCircle } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Alert,
  AlertDescription,
} from "@rmsm/ui";
import { ORGANIZATION_ROLES } from "../types";
import { useInviteMember } from "../hooks/use-organizations";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  role: z.enum(ORGANIZATION_ROLES),
});

type FormValues = z.infer<typeof schema>;

export function InviteMemberDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const inviteMember = useInviteMember(organizationId);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: "VIEWER" } });

  async function onSubmit(values: FormValues) {
    await inviteMember.mutateAsync(values);
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} variant="outline">
        <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
        Invite Member
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
        </DialogHeader>

        {inviteMember.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>{inviteMember.error instanceof ApiError ? inviteMember.error.message : "Failed to send invitation."}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORGANIZATION_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMember.isPending}>
              {inviteMember.isPending ? "Sending…" : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

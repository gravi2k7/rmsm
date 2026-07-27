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
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  Alert,
  AlertDescription,
} from "@rmsm/ui";
import { INVITABLE_ORG_ROLES } from "../types";
import { useInviteMember } from "../hooks/use-invitations";
import { ApiError } from "@/lib/api-client";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  role: z.enum(INVITABLE_ORG_ROLES),
  message: z.string().max(500, "Keep the message under 500 characters.").optional(),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

type FormValues = z.infer<typeof schema>;

const ROLE_LABELS: Record<(typeof INVITABLE_ORG_ROLES)[number], string> = {
  ADMINISTRATOR: "Admin",
  MANAGER: "Manager",
  ANALYST: "Analyst",
  TRADER: "Trader",
  VIEWER: "Viewer",
};

/** Invite Member dialog (WM-020E). Owner/Admin/Manager only — the invite
 * button that opens this is gated by the "organization.member.invite"
 * permission at the call site (see the Team settings page), and the
 * backend enforces the same permission again server-side regardless. */
export function InviteMemberDialog({ trigger = true }: { trigger?: boolean }) {
  const [open, setOpen] = useState(false);
  const inviteMember = useInviteMember();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "TRADER", expiresInDays: 7 },
  });

  async function onSubmit(values: FormValues) {
    try {
      await inviteMember.mutateAsync({
        email: values.email,
        role: values.role,
        message: values.message || undefined,
        expiresInDays: values.expiresInDays,
      });
      reset({ role: "TRADER", expiresInDays: 7, email: "", message: "" });
      setOpen(false);
    } catch {
      // Surfaced via inviteMember.isError below — nothing further to do here.
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          Invite Member
        </Button>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>They&apos;ll get an email with a secure link to join this organization.</DialogDescription>
        </DialogHeader>

        {inviteMember.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              {inviteMember.error instanceof ApiError ? inviteMember.error.message : "Failed to send invitation."}
            </AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" placeholder="colleague@example.com" {...register("email")} aria-invalid={!!errors.email} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVITABLE_ORG_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-expires">Expires in (days)</Label>
              <Input id="invite-expires" type="number" min={1} max={30} {...register("expiresInDays")} aria-invalid={!!errors.expiresInDays} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-message">Message (optional)</Label>
            <Textarea id="invite-message" rows={3} placeholder="Excited to have you on the desk!" {...register("message")} aria-invalid={!!errors.message} />
            {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMember.isPending}>
              {inviteMember.isPending ? "Sending…" : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

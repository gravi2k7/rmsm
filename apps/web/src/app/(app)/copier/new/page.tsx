"use client";

import Link from "next/link";
import { ArrowLeft, Copy, Save, ShieldCheck } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rmsm/ui";

export default function CreateCopyGroupPage() {
  return (
    <div className="rmsm-mobile-glass-page mx-auto w-full max-w-4xl space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/copier">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Create Copy Group</h1>
          <p className="text-muted-foreground text-sm">
            Define the source strategy, followers and risk rules.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            Group Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Group Name</Label>
            <Input placeholder="e.g. NAS100 RDSE Copier" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Source Account</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rmsm-a2">RMSM A2</SelectItem>
                  <SelectItem value="rmsm-a1">RMSM A1</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Strategy</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rdse">RDSE</SelectItem>
                  <SelectItem value="manual">Manual Execution</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Execution Mode</Label>
            <Select defaultValue="risk">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="risk">Risk Scaled</SelectItem>
                <SelectItem value="fixed">Fixed Quantity</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Execution safety</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Broker mappings, account permissions and risk limits must be validated before live copier execution.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button asChild variant="outline">
              <Link href="/copier">Cancel</Link>
            </Button>
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              Create Group
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

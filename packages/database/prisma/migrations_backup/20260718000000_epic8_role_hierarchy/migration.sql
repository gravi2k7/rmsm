-- Epic 8 — RBAC role hierarchy. Purely additive: one nullable column plus
-- its index and self-referential foreign key. Every existing role gets
-- parentRoleId = NULL after this migration (no inheritance), so no
-- existing role's effective permissions change as a result of running it.

ALTER TABLE "roles" ADD COLUMN "parentRoleId" TEXT;

CREATE INDEX "roles_parentRoleId_idx" ON "roles"("parentRoleId");

ALTER TABLE "roles" ADD CONSTRAINT "roles_parentRoleId_fkey" FOREIGN KEY ("parentRoleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "mt5_workers"
ADD COLUMN "authSecretHash" TEXT NOT NULL;

INSERT INTO "permissions" (
    "id",
    "key",
    "description",
    "group",
    "createdAt"
)
VALUES (
    '7b9b5a4f-8d13-4ca7-9a6f-0c5e55f4d701',
    'admin.mt5-workers.manage',
    'Provision, rotate, monitor, and control MT5 workers.',
    'admin',
    CURRENT_TIMESTAMP
)
ON CONFLICT ("key")
DO UPDATE SET
    "description" = EXCLUDED."description",
    "group" = EXCLUDED."group";

INSERT INTO "role_permissions" (
    "roleId",
    "permissionId",
    "createdAt"
)
SELECT
    r."id",
    p."id",
    CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" IN ('ADMIN', 'SUPER_ADMIN')
  AND p."key" = 'admin.mt5-workers.manage'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

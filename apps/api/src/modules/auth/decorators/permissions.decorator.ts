import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "permissions";
/** Restricts an endpoint to users holding ALL of the given permission keys. */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

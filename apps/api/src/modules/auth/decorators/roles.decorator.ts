import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";
/** Restricts an endpoint to users holding at least one of the given role names. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

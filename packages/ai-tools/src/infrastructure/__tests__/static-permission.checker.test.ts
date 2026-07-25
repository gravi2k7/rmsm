import { describe, it, expect } from "vitest";
import { StaticPermissionChecker } from "../static-permission.checker";

describe("StaticPermissionChecker", () => {
  const checker = new StaticPermissionChecker();

  it("returns an empty array when every required permission is granted", () => {
    expect(checker.checkMissingPermissions(["read"], ["read", "write"])).toEqual([]);
  });

  it("returns the missing permissions when some are absent", () => {
    expect(checker.checkMissingPermissions(["read", "admin"], ["read"])).toEqual(["admin"]);
  });
});

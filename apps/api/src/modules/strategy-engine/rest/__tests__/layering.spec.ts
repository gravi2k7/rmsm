import { readFileSync } from "fs";
import { join } from "path";

/**
 * This milestone's own explicit architecture rule, verified
 * structurally rather than just asserted in a comment — the same
 * "read the controller's own source file" discipline AI-102's own
 * Phase 4 controller test established: "Controllers must never access
 * Prisma directly. Repositories must only be accessed through the
 * Application Layer."
 */
describe("Clean Architecture layering — controllers never import repositories or Prisma directly", () => {
  const controllerFiles = ["../strategy.controller.ts", "../version.controller.ts"];

  it.each(controllerFiles)("%s imports nothing from infrastructure/repositories/", (relativePath) => {
    const source = readFileSync(join(__dirname, relativePath), "utf-8");
    expect(source).not.toMatch(/from ["']\.\.\/infrastructure\/repositories/);
  });

  it.each(controllerFiles)("%s imports nothing from @rmsm/database", (relativePath) => {
    const source = readFileSync(join(__dirname, relativePath), "utf-8");
    expect(source).not.toMatch(/from ["']@rmsm\/database["']/);
  });

  it.each(controllerFiles)("%s only imports application-layer classes from ../application/", (relativePath) => {
    const source = readFileSync(join(__dirname, relativePath), "utf-8");
    const applicationImports = [...source.matchAll(/from ["'](\.\.\/application\/[^"']+)["']/g)];
    expect(applicationImports.length).toBeGreaterThan(0);
    for (const match of applicationImports) {
      // commands/queries (the CQRS handlers themselves) and errors/
      // (the application error hierarchy a controller may need to
      // throw directly, e.g. StrategyController's own
      // publishLatestApproved()) are both legitimate application-layer
      // imports — services/ is deliberately NOT allowed here, since a
      // controller calling an application SERVICE directly (bypassing
      // its own command/query handler) would be a real layering
      // violation this test exists to catch.
      expect(match[1]).toMatch(/^\.\.\/application\/(commands|queries|errors)\//);
    }
  });
});

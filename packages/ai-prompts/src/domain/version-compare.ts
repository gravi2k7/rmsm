/**
 * Compares two "x.y.z"-style version strings numerically, segment by
 * segment (falling back to string comparison for any non-numeric
 * segment, so a template author isn't forced into strict semver).
 * Shared by `PromptRegistry.getByName` and
 * `FilesystemPromptProvider.findByName` — both need the identical
 * answer to "which registered version is newest," and having each
 * reimplement it independently is exactly the kind of duplicated logic
 * this project's own conventions rule out. Not a full semver
 * implementation on purpose — AI-202 doesn't need range matching or
 * pre-release tags, only "which version is newest," and pulling in a
 * `semver` dependency for that one question isn't justified.
 */
export function compareVersions(a: string, b: string): number {
  const aParts = a.split(".");
  const bParts = b.split(".");
  const length = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < length; i++) {
    const aPart = aParts[i] ?? "0";
    const bPart = bParts[i] ?? "0";
    const aNum = Number(aPart);
    const bNum = Number(bPart);
    if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) return aNum - bNum;
    if (aPart !== bPart) return aPart < bPart ? -1 : 1;
  }
  return 0;
}

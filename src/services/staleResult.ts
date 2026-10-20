/**
 * Determines if an existing analyzed incident result should be cleared
 * based on the new raw log text entered by the user.
 *
 * Rules:
 * - If nothing was analyzed yet (analyzedLog is null or undefined), do not clear (returns false).
 * - If the new text has the same content as the analyzed log ignoring leading/trailing whitespace,
 *   do not clear (returns false).
 * - If the new text has different content from the analyzed log, clear (returns true).
 */
export function shouldClearResult(
  analyzedLog: string | null | undefined,
  newText: string
): boolean {
  if (analyzedLog === null || analyzedLog === undefined) {
    return false;
  }
  return analyzedLog.trim() !== newText.trim();
}

/**
 * Normalize a typed answer for comparison: lowercase, trim, collapse internal
 * whitespace, and strip leading/trailing punctuation. Shared by the answer
 * grader (server) and the host grading UI (client), so it must stay free of
 * server-only imports.
 */
export function normalizeAnswer(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .trim();
}

/** True if a typed answer matches any of the accepted answers once normalized. */
export function matchesAccepted(
  answer: string,
  accepted: readonly string[],
): boolean {
  const norm = normalizeAnswer(answer);
  if (!norm) return false;
  return accepted.some((a) => normalizeAnswer(a) === norm);
}

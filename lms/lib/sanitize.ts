/**
 * Bound user-supplied text before it hits Claude. Length cap + scrub of common
 * prompt-injection patterns. Not a substitute for prompt isolation but cheap
 * defense-in-depth.
 */
const MAX_LEN = 60_000;

const INJECTION_PATTERNS: RegExp[] = [
  /ignore (the )?(previous|above) (instructions?|prompts?)/gi,
  /you (are|act as) (a|an) (different|new) (assistant|model|ai)/gi,
  /system\s*:/gi,
];

export function sanitizeUserInput(text: string): string {
  let cleaned = text.slice(0, MAX_LEN);
  for (const pat of INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pat, "[redacted]");
  }
  return cleaned;
}

const ALLOWED_EXTENSIONS = new Set([
  ".c", ".cpp", ".h", ".hpp", ".py", ".txt", ".md",
]);

export function isAllowedFilename(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  return ALLOWED_EXTENSIONS.has(name.slice(dot).toLowerCase());
}

export const MAX_UPLOAD_BYTES = 1_048_576; // 1 MB

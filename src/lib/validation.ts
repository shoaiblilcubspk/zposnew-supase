/**
 * Small, pure validation helpers (unit-testable, no side effects).
 */

// Pragmatic email shape: something@something.tld — good enough to block junk like "adminkey"
// without rejecting valid addresses. Intentionally not RFC-exhaustive.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A store email is valid when it is empty (optional field) OR looks like an email.
 * Prevents bad data (e.g. an API key pasted into the Store Email field) from being saved.
 */
export function isValidStoreEmail(value: string | undefined | null): boolean {
  const v = (value ?? '').trim();
  if (!v) return true;
  return EMAIL_RE.test(v);
}

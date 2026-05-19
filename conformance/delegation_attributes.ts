const DELEGATION_PREFIX = 'intentproof.delegation.';
const ALLOWED_DELEGATION_KEYS = new Set([
  'intentproof.delegation.parent_correlation_id',
  'intentproof.delegation.parent_agent_id',
  'intentproof.delegation.depth',
]);

/**
 * Conformance oracle: only the three reserved keys may use intentproof.delegation.*
 */
export function delegationAttributeViolation(
  attributes: unknown
): string | null {
  if (attributes === undefined || attributes === null) {
    return null;
  }
  if (typeof attributes !== 'object' || Array.isArray(attributes)) {
    return 'attributes must be an object';
  }
  for (const key of Object.keys(attributes as Record<string, unknown>)) {
    if (key.startsWith(DELEGATION_PREFIX) && !ALLOWED_DELEGATION_KEYS.has(key)) {
      return `unknown delegation attribute key: ${key}`;
    }
  }
  return null;
}

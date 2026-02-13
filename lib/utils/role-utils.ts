/**
 * Utility functions for role handling in Fantasy VCT
 */

/**
 * Normalizes a role string to uppercase and trimmed format
 * This ensures consistent role comparison across the application
 * 
 * @param role - The role string to normalize (can be undefined or null)
 * @returns Normalized role string in uppercase, or empty string if input is null/undefined
 * 
 * @example
 * normalizeRole('Duelista') // returns 'DUELISTA'
 * normalizeRole('  iniciador  ') // returns 'INICIADOR'
 * normalizeRole(null) // returns ''
 */
export function normalizeRole(role: string | undefined | null): string {
  return (role || '').trim().toUpperCase();
}

/**
 * Compares two roles for equality, handling case and whitespace differences
 * 
 * @param role1 - First role to compare
 * @param role2 - Second role to compare
 * @returns true if roles are equal (case-insensitive, whitespace-trimmed)
 * 
 * @example
 * rolesEqual('Duelista', 'DUELISTA') // returns true
 * rolesEqual('  Iniciador  ', 'iniciador') // returns true
 * rolesEqual('Duelista', 'Centinela') // returns false
 */
export function rolesEqual(role1: string | undefined | null, role2: string | undefined | null): boolean {
  return normalizeRole(role1) === normalizeRole(role2);
}

/**
 * Standard role names used in the application
 */
export const ROLE_NAMES = {
  DUELISTA: 'DUELISTA',
  INICIADOR: 'INICIADOR',
  CONTROLADOR: 'CONTROLADOR',
  CENTINELA: 'CENTINELA',
  FLEX: 'FLEX'
} as const;

export type RoleName = typeof ROLE_NAMES[keyof typeof ROLE_NAMES];

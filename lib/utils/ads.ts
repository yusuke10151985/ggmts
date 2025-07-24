/**
 * Utility functions for advertisement control
 */

/**
 * Determines if ads should be shown based on user role
 * @param role - User role (admin, premier, pro, free, special, etc.)
 * @returns boolean - true if ads should be shown, false otherwise
 */
export const shouldShowAds = (role?: string): boolean => {
  // Hide ads for admin and premier users
  return role !== 'admin' && role !== 'premier'
}
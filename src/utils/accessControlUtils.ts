import { logger } from "@/lib/logger"; // Optional: if you want logging inside the util

interface Role {
  role_id: string;
}

/**
 * Checks if a user has the required roles for a specific private form.
 * Assumes the user is already confirmed to be a member of the project.
 * Does NOT handle Global Admin or Project Admin checks (those bypass role checks).
 * 
 * @param formRoles - Array of roles required by the form (e.g., [{role_id: 'abc'}, ...]). Can be null/undefined.
 * @param userProjectRoles - Array of roles the user has in the specific project (e.g., [{role_id: 'xyz'}, ...]). Can be null/undefined.
 * @returns {boolean} - True if the user meets the role requirements, false otherwise.
 */
export const checkPrivateFormRoleAccess = (
  formRoles: Role[] | null | undefined,
  userProjectRoles: Role[] | null | undefined
): boolean => {
  const requiredRoleIds = (formRoles || []).map(fr => fr.role_id);
  
  // If the form requires no specific roles, access is granted based on project membership (handled outside this function)
  if (requiredRoleIds.length === 0) {
    logger.debug("[checkPrivateFormRoleAccess] Form requires no specific roles. Granting access.");
    return true;
  }

  // If the form requires roles, but the user has none, deny access
  if (!userProjectRoles || userProjectRoles.length === 0) {
     logger.debug(`[checkPrivateFormRoleAccess] Form requires roles [${requiredRoleIds.join(', ')}], but user has none. Denying access.`);
    return false;
  }

  // Check if the user has at least one of the required roles
  const userRoleIds = new Set(userProjectRoles.map(ur => ur.role_id));
  const hasRequiredRole = requiredRoleIds.some(reqRoleId => userRoleIds.has(reqRoleId));

  if (hasRequiredRole) {
     logger.debug(`[checkPrivateFormRoleAccess] User roles [${Array.from(userRoleIds).join(', ')}] satisfy form requirements [${requiredRoleIds.join(', ')}]. Granting access.`);
  } else {
     logger.debug(`[checkPrivateFormRoleAccess] User roles [${Array.from(userRoleIds).join(', ')}] do NOT satisfy form requirements [${requiredRoleIds.join(', ')}]. Denying access.`);
  }

  return hasRequiredRole;
}; 
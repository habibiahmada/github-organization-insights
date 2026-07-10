/**
 * Authentication module.
 *
 * Supports two modes:
 * 1. Anonymous — uses a default low-privilege token for public data
 * 2. Authenticated — uses user-provided token via OAuth or header
 */

/** GitHub App token or PAT used to access public data */
let defaultToken: string = "";

/**
 * Set the default GitHub token (from environment variable).
 */
export function setDefaultToken(token: string): void {
  defaultToken = token;
}

/**
 * Get the authentication token for a request.
 *
 * Priority:
 * 1. Authorization header (Bearer token)
 * 2. Default token from environment
 * 3. Empty string (will hit rate limits quickly)
 */
export function getToken(authHeader?: string | null): string {
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return defaultToken;
}

/**
 * Check if the token is valid by calling a simple API.
 */
export async function validateToken(token: string): Promise<{
  valid: boolean;
  login?: string;
  error?: string;
}> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "org-graph/0.1.0",
      },
    });

    if (!response.ok) {
      return { valid: false, error: `Token validation failed: ${response.status}` };
    }

    const data = (await response.json()) as { login: string };
    return { valid: true, login: data.login };
  } catch (error) {
    return {
      valid: false,
      error: `Token validation error: ${(error as Error).message}`,
    };
  }
}

/**
 * Check if a specific user is a member of an organization.
 */
export async function isOrgMember(
  token: string,
  org: string,
  username: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.github.com/orgs/${org}/memberships/${username}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "org-graph/0.1.0",
        },
      }
    );
    return response.status === 200;
  } catch {
    return false;
  }
}

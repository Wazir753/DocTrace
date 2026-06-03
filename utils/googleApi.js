/**
 * Google Drive & Docs API Integration
 * Handles OAuth2 authentication and API calls for document revisions
 */

const API_BASE = "https://www.googleapis.com";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Get OAuth2 access token
 * @param {boolean} interactive - Whether to show login prompt
 * @returns {Promise<string>} Access token
 */
async function getAuthToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (token) {
        resolve(token);
      } else {
        reject(new Error("Failed to get auth token"));
      }
    });
  });
}

/**
 * Revoke current OAuth2 token
 * @param {string} token - Token to revoke
 * @returns {Promise<void>}
 */
async function revokeAuthToken(token) {
  return new Promise((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Make fetch request with retry logic and error handling
 * @param {string} url - API endpoint URL
 * @param {string} token - OAuth2 access token
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
async function makeAuthenticatedRequest(url, token, options = {}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  let lastError;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized - token expired
      if (response.status === 401) {
        // Try to refresh token
        try {
          await revokeAuthToken(token);
          const newToken = await getAuthToken(false);
          headers.Authorization = `Bearer ${newToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          return retryResponse;
        } catch (err) {
          throw new Error("Token refresh failed");
        }
      }

      // Handle 403 Forbidden
      if (response.status === 403) {
        throw new Error("Access denied. Check OAuth2 scopes and permissions.");
      }

      // Handle 429 Too Many Requests - rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "5");
        await new Promise((resolve) =>
          setTimeout(resolve, retryAfter * 1000)
        );
        continue;
      }

      // Handle 500+ server errors with exponential backoff
      if (response.status >= 500) {
        lastError = new Error(`Server error: ${response.status}`);
        if (i < MAX_RETRIES - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY * Math.pow(2, i))
          );
          continue;
        }
        throw lastError;
      }

      // Success or client error (4xx except 401/403)
      return response;
    } catch (err) {
      lastError = err;
      if (i < MAX_RETRIES - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * Math.pow(2, i))
        );
      }
    }
  }

  throw lastError || new Error("Request failed after retries");
}

/**
 * Extract document ID from Google Docs URL
 * @param {string} url - Current window URL
 * @returns {string|null} Document ID or null if not found
 */
function extractDocId(url = null) {
  const currentUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const match = currentUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Get all revisions for a Google Doc
 * @param {string} docId - Document ID
 * @param {string} token - OAuth2 access token
 * @returns {Promise<Array>} Array of revision objects
 */
async function getRevisions(docId, token) {
  const url = `${API_BASE}/drive/v3/files/${docId}/revisions?fields=revisions(id,modifiedTime,lastModifyingUser,size,mimeType)&pageSize=1000`;

  const response = await makeAuthenticatedRequest(url, token);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch revisions: ${response.status} - ${error}`);
  }

  const data = await response.json();

  if (!data.revisions || data.revisions.length === 0) {
    return [];
  }

  // Sample large revision lists (every 5th if > 200)
  let revisions = data.revisions;
  if (revisions.length > 200) {
    const step = Math.ceil(revisions.length / 200);
    revisions = revisions.filter((_, i) => i % step === 0 || i === revisions.length - 1);
  }

  return revisions.map((rev) => ({
    id: rev.id,
    timestamp: new Date(rev.modifiedTime).getTime() / 1000, // Convert to seconds
    modifiedTime: rev.modifiedTime,
    email: rev.lastModifyingUser?.emailAddress || "unknown",
    size: rev.size || 0,
    mimeType: rev.mimeType || "text/plain",
  }));
}

/**
 * Get plain text content of a specific revision
 * @param {string} docId - Document ID
 * @param {string} revId - Revision ID
 * @param {string} token - OAuth2 access token
 * @returns {Promise<string>} Plain text content
 */
async function getRevisionContent(docId, revId, token) {
  const url = `${API_BASE}/drive/v3/files/${docId}/revisions/${revId}?alt=media`;

  const response = await makeAuthenticatedRequest(url, token);

  if (!response.ok) {
    throw new Error(`Failed to fetch revision content: ${response.status}`);
  }

  // Get text content
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("text/plain")) {
    return await response.text();
  } else if (contentType && contentType.includes("application/pdf")) {
    // For PDF, we can only count by file size approximation
    return "";
  } else {
    // For docs, try to get as text
    const blob = await response.blob();
    return await blob.text().catch(() => "");
  }
}

/**
 * Get character count from revision content
 * Uses file size as proxy if text extraction fails
 * @param {string} docId - Document ID
 * @param {object} revision - Revision object with id and size
 * @param {string} token - OAuth2 access token
 * @returns {Promise<number>} Character count estimate
 */
async function getRevisionCharCount(docId, revision, token) {
  try {
    const content = await getRevisionContent(docId, revision.id, token);
    // Return actual character count from content
    return content.length;
  } catch (err) {
    // Fallback: use file size as proxy for character count
    // Google Docs uses roughly 1 byte per character for UTF-8
    return Math.max(revision.size || 0, 0);
  }
}

/**
 * Batch fetch character counts for all revisions
 * @param {string} docId - Document ID
 * @param {Array} revisions - Array of revision objects
 * @param {string} token - OAuth2 access token
 * @returns {Promise<Array>} Revisions with charCount added
 */
async function enrichRevisionsWithCharCounts(docId, revisions, token) {
  const enriched = [];

  for (let i = 0; i < revisions.length; i++) {
    const revision = revisions[i];
    try {
      const charCount = await getRevisionCharCount(docId, revision, token);
      enriched.push({
        ...revision,
        charCount,
      });

      // Add small delay to avoid rate limiting
      if (i < revisions.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (err) {
      console.error(`Error fetching char count for revision ${revision.id}:`, err);
      // Use file size as fallback
      enriched.push({
        ...revision,
        charCount: revision.size || 0,
      });
    }
  }

  return enriched;
}

/**
 * Get document metadata including title
 * @param {string} docId - Document ID
 * @param {string} token - OAuth2 access token
 * @returns {Promise<object>} Document metadata
 */
async function getDocumentMetadata(docId, token) {
  const url = `${API_BASE}/drive/v3/files/${docId}?fields=id,name,mimeType,owners,createdTime,modifiedTime`;

  const response = await makeAuthenticatedRequest(url, token);

  if (!response.ok) {
    throw new Error(`Failed to fetch document metadata: ${response.status}`);
  }

  return await response.json();
}

// Export functions
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getAuthToken,
    revokeAuthToken,
    makeAuthenticatedRequest,
    extractDocId,
    getRevisions,
    getRevisionContent,
    getRevisionCharCount,
    enrichRevisionsWithCharCounts,
    getDocumentMetadata,
  };
}

/**
 * Background Service Worker (Manifest V3)
 * Handles OAuth2, API calls, and orchestrates analysis
 */

// Import utilities (dynamically loaded)
const API_CACHE_DURATION = 300000; // 5 minutes

/**
 * Load external script into service worker context
 * @param {string} scriptPath - Path to script file
 */
async function loadScript(scriptPath) {
  try {
    const response = await fetch(chrome.runtime.getURL(scriptPath));
    const script = await response.text();
    // eslint-disable-next-line no-eval
    eval(script);
  } catch (err) {
    console.error(`Failed to load script ${scriptPath}:`, err);
  }
}

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Open onboarding page
    chrome.tabs.create({
      url: chrome.runtime.getURL("popup/popup.html"),
    });

    // Initialize storage
    chrome.storage.local.set({
      analysisCache: {},
      settings: {
        autoAnalyze: true,
        pollInterval: 30000,
      },
    });
  }
});

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle async operations
  const handleAsync = async () => {
    try {
      switch (request.action) {
        case "ANALYZE":
          return await handleAnalyzeRequest(request, sender);

        case "GET_TOKEN":
          return await handleGetTokenRequest();

        case "REVOKE_TOKEN":
          return await handleRevokeTokenRequest();

        case "GET_CACHE":
          return await handleGetCacheRequest(request.docId);

        case "CLEAR_CACHE":
          return await handleClearCacheRequest();

        case "EXPORT_REPORT":
          return await handleExportRequest(request.analysis);

        default:
          return { error: "Unknown action" };
      }
    } catch (err) {
      console.error("Error handling message:", err);
      return { error: err.message };
    }
  };

  // Execute async handler and send response
  handleAsync()
    .then((result) => {
      sendResponse(result);
    })
    .catch((err) => {
      sendResponse({ error: err.message });
    });

  // Return true to indicate we will respond asynchronously
  return true;
});

/**
 * Handle ANALYZE request: fetch revisions and run analysis
 */
async function handleAnalyzeRequest(request, sender) {
  const { docId } = request;

  if (!docId) {
    return { error: "No document ID provided" };
  }

  // Check cache first
  const cached = await getCachedAnalysis(docId);
  if (cached && Date.now() - cached.timestamp < API_CACHE_DURATION) {
    return { success: true, data: cached.analysis, fromCache: true };
  }

  try {
    // Get OAuth token
    const token = await getAuthToken(false);

    // Load utility scripts
    await loadScript("utils/googleApi.js");
    await loadScript("utils/effortEngine.js");

    // Fetch document metadata
    const metadata = await getDocumentMetadata(docId, token);

    // Fetch revisions
    const revisions = await getRevisions(docId, token);

    if (revisions.length === 0) {
      return { error: "No revisions found for this document" };
    }

    // Enrich revisions with character counts
    const enrichedRevisions = await enrichRevisionsWithCharCounts(
      docId,
      revisions,
      token
    );

    // Run analysis
    const analysis = analyzeRevisions(enrichedRevisions);

    // Add metadata
    const fullAnalysis = {
      ...analysis,
      docId,
      docTitle: metadata.name,
      analysisTime: new Date().toISOString(),
      revisionCount: enrichedRevisions.length,
    };

    // Cache result
    await cacheAnalysis(docId, fullAnalysis);

    return { success: true, data: fullAnalysis };
  } catch (err) {
    console.error("Analysis error:", err);
    return {
      error:
        err.message ||
        "Failed to analyze document. Make sure you are the document owner.",
    };
  }
}

/**
 * Handle GET_TOKEN request: retrieve current OAuth token
 */
async function handleGetTokenRequest() {
  try {
    const token = await getAuthToken(true);
    return { success: true, token };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Handle REVOKE_TOKEN request: revoke current token
 */
async function handleRevokeTokenRequest() {
  try {
    const token = await getAuthToken(false);
    await revokeAuthToken(token);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Handle GET_CACHE request: retrieve cached analysis
 */
async function handleGetCacheRequest(docId) {
  try {
    const cached = await getCachedAnalysis(docId);
    return { success: true, data: cached };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Handle CLEAR_CACHE request: clear all cached analyses
 */
async function handleClearCacheRequest() {
  try {
    await chrome.storage.local.set({ analysisCache: {} });
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Handle EXPORT_REPORT request: generate PDF report
 */
async function handleExportRequest(analysis) {
  try {
    // Generate text report
    const report = generateTextReport(analysis);

    // In production, use a PDF library like jsPDF
    // For now, return the text that can be converted to PDF by the popup
    return { success: true, report };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Get OAuth2 access token
 * @param {boolean} interactive - Whether to show login prompt
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
 * Revoke OAuth2 token
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
 * Cache analysis result
 */
async function cacheAnalysis(docId, analysis) {
  const cache = await chrome.storage.local.get("analysisCache");
  const analysisCache = cache.analysisCache || {};

  analysisCache[docId] = {
    analysis,
    timestamp: Date.now(),
  };

  await chrome.storage.local.set({ analysisCache });
}

/**
 * Get cached analysis
 */
async function getCachedAnalysis(docId) {
  const cache = await chrome.storage.local.get("analysisCache");
  const analysisCache = cache.analysisCache || {};
  return analysisCache[docId];
}

/**
 * Generate text report from analysis
 */
function generateTextReport(analysis) {
  const {
    effortScore,
    totalTypingTime,
    pasteEvents,
    aiLikelihood,
    focusScore,
    streak,
    collaborators,
    docTitle,
    analysisTime,
  } = analysis;

  return `
╔════════════════════════════════════════════════════════════════╗
║                      SCRIPTSENSE ANALYSIS REPORT                ║
╚════════════════════════════════════════════════════════════════╝

DOCUMENT: ${docTitle}
ANALYZED: ${new Date(analysisTime).toLocaleString()}

════════════════════════════════════════════════════════════════

📊 EFFORT METRICS

  Effort Score:     ${effortScore}/100
  Focus Score:      ${focusScore}/100
  Typing Time:      ${totalTypingTime} minutes
  AI Likelihood:    ${aiLikelihood}

════════════════════════════════════════════════════════════════

📈 WRITING PATTERNS

  Paste Events:     ${pasteEvents.length}
  ${pasteEvents.map((p) => `    • ${new Date(p.at * 1000).toLocaleString()}: ${p.chars} chars`).join("\n")}

  Writing Streak:   ${streak.currentStreak} days (longest: ${streak.longestStreak} days)

════════════════════════════════════════════════════════════════

👥 COLLABORATION

${collaborators.map((c) => `  ${c.email}: ${c.percentage}% (${c.count} revisions)`).join("\n")}

════════════════════════════════════════════════════════════════

⚠️  AI RISK ASSESSMENT: ${aiLikelihood}

${
  aiLikelihood === "High"
    ? "  ⚠️  HIGH RISK - Multiple large paste events detected with minimal revisions."
    : aiLikelihood === "Medium"
      ? "  ⚠️  MEDIUM RISK - Some indicators suggest potential AI usage or copy-paste."
      : "  ✓ LOW RISK - Writing patterns consistent with genuine human effort."
}

════════════════════════════════════════════════════════════════

Generated by ScriptSense v1.0 | Not affiliated with Google
  `;
}

/**
 * Set up periodic analysis check for open documents
 * This enables live monitoring feature
 */
function setupLiveMonitoring() {
  // Poll every 30 seconds to check if we need to re-analyze
  setInterval(async () => {
    try {
      // Get current active tab
      const tabs = await chrome.tabs.query({ active: true });
      if (tabs.length === 0) return;

      const currentTab = tabs[0];
      if (!currentTab.url || !currentTab.url.includes("docs.google.com")) {
        return;
      }

      // Send message to content script to check if analysis is needed
      chrome.tabs.sendMessage(
        currentTab.id,
        { action: "CHECK_UPDATE" },
        () => {
          // Ignore errors if content script not ready
          if (chrome.runtime.lastError) {
            // Content script not ready
          }
        }
      );
    } catch (err) {
      // Silently fail if no tabs or permission issues
    }
  }, 30000);
}

// Initialize live monitoring on startup
setupLiveMonitoring();

// Log service worker status
console.log("ScriptSense background service worker loaded");

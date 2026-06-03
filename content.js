/**
 * Content Script
 * Injects ScriptSense sidebar into Google Docs via Shadow DOM
 * Handles communication between injected UI and background service worker
 */

// Prevent multiple injections
if (!window.__SCRIPTSENSE_LOADED__) {
  window.__SCRIPTSENSE_LOADED__ = true;

  /**
   * Check if current page is Google Docs editor
   */
  function isGoogleDocsEditor() {
    return (
      window.location.hostname === "docs.google.com" &&
      /\/document\/d\/([a-zA-Z0-9-_]+)/.test(window.location.href)
    );
  }

  /**
   * Extract document ID from URL
   */
  function extractDocId() {
    const match = window.location.href.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  /**
   * Create and inject Shadow DOM root for React component
   */
  function injectSidebar() {
    if (!isGoogleDocsEditor()) {
      return;
    }

    // Create container element
    const container = document.createElement("div");
    container.id = "scriptsense-container";
    container.style.all = "unset";

    // Create Shadow DOM root
    const shadowRoot = container.attachShadow({ mode: "open" });

    // Create iframe for React component to avoid style conflicts
    const iframeContainer = document.createElement("div");
    iframeContainer.id = "scriptsense-iframe-container";
    shadowRoot.appendChild(iframeContainer);

    // Create style element for Shadow DOM
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      #scriptsense-iframe-container {
        position: fixed;
        right: 0;
        top: 0;
        width: 340px;
        height: 100vh;
        z-index: 10000;
        box-sizing: border-box;
        all: unset;
      }
    `;
    shadowRoot.appendChild(styleElement);

    // Append to document body
    document.body.appendChild(container);

    // Load the sidebar HTML into a new frame
    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.margin = "0";
    iframe.style.padding = "0";
    iframe.src = chrome.runtime.getURL("sidebar/sidebar.html");
    iframeContainer.appendChild(iframe);

    // Set up message bridge between iframe and content script
    setupIframeMessageBridge(iframe);
  }

  /**
   * Set up two-way communication between iframe and content script
   */
  function setupIframeMessageBridge(iframe) {
    // Listen for messages from iframe
    window.addEventListener("message", (event) => {
      // Only accept messages from our iframe
      if (event.source !== iframe.contentWindow) {
        return;
      }

      // Handle different message types
      switch (event.data.type) {
        case "SCRIPTSENSE_ANALYZE":
          handleAnalyzeRequest(event.data);
          break;

        case "SCRIPTSENSE_GET_DOC_ID":
          handleGetDocIdRequest();
          break;

        case "SCRIPTSENSE_CLOSE_SIDEBAR":
          handleCloseSidebar();
          break;

        default:
          break;
      }
    });

    // Send initial doc ID to iframe
    setTimeout(() => {
      const docId = extractDocId();
      iframe.contentWindow.postMessage(
        {
          type: "SCRIPTSENSE_INIT",
          docId,
        },
        "*"
      );
    }, 500);
  }

  /**
   * Handle analyze request from sidebar
   */
  function handleAnalyzeRequest(message) {
    const docId = extractDocId();

    if (!docId) {
      sendToIframe({
        type: "SCRIPTSENSE_ERROR",
        error: "Could not extract document ID",
      });
      return;
    }

    // Send analyze request to background service worker
    chrome.runtime.sendMessage(
      {
        action: "ANALYZE",
        docId,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          sendToIframe({
            type: "SCRIPTSENSE_ERROR",
            error: chrome.runtime.lastError.message,
          });
        } else if (response && response.error) {
          sendToIframe({
            type: "SCRIPTSENSE_ERROR",
            error: response.error,
          });
        } else {
          sendToIframe({
            type: "SCRIPTSENSE_ANALYSIS_RESULT",
            data: response.data,
            fromCache: response.fromCache,
          });
        }
      }
    );
  }

  /**
   * Handle get document ID request
   */
  function handleGetDocIdRequest() {
    const docId = extractDocId();
    sendToIframe({
      type: "SCRIPTSENSE_DOC_ID",
      docId,
    });
  }

  /**
   * Handle close sidebar request
   */
  function handleCloseSidebar() {
    const container = document.getElementById("scriptsense-container");
    if (container) {
      container.style.display = "none";
    }
  }

  /**
   * Send message to iframe
   */
  function sendToIframe(message) {
    const container = document.getElementById("scriptsense-container");
    if (container && container.shadowRoot) {
      const iframe = container.shadowRoot.querySelector("iframe");
      if (iframe) {
        iframe.contentWindow.postMessage(message, "*");
      }
    }
  }

  /**
   * Handle messages from background script
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case "CHECK_UPDATE":
        // Live monitoring check - can trigger re-analysis if needed
        sendResponse({ status: "ok" });
        break;

      default:
        sendResponse({ error: "Unknown action" });
    }
  });

  /**
   * Inject sidebar when document is ready
   */
  function waitForGoogleDocsReady() {
    // Wait for Google Docs UI to fully load
    const checkReady = setInterval(() => {
      if (isGoogleDocsEditor()) {
        clearInterval(checkReady);
        injectSidebar();
      }
    }, 1000);

    // Also try immediate injection
    if (document.readyState === "complete" || document.readyState === "interactive") {
      if (isGoogleDocsEditor()) {
        injectSidebar();
      }
    }
  }

  // Initialize on script load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForGoogleDocsReady);
  } else {
    waitForGoogleDocsReady();
  }

  // Log successful injection
  console.log("ScriptSense content script injected");
}

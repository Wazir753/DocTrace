/**
 * DocTrace Popup Component
 * Mini popup for authentication, quick stats, and extension controls
 */

import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function Popup() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    checkAuthStatus();

    // Get last analysis from cache
    getLastAnalysis();
  }, []);

  const checkAuthStatus = async () => {
    try {
      chrome.runtime.sendMessage(
        { action: "GET_TOKEN" },
        (response) => {
          if (response && !response.error) {
            setIsLoggedIn(true);
          }
        }
      );
    } catch (err) {
      console.error("Auth check error:", err);
    }
  };

  const getLastAnalysis = async () => {
    try {
      const cache = await new Promise((resolve) => {
        chrome.storage.local.get("analysisCache", (result) => {
          resolve(result.analysisCache || {});
        });
      });

      // Get most recent analysis
      const analyses = Object.values(cache);
      if (analyses.length > 0) {
        analyses.sort((a, b) => b.timestamp - a.timestamp);
        setLastAnalysis(analyses[0].analysis);
      }
    } catch (err) {
      console.error("Error getting last analysis:", err);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      chrome.runtime.sendMessage(
        { action: "GET_TOKEN" },
        (response) => {
          setIsLoading(false);
          if (response && response.token) {
            setIsLoggedIn(true);
          } else if (response && response.error) {
            setError(response.error);
          }
        }
      );
    } catch (err) {
      setIsLoading(false);
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      chrome.runtime.sendMessage(
        { action: "REVOKE_TOKEN" },
        (response) => {
          if (response && !response.error) {
            setIsLoggedIn(false);
            setLastAnalysis(null);
          }
        }
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClearCache = async () => {
    try {
      chrome.runtime.sendMessage(
        { action: "CLEAR_CACHE" },
        (response) => {
          if (response && !response.error) {
            setLastAnalysis(null);
          }
        }
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenSidebar = () => {
    chrome.tabs.query({ active: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "SHOW_SIDEBAR" });
      }
    });
    window.close();
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#0a0a0f",
        color: "#f0e6d3",
        padding: "20px",
      }}
    >
      <style>
        {`
          body {
            margin: 0;
            padding: 0;
          }
        `}
      </style>

      {/* Header */}
      <div
        style={{
          marginBottom: "20px",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontFamily: '"Playfair Display", serif',
            marginBottom: "8px",
            color: "#c8922a",
          }}
        >
          DocTrace
        </h1>
        <p
          style={{
            fontSize: "11px",
            color: "#5a5a7a",
            margin: "0",
          }}
        >
          Google Docs Writing Effort Analyzer
        </p>
      </div>

      {/* Auth Section */}
      {!isLoggedIn ? (
        <div
          style={{
            background: "#111120",
            border: "1px solid #1e1e2e",
            borderRadius: "4px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              marginBottom: "12px",
              color: "#f0e6d3",
            }}
          >
            👋 Welcome to DocTrace
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#5a5a7a",
              marginBottom: "12px",
              lineHeight: "1.5",
            }}
          >
            Sign in with your Google account to analyze your document's writing
            effort and detect AI usage patterns.
          </div>
          <button
            onClick={handleLogin}
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "10px",
              background: "#c8922a",
              color: "#0a0a0f",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: '"Playfair Display", serif',
              fontWeight: "bold",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = "#d4a546";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = "#c8922a";
              }
            }}
          >
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </button>
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          {lastAnalysis && (
            <div
              style={{
                background: "#111120",
                border: "1px solid #1e1e2e",
                borderRadius: "4px",
                padding: "16px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  marginBottom: "12px",
                  color: "#c8922a",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Last Analysis
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#5a5a7a",
                      marginBottom: "4px",
                    }}
                  >
                    Effort Score
                  </div>
                  <div
                    style={{
                      fontSize: "20px",
                      fontFamily: '"Playfair Display", serif',
                      fontWeight: "bold",
                      color: "#f0e6d3",
                    }}
                  >
                    {lastAnalysis.effortScore}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#5a5a7a",
                      marginBottom: "4px",
                    }}
                  >
                    AI Risk
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontFamily: '"Playfair Display", serif',
                      fontWeight: "bold",
                      color:
                        lastAnalysis.aiLikelihood === "High"
                          ? "#d32f2f"
                          : lastAnalysis.aiLikelihood === "Medium"
                            ? "#ff9800"
                            : "#4caf50",
                    }}
                  >
                    {lastAnalysis.aiLikelihood}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#5a5a7a",
                      marginBottom: "4px",
                    }}
                  >
                    Typing Time
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontFamily: '"Playfair Display", serif',
                      fontWeight: "bold",
                      color: "#c8922a",
                    }}
                  >
                    {lastAnalysis.totalTypingTime}m
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#5a5a7a",
                      marginBottom: "4px",
                    }}
                  >
                    Paste Events
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontFamily: '"Playfair Display", serif',
                      fontWeight: "bold",
                      color:
                        lastAnalysis.pasteEvents.length > 0
                          ? "#ff9800"
                          : "#4caf50",
                    }}
                  >
                    {lastAnalysis.pasteEvents.length}
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: "10px",
                  color: "#5a5a7a",
                  marginBottom: "12px",
                }}
              >
                Document: {lastAnalysis.docTitle}
              </div>

              <button
                onClick={handleOpenSidebar}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "#c8922a",
                  color: "#0a0a0f",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontFamily: '"Playfair Display", serif',
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#d4a546";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#c8922a";
                }}
              >
                View Full Analysis
              </button>
            </div>
          )}

          {/* No Analysis Yet */}
          {!lastAnalysis && (
            <div
              style={{
                background: "#111120",
                border: "1px solid #1e1e2e",
                borderRadius: "4px",
                padding: "16px",
                marginBottom: "16px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "32px",
                  marginBottom: "8px",
                }}
              >
                📊
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#5a5a7a",
                  marginBottom: "12px",
              }}
              >
                No analysis yet. Open a Google Doc to get started!
              </div>
            </div>
          )}

          {/* Account Section */}
          <div
            style={{
              background: "#111120",
              border: "1px solid #1e1e2e",
              borderRadius: "4px",
              padding: "12px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                marginBottom: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: "#5a5a7a" }}>Logged in</span>
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#4caf50",
                }}
              />
            </div>

            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "6px",
                background: "transparent",
                color: "#5a5a7a",
                border: "1px solid #1e1e2e",
                borderRadius: "3px",
                fontSize: "10px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                marginBottom: "8px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#d32f2f";
                e.currentTarget.style.borderColor = "#d32f2f";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#5a5a7a";
                e.currentTarget.style.borderColor = "#1e1e2e";
              }}
            >
              Sign Out
            </button>

            <button
              onClick={handleClearCache}
              style={{
                width: "100%",
                padding: "6px",
                background: "transparent",
                color: "#5a5a7a",
                border: "1px solid #1e1e2e",
                borderRadius: "3px",
                fontSize: "10px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ff9800";
                e.currentTarget.style.borderColor = "#ff9800";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#5a5a7a";
                e.currentTarget.style.borderColor = "#1e1e2e";
              }}
            >
              Clear Cache
            </button>
          </div>
        </>
      )}

      {/* Error Message */}
      {error && (
        <div
          style={{
            background: "rgba(211, 47, 47, 0.1)",
            border: "1px solid #d32f2f",
            borderRadius: "4px",
            padding: "12px",
            fontSize: "11px",
            color: "#ff6b6b",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          fontSize: "9px",
          color: "#5a5a7a",
          textAlign: "center",
          marginTop: "20px",
        }}
      >
        <div style={{ marginBottom: "8px" }}>DocTrace v1.0</div>
        <div>Not affiliated with Google</div>
      </div>
    </div>
  );
}

// Render app
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("Root element not found");
  } else {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<Popup />);
    console.log("DocTrace popup rendered successfully");
  }
} catch (err) {
  console.error("Failed to render DocTrace popup:", err);
  document.body.innerHTML = `<div style="color: #f0e6d3; padding: 20px; background: #0a0a0f; font-family: monospace; white-space: pre-wrap;">Error: ${err.message}</div>`;
}

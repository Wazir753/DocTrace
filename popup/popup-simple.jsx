/**
 * DocTrace Popup Component - Simplified
 * Mini popup for authentication, quick stats, and extension controls
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function Popup() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthStatus();
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

  return React.createElement('div', {
    style: {
      width: '100%',
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#f0e6d3',
      padding: '20px',
      fontFamily: '"DM Mono", monospace',
    }
  },
    React.createElement('div', { style: { marginBottom: '20px' } },
      React.createElement('h1', {
        style: {
          fontSize: '20px',
          fontFamily: '"Playfair Display", serif',
          marginBottom: '8px',
          color: '#c8922a',
          margin: '0 0 8px 0',
        }
      }, 'DocTrace'),
      React.createElement('p', {
        style: {
          fontSize: '11px',
          color: '#5a5a7a',
          margin: '0',
        }
      }, 'Google Docs Writing Effort Analyzer')
    ),
    !isLoggedIn ? React.createElement('div', {
      style: {
        background: '#111120',
        border: '1px solid #1e1e2e',
        borderRadius: '4px',
        padding: '16px',
        marginBottom: '16px',
      }
    },
      React.createElement('div', { style: { fontSize: '12px', marginBottom: '12px', color: '#f0e6d3' } }, '👋 Welcome to DocTrace'),
      React.createElement('div', {
        style: {
          fontSize: '11px',
          color: '#5a5a7a',
          marginBottom: '12px',
          lineHeight: '1.5',
        }
      }, 'Sign in with your Google account to analyze your document\'s writing effort and detect AI usage patterns.'),
      React.createElement('button', {
        onClick: handleLogin,
        disabled: isLoading,
        style: {
          width: '100%',
          padding: '10px',
          background: '#c8922a',
          color: '#0a0a0f',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: '"Playfair Display", serif',
          fontWeight: 'bold',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
        }
      }, isLoading ? 'Signing in...' : 'Sign in with Google')
    ) : React.createElement('div', null,
      lastAnalysis && React.createElement('div', {
        style: {
          background: '#111120',
          border: '1px solid #1e1e2e',
          borderRadius: '4px',
          padding: '16px',
          marginBottom: '16px',
        }
      },
        React.createElement('div', {
          style: {
            fontSize: '12px',
            marginBottom: '12px',
            color: '#c8922a',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }
        }, 'Last Analysis'),
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' } },
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: '10px', color: '#5a5a7a', marginBottom: '4px' } }, 'Effort Score'),
            React.createElement('div', { style: { fontSize: '20px', fontFamily: '"Playfair Display", serif', fontWeight: 'bold', color: '#f0e6d3' } }, lastAnalysis.effortScore)
          ),
          React.createElement('div', null,
            React.createElement('div', { style: { fontSize: '10px', color: '#5a5a7a', marginBottom: '4px' } }, 'AI Risk'),
            React.createElement('div', { style: { fontSize: '14px', fontFamily: '"Playfair Display", serif', fontWeight: 'bold', color: '#4caf50' } }, lastAnalysis.aiLikelihood)
          )
        )
      ),
      !lastAnalysis && React.createElement('div', {
        style: {
          background: '#111120',
          border: '1px solid #1e1e2e',
          borderRadius: '4px',
          padding: '16px',
          marginBottom: '16px',
          textAlign: 'center',
        }
      },
        React.createElement('div', { style: { fontSize: '32px', marginBottom: '8px' } }, '📊'),
        React.createElement('div', { style: { fontSize: '12px', color: '#5a5a7a' } }, 'No analysis yet. Open a Google Doc to get started!')
      ),
      React.createElement('div', {
        style: {
          background: '#111120',
          border: '1px solid #1e1e2e',
          borderRadius: '4px',
          padding: '12px',
        }
      },
        React.createElement('button', {
          onClick: handleLogout,
          style: {
            width: '100%',
            padding: '6px',
            background: 'transparent',
            color: '#5a5a7a',
            border: '1px solid #1e1e2e',
            borderRadius: '3px',
            fontSize: '10px',
            cursor: 'pointer',
            marginBottom: '8px',
          }
        }, 'Sign Out'),
        React.createElement('button', {
          onClick: handleClearCache,
          style: {
            width: '100%',
            padding: '6px',
            background: 'transparent',
            color: '#5a5a7a',
            border: '1px solid #1e1e2e',
            borderRadius: '3px',
            fontSize: '10px',
            cursor: 'pointer',
          }
        }, 'Clear Cache')
      )
    ),
    error && React.createElement('div', {
      style: {
        background: 'rgba(211, 47, 47, 0.1)',
        border: '1px solid #d32f2f',
        borderRadius: '4px',
        padding: '12px',
        fontSize: '11px',
        color: '#ff6b6b',
        marginBottom: '16px',
      }
    }, error)
  );
}

// Initialize rendering
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  try {
    const container = document.getElementById('root');
    if (!container) {
      throw new Error('Root element not found!');
    }
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(Popup));
    console.log('✅ DocTrace popup initialized');
  } catch (err) {
    console.error('❌ Render error:', err);
    const html = `
      <div style="color: #f0e6d3; padding: 20px; background: #0a0a0f; font-family: monospace; font-size: 12px; line-height: 1.6;">
        <div style="color: #d32f2f; margin-bottom: 10px;">⚠️ Initialization Error</div>
        <div>${err.message}</div>
      </div>
    `;
    document.body.innerHTML = html;
  }
}

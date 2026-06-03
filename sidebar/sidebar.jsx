/**
 * DocTrace Sidebar Component
 * Main React component for the effort analyzer sidebar in Google Docs
 * Features: Effort scoring, session tracking, paste detection, AI risk analysis
 */

import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

/**
 * SVG Quill Icon
 */
function QuillIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M19 4L5 18m0-14l-3 3c-.5.5-.5 1.3 0 1.8l12 12c.5.5 1.3.5 1.8 0l3-3" />
      <circle cx="18" cy="5" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * AnimatedEffortRing Component
 * SVG circular progress ring with animated stroke
 */
function AnimatedEffortRing({ score }) {
  const svgRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 1400);
    return () => clearTimeout(timer);
  }, [score]);

  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (score / 100) * circumference;

  // Determine color based on score
  let color = "#d32f2f"; // red for low
  if (score >= 40 && score < 70) {
    color = "#b8860b"; // dark gold
  } else if (score >= 70) {
    color = "#c8922a"; // amber
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        margin: "24px 0",
      }}
    >
      <div style={{ position: "relative", width: "152px", height: "152px" }}>
        <svg
          ref={svgRef}
          width="152"
          height="152"
          viewBox="0 0 152 152"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background circle */}
          <circle
            cx="76"
            cy="76"
            r="70"
            fill="none"
            stroke="#1e1e2e"
            strokeWidth="3"
          />
          {/* Progress circle */}
          <circle
            cx="76"
            cy="76"
            r="70"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={isAnimating ? circumference : offset}
            strokeLinecap="round"
            style={{
              transition: isAnimating
                ? "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)"
                : "none",
            }}
          />
        </svg>

        {/* Center content */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "46px",
              fontWeight: "bold",
              fontFamily: '"Playfair Display", serif',
              color,
              letterSpacing: "2px",
            }}
          >
            {score}
          </div>
          <div
            style={{
              fontSize: "8px",
              letterSpacing: "3px",
              color: "#5a5a7a",
              marginTop: "4px",
              fontFamily: '"DM Mono", monospace',
            }}
          >
            EFFORT SCORE
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * StatCard Component
 * Individual stat card with animation
 */
function StatCard({ label, value, color, badgeColor, badgeText, delay }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      style={{
        padding: "12px",
        background: "#111120",
        border: "1px solid #1e1e2e",
        borderRadius: "4px",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(8px)",
        transition: "all 0.3s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow =
          "0 0 12px rgba(200, 146, 42, 0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          fontSize: "8px",
          color: "#5a5a7a",
          letterSpacing: "2px",
          textTransform: "uppercase",
          fontFamily: '"DM Mono", monospace',
          marginBottom: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{label}</span>
        {badgeColor && (
          <span
            style={{
              display: "inline-block",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: badgeColor,
            }}
          />
        )}
      </div>
      <div
        style={{
          fontSize: "22px",
          fontWeight: "bold",
          fontFamily: '"Playfair Display", serif',
          color: color || "#f0e6d3",
        }}
      >
        {value}
      </div>
      {badgeText && (
        <div
          style={{
            fontSize: "7px",
            color: badgeColor || "#f0e6d3",
            marginTop: "4px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          {badgeText}
        </div>
      )}
    </div>
  );
}

/**
 * StatGrid Component (2x2)
 */
function StatGrid({ analysis }) {
  const getRiskBadgeColor = (risk) => {
    switch (risk) {
      case "High":
        return "#d32f2f";
      case "Medium":
        return "#ff9800";
      default:
        return "#4caf50";
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "8px",
        margin: "16px 0",
      }}
    >
      <StatCard
        label="Typing Time"
        value={`${analysis.totalTypingTime}m`}
        color="#c8922a"
        delay={400}
      />
      <StatCard
        label="Paste Events"
        value={analysis.pasteEvents.length}
        color={analysis.pasteEvents.length > 0 ? "#ff9800" : "#4caf50"}
        delay={480}
      />
      <StatCard
        label="Idle Gaps"
        value={analysis.idleGaps.length}
        color="#5a5a7a"
        delay={560}
      />
      <StatCard
        label="AI Risk"
        value={analysis.aiLikelihood}
        color={getRiskBadgeColor(analysis.aiLikelihood)}
        badgeColor={getRiskBadgeColor(analysis.aiLikelihood)}
        delay={640}
      />
    </div>
  );
}

/**
 * WritingVelocityChart Component
 */
function WritingVelocityChart({ velocityData }) {
  if (!velocityData || velocityData.length === 0) {
    return (
      <div
        style={{
          fontSize: "12px",
          color: "#5a5a7a",
          padding: "12px",
          textAlign: "center",
        }}
      >
        No velocity data available
      </div>
    );
  }

  return (
    <div style={{ margin: "16px 0" }}>
      <h3
        style={{
          fontSize: "13px",
          fontFamily: '"Playfair Display", serif',
          marginBottom: "12px",
          color: "#f0e6d3",
        }}
      >
        Writing Velocity
      </h3>
      <div
        style={{
          background: "#111120",
          border: "1px solid #1e1e2e",
          borderRadius: "4px",
          padding: "8px",
          minHeight: "85px",
          display: "flex",
          alignItems: "flex-end",
          gap: "4px",
        }}
      >
        {velocityData.map((item, idx) => {
          const maxWpm = Math.max(...velocityData.map((d) => d.wpm || 0)) || 60;
          const height = (item.wpm / maxWpm) * 100;

          return (
            <div
              key={idx}
              style={{
                flex: 1,
                height: `${Math.max(height, 10)}%`,
                background: "#c8922a",
                borderRadius: "2px 2px 0 0",
                opacity: 0.8,
                transition: "all 0.2s ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.8";
              }}
              title={`${item.date}: ${item.wpm} WPM`}
            />
          );
        })}
      </div>
      <div
        style={{
          fontSize: "8px",
          color: "#5a5a7a",
          marginTop: "8px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Last 7 Days</span>
        <span>Words per Minute</span>
      </div>
    </div>
  );
}

/**
 * SessionLog Component
 */
function SessionLog({ sessions }) {
  return (
    <div style={{ margin: "16px 0" }}>
      <h3
        style={{
          fontSize: "13px",
          fontFamily: '"Playfair Display", serif',
          marginBottom: "8px",
          color: "#f0e6d3",
        }}
      >
        Session Log
      </h3>
      <div
        style={{
          background: "#111120",
          border: "1px solid #1e1e2e",
          borderRadius: "4px",
          maxHeight: "160px",
          overflowY: "auto",
          fontSize: "11px",
        }}
      >
        {sessions && sessions.length > 0 ? (
          sessions.map((session, idx) => (
            <div
              key={idx}
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #1e1e2e",
                background: idx % 2 === 0 ? "#0d0d1a" : "#101020",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: "#5a5a7a", flex: 1 }}>
                {new Date(session.date).toLocaleDateString()}
              </span>
              <span style={{ color: "#f0e6d3", flex: 1, textAlign: "center" }}>
                {session.durationMinutes}m
              </span>
              <span
                style={{
                  color: "#4caf50",
                  flex: 1,
                  textAlign: "right",
                }}
              >
                +{session.charCount}
              </span>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: "16px",
              textAlign: "center",
              color: "#5a5a7a",
            }}
          >
            No sessions recorded
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * PasteEventsAccordion Component
 */
function PasteEventsAccordion({ pasteEvents, aiLikelihood }) {
  const [isOpen, setIsOpen] = useState(false);

  const getRiskColor = (chars) => {
    return chars > 500 ? "#d32f2f" : "#ff9800";
  };

  return (
    <div style={{ margin: "16px 0" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "12px",
          background: "#111120",
          border: `1px solid ${aiLikelihood === "High" ? "#d32f2f" : "#1e1e2e"}`,
          borderRadius: "4px",
          color: "#f0e6d3",
          cursor: "pointer",
          fontSize: "13px",
          fontFamily: '"Playfair Display", serif',
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          transition: "all 0.2s ease",
          boxShadow:
            aiLikelihood === "High"
              ? "0 0 12px rgba(211, 47, 47, 0.2)"
              : "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#161630";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#111120";
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {aiLikelihood === "High" && (
            <span style={{ color: "#d32f2f" }}>⚠</span>
          )}
          Paste Events ({pasteEvents.length})
        </span>
        <span
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            marginTop: "4px",
            background: "#111120",
            border: "1px solid #1e1e2e",
            borderRadius: "4px",
            maxHeight: "200px",
            overflowY: "auto",
            animation: "slideDown 0.2s ease",
          }}
        >
          {pasteEvents && pasteEvents.length > 0 ? (
            pasteEvents.map((event, idx) => (
              <div
                key={idx}
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid #1e1e2e",
                  fontSize: "11px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#5a5a7a", flex: 1 }}>
                  {new Date(event.at * 1000).toLocaleTimeString()}
                </span>
                <span style={{ color: "#f0e6d3", flex: 1, textAlign: "center" }}>
                  {event.chars} chars
                </span>
                <span
                  style={{
                    display: "inline-block",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: getRiskColor(event.chars),
                  }}
                />
              </div>
            ))
          ) : (
            <div
              style={{
                padding: "16px",
                textAlign: "center",
                color: "#5a5a7a",
              }}
            >
              No paste events detected
            </div>
          )}
        </div>
      )}

      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              max-height: 0;
            }
            to {
              opacity: 1;
              max-height: 200px;
            }
          }
        `}
      </style>
    </div>
  );
}

/**
 * Main Sidebar Component
 */
function Sidebar() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [docId, setDocId] = useState(null);
  const [docTitle, setDocTitle] = useState("Document");
  const [isVisible, setIsVisible] = useState(true);
  const iframeRef = useRef(null);

  useEffect(() => {
    // Initialize message listener
    window.addEventListener("message", handleWindowMessage);
    return () => window.removeEventListener("message", handleWindowMessage);
  }, []);

  const handleWindowMessage = (event) => {
    switch (event.data.type) {
      case "SCRIPTSENSE_INIT":
        setDocId(event.data.docId);
        break;

      case "SCRIPTSENSE_ANALYSIS_RESULT":
        setAnalysis(event.data.data);
        setDocTitle(event.data.data?.docTitle || "Document");
        setLoading(false);
        break;

      case "SCRIPTSENSE_ERROR":
        setError(event.data.error);
        setLoading(false);
        break;

      default:
        break;
    }
  };

  const handleAnalyze = () => {
    setLoading(true);
    setError(null);
    window.parent.postMessage(
      { type: "SCRIPTSENSE_ANALYZE" },
      "*"
    );
  };

  const handleClose = () => {
    setIsVisible(false);
    window.parent.postMessage(
      { type: "SCRIPTSENSE_CLOSE_SIDEBAR" },
      "*"
    );
  };

  const handleExport = () => {
    if (!analysis) return;

    const report = generateReport(analysis);
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(report)
    );
    element.setAttribute(
      "download",
      `ScriptSense_Report_${new Date().toISOString().split("T")[0]}.txt`
    );
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const generateReport = (analysis) => {
    return `
╔════════════════════════════════════════════════════════════════╗
║                      SCRIPTSENSE ANALYSIS REPORT                ║
╚════════════════════════════════════════════════════════════════╝

DOCUMENT: ${analysis.docTitle}
ANALYZED: ${new Date(analysis.analysisTime).toLocaleString()}

════════════════════════════════════════════════════════════════

📊 EFFORT METRICS

  Effort Score:     ${analysis.effortScore}/100
  Focus Score:      ${analysis.focusScore}/100
  Typing Time:      ${analysis.totalTypingTime} minutes
  AI Likelihood:    ${analysis.aiLikelihood}

════════════════════════════════════════════════════════════════

📈 WRITING PATTERNS

  Paste Events:     ${analysis.pasteEvents.length}
  Idle Gaps:        ${analysis.idleGaps.length}
  Total Sessions:   ${analysis.sessions.length}
  Total Revisions:  ${analysis.revisionCount}

════════════════════════════════════════════════════════════════

🔥 WRITING STREAK

  Current: ${analysis.streak.currentStreak} days
  Longest: ${analysis.streak.longestStreak} days
  Last Active: ${analysis.streak.lastActiveDate}

════════════════════════════════════════════════════════════════

👥 COLLABORATION

${analysis.collaborators.map((c) => `  ${c.email}: ${c.percentage}% (${c.count} revisions)`).join("\n")}

════════════════════════════════════════════════════════════════

⚠️  AI RISK ASSESSMENT: ${analysis.aiLikelihood}

${
  analysis.aiLikelihood === "High"
    ? "  ⚠️  HIGH RISK - Multiple large paste events with minimal revisions."
    : analysis.aiLikelihood === "Medium"
      ? "  ⚠️  MEDIUM RISK - Some indicators suggest potential AI usage."
      : "  ✓ LOW RISK - Writing patterns consistent with genuine human effort."
}

════════════════════════════════════════════════════════════════

Generated by ScriptSense v1.0 | Not affiliated with Google
    `;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        width: "340px",
        minHeight: "100vh",
        background: "#0a0a0f",
        borderLeft: "3px solid",
        borderImage: "linear-gradient(to bottom, #c8922a, transparent) 1",
        position: "relative",
        animation: "slideInRight 0.4s ease",
      }}
    >
      <style>
        {`
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>

      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #1e1e2e",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ color: "#c8922a" }}>
            <QuillIcon />
          </div>
          <span
            style={{
              fontSize: "17px",
              fontFamily: '"Playfair Display", serif',
              fontWeight: "bold",
            }}
          >
            ScriptSense
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#4caf50",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontSize: "8px",
                letterSpacing: "1px",
                color: "#5a5a7a",
              }}
            >
              LIVE
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              color: "#5a5a7a",
              cursor: "pointer",
              fontSize: "18px",
              padding: "0",
              width: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#f0e6d3";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#5a5a7a";
            }}
          >
            ×
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
        `}
      </style>

      {/* Doc Label */}
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid #1e1e2e",
          fontSize: "8px",
          color: "#5a5a7a",
        }}
      >
        <span>ANALYZING · </span>
        <span style={{ color: "#c8922a", fontSize: "10px" }}>
          {docTitle.substring(0, 30)}
          {docTitle.length > 30 ? "..." : ""}
        </span>
      </div>

      {/* Main Content */}
      <div style={{ padding: "16px", overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 0",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "2px solid #1e1e2e",
                borderTop: "2px solid #c8922a",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <div
              style={{
                marginTop: "16px",
                fontSize: "12px",
                color: "#5a5a7a",
                textAlign: "center",
              }}
            >
              Analyzing document...
            </div>
          </div>
        ) : error ? (
          <div
            style={{
              background: "rgba(211, 47, 47, 0.1)",
              border: "1px solid #d32f2f",
              borderRadius: "4px",
              padding: "12px",
              color: "#ff6b6b",
              fontSize: "12px",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
              Analysis Error
            </div>
            {error}
          </div>
        ) : analysis ? (
          <>
            {/* Effort Ring */}
            <AnimatedEffortRing score={analysis.effortScore} />

            {/* Stat Grid */}
            <StatGrid analysis={analysis} />

            {/* Velocity Chart */}
            <WritingVelocityChart velocityData={analysis.velocityData} />

            {/* Session Log */}
            <SessionLog sessions={analysis.sessions} />

            {/* Paste Events Accordion */}
            <PasteEventsAccordion
              pasteEvents={analysis.pasteEvents}
              aiLikelihood={analysis.aiLikelihood}
            />

            {/* Export Button */}
            <button
              onClick={handleExport}
              style={{
                width: "100%",
                padding: "12px",
                background: "#c8922a",
                color: "#0a0a0f",
                border: "none",
                borderRadius: "4px",
                fontSize: "14px",
                fontFamily: '"Playfair Display", serif',
                fontWeight: "bold",
                cursor: "pointer",
                marginTop: "16px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#d4a546";
                e.currentTarget.style.boxShadow =
                  "0 0 12px rgba(200, 146, 42, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#c8922a";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Analyze Full Report →
            </button>

            {/* Footer */}
            <div
              style={{
                fontSize: "8px",
                color: "#5a5a7a",
                textAlign: "center",
                marginTop: "12px",
              }}
            >
              ScriptSense v1.0 · Not affiliated with Google
            </div>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 0",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "32px",
                marginBottom: "16px",
              }}
            >
              📊
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#5a5a7a",
                marginBottom: "16px",
              }}
            >
              Ready to analyze your writing effort?
            </div>
            <button
              onClick={handleAnalyze}
              style={{
                padding: "10px 20px",
                background: "#c8922a",
                color: "#0a0a0f",
                border: "none",
                borderRadius: "4px",
                fontSize: "12px",
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
              Start Analysis
            </button>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
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
    root.render(<Sidebar />);
    console.log("DocTrace sidebar rendered successfully");
  }
} catch (err) {
  console.error("Failed to render DocTrace sidebar:", err);
  document.body.innerHTML = `<div style="color: #f0e6d3; padding: 20px; background: #0a0a0f; font-family: monospace; white-space: pre-wrap;">Error: ${err.message}</div>`;
}

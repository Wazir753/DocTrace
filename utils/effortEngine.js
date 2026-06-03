/**
 * Writing Effort Analysis Engine
 * Analyzes document revisions to detect typing patterns, paste events, idle gaps, and AI likelihood
 */

const PASTE_THRESHOLD_CHARS = 150;
const PASTE_TIME_WINDOW = 4; // seconds
const IDLE_THRESHOLD = 120; // seconds
const MAX_HUMAN_TYPING_SPEED = 6; // chars per second
const MIN_TYPING_SPEED = 0.1; // chars per second

/**
 * Analyze consecutive revisions to detect paste events
 * @param {object} revA - First revision
 * @param {object} revB - Second revision (comes after revA)
 * @returns {object|null} Paste event or null if not detected
 */
function detectPasteEvent(revA, revB) {
  const timeDiff = revB.timestamp - revA.timestamp;
  const charsDiff = revB.charCount - revA.charCount;

  // Paste detection: large character change in very short time
  if (
    charsDiff > PASTE_THRESHOLD_CHARS &&
    timeDiff > 0 &&
    timeDiff < PASTE_TIME_WINDOW
  ) {
    return {
      at: revB.timestamp,
      chars: charsDiff,
      duration: timeDiff,
      email: revB.email,
    };
  }

  return null;
}

/**
 * Analyze consecutive revisions to detect idle gaps
 * @param {object} revA - First revision
 * @param {object} revB - Second revision
 * @returns {object|null} Idle gap or null if not detected
 */
function detectIdleGap(revA, revB) {
  const timeDiff = revB.timestamp - revA.timestamp;

  // Idle detection: gap > 2 minutes
  if (timeDiff > IDLE_THRESHOLD) {
    return {
      duration: timeDiff,
      at: revB.timestamp,
      durationMinutes: Math.round(timeDiff / 60),
    };
  }

  return null;
}

/**
 * Detect voice dictation by looking for minimal backspace activity
 * @param {object} revA - First revision
 * @param {object} revB - Second revision
 * @returns {boolean} True if likely dictation
 */
function detectDictation(revA, revB) {
  const charsDiff = revB.charCount - revA.charCount;
  const timeDiff = revB.timestamp - revA.timestamp;

  // Dictation heuristic: many characters added with minimal edits/pauses
  // If someone types 500+ chars in <30 seconds with no character deletions
  // This is likely dictation or pasting
  if (charsDiff > 500 && timeDiff < 30 && timeDiff > 0) {
    return true;
  }

  return false;
}

/**
 * Calculate human typing time between two revisions
 * @param {object} revA - First revision
 * @param {object} revB - Second revision
 * @returns {object} { typingTime, charsPerSecond, isDictation, isPaste }
 */
function calculateTypingMetrics(revA, revB, pasteEvent) {
  const timeDiff = revB.timestamp - revA.timestamp;
  const charsDiff = revB.charCount - revA.charCount;

  // Skip if invalid data
  if (timeDiff <= 0 || charsDiff < 0) {
    return { typingTime: 0, charsPerSecond: 0, isDictation: false, isPaste: false };
  }

  const charsPerSecond = timeDiff > 0 ? charsDiff / timeDiff : 0;
  const isDictation = detectDictation(revA, revB);

  // Count as typing time only if:
  // 1. Not a paste event
  // 2. Character addition rate is humanly possible (0.1-6 chars/sec)
  // 3. Not detected as dictation
  const isPaste = pasteEvent !== null;
  const isHumanTyping =
    !isPaste &&
    charsPerSecond >= MIN_TYPING_SPEED &&
    charsPerSecond <= MAX_HUMAN_TYPING_SPEED &&
    !isDictation;

  let typingTime = 0;
  if (isHumanTyping && timeDiff <= IDLE_THRESHOLD) {
    typingTime = timeDiff;
  }

  return {
    typingTime,
    charsPerSecond,
    isDictation,
    isPaste,
  };
}

/**
 * Detect AI-generated content patterns
 * @param {Array} revisions - All revisions
 * @param {Array} pasteEvents - Detected paste events
 * @returns {string} AI likelihood: "Low", "Medium", or "High"
 */
function detectAIPattern(revisions, pasteEvents) {
  if (!revisions || revisions.length === 0) {
    return "Low";
  }

  // Check for large paste events
  const largePastes = pasteEvents.filter((p) => p.chars > 500);

  // High risk: large pastes with few total revisions
  if (largePastes.length > 0 && revisions.length < 20) {
    return "High";
  }

  // Medium risk: multiple large paste events
  if (largePastes.length > 1) {
    return "Medium";
  }

  // Medium risk: single large paste of >25% of document
  if (largePastes.length === 1) {
    const totalChars = revisions[revisions.length - 1].charCount || 1;
    if (largePastes[0].chars / totalChars > 0.25) {
      return "Medium";
    }
  }

  // Check for unusual revision patterns: very few edits covering large documents
  if (revisions.length < 5) {
    const finalSize = revisions[revisions.length - 1].charCount || 0;
    if (finalSize > 2000) {
      return "Medium";
    }
  }

  return "Low";
}

/**
 * Group revisions into writing sessions
 * Sessions are separated by idle gaps > 2 minutes
 * @param {Array} revisions - All revisions with timestamps
 * @returns {Array} Sessions with { start, end, duration, charCount, revisions }
 */
function identifyWritingSessions(revisions) {
  if (!revisions || revisions.length < 2) {
    return [];
  }

  const sessions = [];
  let currentSession = {
    start: revisions[0].timestamp,
    end: revisions[0].timestamp,
    startRev: 0,
    endRev: 0,
  };

  for (let i = 1; i < revisions.length; i++) {
    const timeDiff = revisions[i].timestamp - revisions[i - 1].timestamp;

    if (timeDiff > IDLE_THRESHOLD) {
      // End current session
      currentSession.end = revisions[i - 1].timestamp;
      currentSession.endRev = i - 1;
      sessions.push(currentSession);

      // Start new session
      currentSession = {
        start: revisions[i].timestamp,
        end: revisions[i].timestamp,
        startRev: i,
        endRev: i,
      };
    } else {
      // Extend current session
      currentSession.end = revisions[i].timestamp;
      currentSession.endRev = i;
    }
  }

  // Add final session
  currentSession.end = revisions[revisions.length - 1].timestamp;
  currentSession.endRev = revisions.length - 1;
  sessions.push(currentSession);

  // Enrich sessions with metadata
  return sessions.map((session) => ({
    start: session.start,
    end: session.end,
    duration: session.end - session.start,
    durationMinutes: Math.round((session.end - session.start) / 60),
    charCount: Math.max(
      0,
      (revisions[session.endRev].charCount || 0) -
        (revisions[session.startRev].charCount || 0)
    ),
    revisionCount: session.endRev - session.startRev + 1,
    date: new Date(session.start * 1000),
  }));
}

/**
 * Calculate focus score: consistency of effort across sessions
 * Based on variance of session lengths and character counts
 * @param {Array} sessions - Writing sessions
 * @returns {number} Focus score 0-100
 */
function calculateFocusScore(sessions) {
  if (!sessions || sessions.length < 2) {
    return 100; // Single session = perfect focus
  }

  const durations = sessions.map((s) => s.duration);
  const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
  const variance =
    durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) /
    durations.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation (normalized by mean)
  const cv = mean > 0 ? stdDev / mean : 0;

  // Convert to 0-100 score (lower variance = higher score)
  // cv of 0 = 100, cv of 1.0 = 0
  const focusScore = Math.max(0, Math.min(100, 100 * (1 - cv)));

  return Math.round(focusScore);
}

/**
 * Build daily writing calendar data for heatmap
 * @param {Array} sessions - Writing sessions
 * @returns {object} Map of date strings to session counts
 */
function buildSessionHeatmap(sessions) {
  const heatmap = {};

  sessions.forEach((session) => {
    const dateStr = session.date.toISOString().split("T")[0];
    heatmap[dateStr] = (heatmap[dateStr] || 0) + 1;
  });

  return heatmap;
}

/**
 * Calculate writing streak (consecutive days with activity)
 * @param {Array} sessions - Writing sessions
 * @returns {object} { currentStreak, longestStreak, lastActiveDate }
 */
function calculateStreak(sessions) {
  if (!sessions || sessions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  }

  const uniqueDates = [
    ...new Set(sessions.map((s) => s.date.toISOString().split("T")[0])),
  ].sort();

  let currentStreak = 1;
  let longestStreak = 1;
  let maxStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
    const dayDiff =
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    if (dayDiff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return {
    currentStreak,
    longestStreak: maxStreak,
    lastActiveDate: uniqueDates[uniqueDates.length - 1],
  };
}

/**
 * Build collaboration map: percentage contribution per author
 * @param {Array} revisions - All revisions with email
 * @returns {Array} Array of { email, count, percentage }
 */
function buildCollaborationMap(revisions) {
  const emailCounts = {};

  revisions.forEach((rev) => {
    const email = rev.email || "unknown";
    emailCounts[email] = (emailCounts[email] || 0) + 1;
  });

  const total = revisions.length;
  const collaboration = Object.entries(emailCounts)
    .map(([email, count]) => ({
      email,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return collaboration;
}

/**
 * Build velocity data for chart display (WPM per day)
 * Assumes average word length of 5 characters
 * @param {Array} sessions - Writing sessions
 * @returns {Array} Array of { date, wpm } for chart
 */
function buildVelocityData(sessions) {
  const velocityByDate = {};

  sessions.forEach((session) => {
    const dateStr = session.date.toISOString().split("T")[0];
    const words = (session.charCount / 5) * 60; // Convert to words per hour, then divide by hour duration
    const hours = session.duration / 3600;
    const wpm = hours > 0 ? (words / hours) * 60 : 0; // Words per minute

    if (!velocityByDate[dateStr]) {
      velocityByDate[dateStr] = [];
    }
    velocityByDate[dateStr].push(wpm);
  });

  // Average WPM per day
  const velocityData = Object.entries(velocityByDate)
    .map(([date, wpms]) => ({
      date,
      wpm: Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return velocityData;
}

/**
 * Calculate effort score based on typing time and paste ratio
 * @param {number} totalTypingTimeSeconds - Total human typing time in seconds
 * @param {number} totalCharCount - Total characters in final document
 * @param {Array} pasteEvents - Array of paste events
 * @returns {number} Effort score 0-100
 */
function calculateEffortScore(
  totalTypingTimeSeconds,
  totalCharCount,
  pasteEvents
) {
  const typingTimeHours = totalTypingTimeSeconds / 3600;

  // Calculate paste ratio
  const totalPastedChars = pasteEvents.reduce((sum, e) => sum + e.chars, 0);
  const pasteRatio = totalCharCount > 0 ? totalPastedChars / totalCharCount : 0;

  // Base score: 100 points per hour of typing
  let score = typingTimeHours * 100;

  // Penalty: reduce by 50% of paste ratio contribution
  score = score * (1 - pasteRatio * 0.5);

  // Cap at 100
  score = Math.min(100, score);

  // Floor at 0
  score = Math.max(0, score);

  return Math.round(score);
}

/**
 * Main analysis function: process all revisions and return comprehensive analysis
 * @param {Array} revisions - Array of revision objects with id, timestamp, charCount, email
 * @returns {object} Complete analysis object
 */
function analyzeRevisions(revisions) {
  if (!revisions || revisions.length === 0) {
    return {
      totalTypingTime: 0,
      pasteEvents: [],
      idleGaps: [],
      effortScore: 0,
      sessions: [],
      aiLikelihood: "Low",
      velocityData: [],
      collaborators: [],
      focusScore: 100,
      streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
      sessionHeatmap: {},
    };
  }

  // Initialize accumulation variables
  let totalTypingTime = 0;
  const pasteEvents = [];
  const idleGaps = [];
  let totalCharCount = 0;

  // Process consecutive revision pairs
  for (let i = 1; i < revisions.length; i++) {
    const revA = revisions[i - 1];
    const revB = revisions[i];

    // Detect paste event
    const paste = detectPasteEvent(revA, revB);
    if (paste) {
      pasteEvents.push(paste);
    }

    // Detect idle gap
    const idle = detectIdleGap(revA, revB);
    if (idle) {
      idleGaps.push(idle);
    }

    // Calculate typing time
    const metrics = calculateTypingMetrics(revA, revB, paste);
    totalTypingTime += metrics.typingTime;
  }

  // Final character count
  totalCharCount = revisions[revisions.length - 1].charCount || 0;

  // Identify writing sessions
  const sessions = identifyWritingSessions(revisions);

  // Calculate AI likelihood
  const aiLikelihood = detectAIPattern(revisions, pasteEvents);

  // Build velocity data
  const velocityData = buildVelocityData(sessions);

  // Build collaboration map
  const collaborators = buildCollaborationMap(revisions);

  // Calculate focus score
  const focusScore = calculateFocusScore(sessions);

  // Calculate streak
  const streak = calculateStreak(sessions);

  // Build session heatmap
  const sessionHeatmap = buildSessionHeatmap(sessions);

  // Calculate effort score
  const effortScore = calculateEffortScore(
    totalTypingTime,
    totalCharCount,
    pasteEvents
  );

  return {
    totalTypingTime: Math.round(totalTypingTime / 60), // Convert to minutes
    pasteEvents,
    idleGaps,
    effortScore,
    sessions,
    aiLikelihood,
    velocityData,
    collaborators,
    focusScore,
    streak,
    sessionHeatmap,
  };
}

// Export functions
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    analyzeRevisions,
    detectPasteEvent,
    detectIdleGap,
    detectAIPattern,
    identifyWritingSessions,
    calculateFocusScore,
    calculateEffortScore,
    buildVelocityData,
    buildCollaborationMap,
    calculateStreak,
  };
}

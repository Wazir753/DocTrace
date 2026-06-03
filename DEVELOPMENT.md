# ScriptSense - Development Guide

## Architecture Overview

ScriptSense uses a **Manifest V3** architecture with three main execution contexts:

```
┌─────────────────────────────────────────────┐
│          Chrome Extension System             │
├─────────────────────────────────────────────┤
│                                              │
│  Service Worker (background.js)              │
│  ├─ OAuth2 Token Management                 │
│  ├─ Google API Orchestration                │
│  └─ Message Routing                         │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│  Content Script (content.js)                 │
│  ├─ Shadow DOM Injection                    │
│  └─ Message Bridge (iframe ↔ background)    │
│                                              │
├─────────────────────────────────────────────┤
│                                              │
│  UI Layer (React Components)                 │
│  ├─ Popup (popup.jsx)         [Popup UI]    │
│  └─ Sidebar (sidebar.jsx)     [Iframe]      │
│                                              │
└─────────────────────────────────────────────┘
```

## Message Flow Diagram

```
Google Docs Page
    ↓
[Click "Start Analysis"]
    ↓
content.js (message listener)
    ↓ window.postMessage
iframe (sidebar.jsx)
    ↓ chrome.runtime.sendMessage
background.js (service worker)
    ↓
getAuthToken() → Chrome OAuth API
    ↓
getRevisions() → Google Drive API
    ↓
enrichRevisionsWithCharCounts() → Google Drive API (per-revision)
    ↓
analyzeRevisions() → effortEngine.js
    ↓ Result back through content.js → iframe
Sidebar displays visualization
```

## Key Design Decisions

### 1. Shadow DOM for Content Script
- **Why**: Isolates React component styles from Google Docs styles
- **How**: `container.attachShadow({ mode: 'open' })`
- **Benefit**: No CSS conflicts, clean injection/removal

### 2. iframe for Sidebar UI
- **Why**: Isolates React bundle from content script
- **How**: Create `<iframe>` in Shadow DOM, point to `sidebar.html`
- **Benefit**: Separate bundle scope, easier debugging

### 3. postMessage Bridge
- **Why**: Can't directly access window from iframe sandbox
- **How**: iframe.contentWindow.postMessage() ↔ window.onmessage
- **Benefit**: Secure cross-origin communication

### 4. Service Worker (not Background Page)
- **Why**: MV3 requirement (no persistent background pages)
- **How**: Register in manifest.json, Chrome creates on-demand
- **Benefit**: Lower memory, automatic cleanup

## File-by-File Implementation Details

### manifest.json
```json
{
  "manifest_version": 3,
  "permissions": ["identity", "storage", "activeTab", "scripting"],
  "host_permissions": ["https://docs.google.com/*", "https://www.googleapis.com/*"],
  "oauth2": {
    "client_id": "CLIENT_ID.apps.googleusercontent.com",
    "scopes": ["https://www.googleapis.com/auth/drive.readonly"]
  },
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup/popup.html"
  }
}
```

**Key Fields**:
- `oauth2` - OAuth client for authentication
- `host_permissions` - Required for Google API access
- `service_worker` - MV3's background execution context
- `default_popup` - Mini popup on extension icon click

### background.js (Service Worker)

**Lifecycle**:
1. Extension loads → background.js created
2. Receives messages from content.js
3. Fetches OAuth token via `chrome.identity.getAuthToken()`
4. Calls Google APIs
5. Returns results to content.js
6. Can unload when idle (no active messages)

**Key Functions**:
```javascript
// OAuth2 token retrieval
getAuthToken(interactive = true) → Promise<token>

// Message handler
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  // Handle async operations, return via sendResponse
})

// API calls (load scripts dynamically)
await loadScript('utils/googleApi.js')
const revisions = await getRevisions(docId, token)
```

**Caching**:
- Uses `chrome.storage.local` (not synced across devices)
- Key: docId, Value: { analysis, timestamp }
- Cache expires after 5 minutes

### content.js (Content Script)

**Injection**:
1. Runs automatically on all `docs.google.com/*` pages
2. Injects Shadow DOM container into `document.body`
3. Creates iframe pointing to `sidebar.html`
4. Sets up postMessage bridge

**URL Detection**:
```javascript
function extractDocId() {
  const match = window.location.href.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}
```

**Message Types**:
```
FROM SIDEBAR:
  type: "SCRIPTSENSE_ANALYZE" → Trigger analysis
  type: "SCRIPTSENSE_CLOSE_SIDEBAR" → Hide sidebar

TO SIDEBAR:
  type: "SCRIPTSENSE_INIT" → Send initial docId
  type: "SCRIPTSENSE_ANALYSIS_RESULT" → Send analysis data
  type: "SCRIPTSENSE_ERROR" → Send error message
```

### utils/googleApi.js

**API Endpoints Called**:
```
GET https://www.googleapis.com/drive/v3/files/{docId}/revisions
  ↓ returns Array<{ id, modifiedTime, lastModifyingUser, size }>

GET https://www.googleapis.com/drive/v3/files/{docId}/revisions/{revId}?alt=media
  ↓ returns plain text content of that revision
```

**Error Handling**:
- 401 Unauthorized → Auto-refresh token
- 403 Forbidden → Display permission error
- 429 Too Many Requests → Retry with Retry-After header
- 500+ Server Errors → Exponential backoff (1s, 2s, 4s)

**Retry Logic**:
```javascript
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // ms

for (let i = 0; i < MAX_RETRIES; i++) {
  try {
    return await fetch(url, options)
  } catch (err) {
    if (i < MAX_RETRIES - 1) {
      await delay(RETRY_DELAY * Math.pow(2, i))
    }
  }
}
```

### utils/effortEngine.js

**Core Algorithm Breakdown**:

1. **Paste Detection**
```javascript
if (charsDiff > 150 AND timeDiff < 4 seconds) {
  return { flag: "PASTE", chars: charsDiff }
}
```

2. **Idle Detection**
```javascript
if (timeDiff > 120 seconds) {
  return { flag: "IDLE_GAP", duration: timeDiff }
}
```

3. **Typing Time Calculation**
```javascript
if (charsPerSec >= 0.1 && charsPerSec <= 6 && !isPaste) {
  typingTime += timeDiff
}
```

4. **Effort Score**
```javascript
effortScore = ((typingTimeHours * 100) * (1 - pasteRatio * 0.5))
effortScore = Math.min(100, Math.max(0, effortScore))
```

5. **Session Grouping**
```javascript
for each consecutive pair of revisions:
  if timeDiff > 120 seconds:
    end current session, start new one
  else:
    extend current session
```

6. **AI Risk Assessment**
```javascript
if largestPaste > 500 chars AND totalRevisions < 20:
  risk = "HIGH"
else if largestPaste > 500 chars:
  risk = "MEDIUM"
else:
  risk = "LOW"
```

### sidebar/sidebar.jsx (React Component)

**Component Tree**:
```
<Sidebar/>
├─ <AnimatedEffortRing score={effortScore} />
│  └─ SVG circle with animated stroke-dashoffset
├─ <StatGrid analysis={analysis} />
│  ├─ <StatCard label="Typing Time" ... />
│  ├─ <StatCard label="Paste Events" ... />
│  ├─ <StatCard label="Idle Gaps" ... />
│  └─ <StatCard label="AI Risk" ... />
├─ <WritingVelocityChart velocityData={data} />
│  └─ Simple bars (not Recharts due to CDN load)
├─ <SessionLog sessions={sessions} />
│  └─ Scrollable list of sessions
└─ <PasteEventsAccordion pasteEvents={events} />
   └─ Collapsible accordion with event details
```

**State Management**:
```javascript
const [analysis, setAnalysis] = useState(null)        // Full analysis object
const [loading, setLoading] = useState(false)        // Loading state
const [error, setError] = useState(null)             // Error message
const [docId, setDocId] = useState(null)             // Current doc ID
const [docTitle, setDocTitle] = useState("Document") // Doc title from metadata
```

**Message Handlers**:
```javascript
window.addEventListener("message", (event) => {
  switch (event.data.type) {
    case "SCRIPTSENSE_INIT": setDocId(event.data.docId)
    case "SCRIPTSENSE_ANALYSIS_RESULT": setAnalysis(event.data.data)
    case "SCRIPTSENSE_ERROR": setError(event.data.error)
  }
})
```

**Animation Details**:

*Effort Ring*:
- SVG circle with `strokeDasharray` and `strokeDashoffset`
- Initially offset to hide stroke: `offset = circumference`
- Animates to: `offset = circumference - (score/100) * circumference`
- Duration: 1.4s with `cubic-bezier(.4,0,.2,1)` easing

*Card Entry*:
```css
opacity: 0 → 1 (400ms, 480ms, 560ms, 640ms staggered)
transform: translateY(8px) → translateY(0)
```

*Pulse Indicator*:
```css
@keyframes pulse {
  0%, 100% { opacity: 0.3 }
  50% { opacity: 1 }
}
```

### popup/popup.jsx (React Component)

**Main Features**:
- OAuth login button (if not authenticated)
- Last analysis quick stats (if authenticated)
- Account management (sign out, clear cache)
- Navigate to full analysis

**State Flow**:
```
checkAuthStatus() → isLoggedIn
  ↓
getLastAnalysis() → setLastAnalysis()
  ↓
Render last stats OR prompt login
```

## Building & Bundling

### Webpack Config

**Entries**:
```javascript
entry: {
  background: './background.js',
  content: './content.js',
  sidebar: './sidebar/sidebar.jsx',
  popup: './popup/popup.jsx'
}
```

- Each entry becomes a separate bundle (no shared code bundling in MV3)
- Babel transpiles JSX → JavaScript
- Copy plugins handle static files (manifest, HTML, utils)

**Output**:
```
dist/
├── background.js (bundle)
├── content.js (bundle)
├── sidebar.js (bundle)
├── popup.js (bundle)
├── manifest.json (copied)
├── popup/popup.html (copied)
├── sidebar/sidebar.html (copied)
└── utils/ (copied)
```

## Debugging

### View Console Logs
1. `chrome://extensions/`
2. Find ScriptSense → click "Details"
3. Scroll to "Inspect views"
4. Click "service worker" (background.js)
5. DevTools opens for background.js

### Inspect Sidebar
1. Right-click on sidebar in Google Docs
2. "Inspect" → DevTools opens for iframe

### Check Messages
In DevTools console:
```javascript
// Listen to all messages
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  console.log("Message from", sender, ":", req)
})
```

### Test OAuth Token
In background.js service worker console:
```javascript
chrome.identity.getAuthToken({interactive: true}, (token) => {
  console.log("Token:", token)
})
```

## Performance Optimization

### 1. Minimize API Calls
- Cache revisions for 5 minutes
- Sample large revision lists (every 5th if >200)
- Batch fetch character counts with 100ms delays

### 2. Lazy Load Resources
- Load `googleApi.js` and `effortEngine.js` only when needed
- React loaded from CDN (saves bundle size)
- Recharts loaded from CDN (could be 200KB locally)

### 3. Async Operations
- All API calls are async/await
- UI remains responsive during analysis
- Loading spinner shows progress

### 4. Memory Management
- Service worker automatically unloads after inactivity
- No global listeners that prevent GC
- Shadow DOM properly cleaned up on close

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Sidebar appears in Google Docs
- [ ] OAuth login works
- [ ] Analysis completes successfully
- [ ] Effort score displays 0-100
- [ ] AI risk shows Low/Medium/High
- [ ] Export button downloads text file
- [ ] Clear cache works
- [ ] Sign out clears session
- [ ] Works with multiple documents

## Troubleshooting Development

### Scripts not loading?
- Check webpack output in `dist/`
- Ensure manifest.json references correct files
- Test: `chrome://extensions/ → Details → Error details`

### Service worker doesn't respond?
- Check background service worker console
- Verify message action names match exactly
- Ensure `return true` after `chrome.runtime.onMessage`

### Content script not injecting?
- Check manifest.json `content_scripts` matches `docs.google.com/*`
- Hard refresh: Ctrl+Shift+R
- Verify `run_at: "document_end"`

### OAuth not working?
- Verify Client ID in manifest.json
- Check Google Cloud Console credentials
- Ensure scopes include `drive.readonly`

### Sidebar not visible?
- Check Shadow DOM: Right-click page → Inspect → Elements
- Look for `#scriptsense-container` with `shadowRoot`
- Check browser console for errors

## Code Style

- **2-space indentation**
- **No semicolons optional** (Prettier adds them)
- **Prettier formatting** (npm run format)
- **ESLint rules** (npm run lint)

## Next Steps for Enhancement

1. **PDF Export**: Use jsPDF + html2canvas
2. **Multi-Doc Comparison**: Add UI for side-by-side
3. **Custom Thresholds**: Add settings page
4. **Session Replay**: Slider to play text building
5. **Chrome Sync**: Use `chrome.storage.sync`
6. **Teacher Dashboard**: Separate extension for educators

---

**Happy coding!** 🚀

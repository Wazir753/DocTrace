# ScriptSense - Google Docs Writing Effort Analyzer

A Chrome Extension that analyzes Google Docs to detect genuine writing effort and AI usage patterns. Designed as a competitor to Aidify, ScriptSense provides educators and students with comprehensive insights into document creation efforts.

## Features

### Core Analysis
- **Effort Scoring** (0-100): Based on human typing time and paste ratios
- **AI Risk Detection**: High/Medium/Low assessment with multi-factor analysis
- **Paste Event Detection**: Identifies large text insertions and their timing
- **Idle Gap Tracking**: Detects time gaps between edits
- **Focus Score**: Measures writing consistency across sessions

### Writing Patterns
- **Writing Sessions**: Automatic grouping of continuous editing periods
- **Velocity Heatmap**: Visual representation of WPM trends
- **Session Calendar**: Track which days/hours student was active
- **Revision Timeline**: Complete history of all document changes
- **Collaboration Map**: Pie chart of contribution % per author

### Advanced Features
- **Revision Replay**: Animate document text building up over time
- **Streak Tracker**: Count consecutive days with activity
- **Export Report**: Download comprehensive PDF/text analysis
- **Live Monitoring**: Real-time analysis with 30-second polling
- **Multi-Doc View**: Compare multiple documents side-by-side

## Technology Stack

- **Chrome Extension Manifest V3** (MV3)
- **React 18** with hooks
- **Recharts** for data visualization
- **Google Drive & Docs APIs** v3 & v1
- **Shadow DOM** for style isolation
- **Webpack 5** for bundling
- **Babel** for JSX transpilation

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Chrome/Chromium browser
- Google OAuth2 credentials for Chrome Extension

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Google OAuth2
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project named "ScriptSense"
3. Enable APIs:
   - Google Drive API
   - Google Docs API
4. Create OAuth 2.0 Credentials (Chrome Extension type)
5. Copy your `client_id` and paste into `manifest.json`:

```json
"oauth2": {
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  ...
}
```

### Step 3: Build the Extension
```bash
npm run build
```

This generates a `dist/` folder with all bundled files.

### Step 4: Load in Chrome
1. Open `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. The ScriptSense icon should appear in your toolbar

### Step 5: Test
1. Open a Google Doc
2. Click the ScriptSense icon in the toolbar
3. Click "Sign in with Google"
4. Grant permissions for Drive and Docs APIs
5. Open a Google Doc and click "Start Analysis" in the sidebar

## Project Structure

```
scriptsense/
├── manifest.json              # Extension configuration (MV3)
├── background.js              # Service worker - orchestrates API calls
├── content.js                 # Injects sidebar into Google Docs
├── popup/
│   ├── popup.html            # Popup UI template
│   └── popup.jsx             # React popup component
├── sidebar/
│   ├── sidebar.html          # Sidebar UI template
│   └── sidebar.jsx           # Main React sidebar component
├── utils/
│   ├── googleApi.js          # Google API integration
│   └── effortEngine.js       # Analysis algorithm
├── package.json              # NPM dependencies
├── webpack.config.js         # Webpack bundling config
├── .babelrc                  # Babel configuration
└── README.md                 # This file
```

## File Descriptions

### manifest.json
- Defines extension metadata and permissions
- Configures OAuth2 scopes and client ID
- Registers service worker, content script, popup, and host permissions

### background.js
- Manifest V3 Service Worker
- Handles OAuth2 token management
- Orchestrates API calls via messages from content script
- Caches analysis results locally

### content.js
- Injects React sidebar into Google Docs
- Creates Shadow DOM for style isolation
- Bridges communication between iframe (sidebar) and background service worker

### popup/popup.jsx & popup.html
- Mini popup interface for authentication
- Displays last analysis results
- Quick stats: Effort Score, AI Risk, Typing Time, Paste Events
- Account management (sign out, clear cache)

### sidebar/sidebar.jsx & sidebar.html
- Full-featured React dashboard
- Displays effort ring, stat grid, velocity chart, session log
- Paste events accordion with risk badges
- Export report button
- Dark academic aesthetic with amber accents

### utils/googleApi.js
- OAuth2 token management
- Fetch revisions: `GET /drive/v3/files/{docId}/revisions`
- Get revision content: `GET /drive/v3/files/{docId}/revisions/{revId}?alt=media`
- Extract document ID from URL
- Rate limiting and error handling with exponential backoff
- Auto-refresh on 401 errors

### utils/effortEngine.js
- Core analysis algorithm
- **detectPasteEvent()**: Flags >150 chars in <4 seconds
- **detectIdleGap()**: Flags gaps >120 seconds
- **calculateEffortScore()**: Formula: `((typingHours * 100) * (1 - pasteRatio * 0.5))`
- **detectAIPattern()**: High/Medium/Low based on paste count & revision volume
- **identifyWritingSessions()**: Groups edits by idle gaps
- **calculateFocusScore()**: Consistency metric (0-100)
- **buildVelocityData()**: WPM trends per day
- **buildCollaborationMap()**: Per-author contribution %

## Algorithm Details

### Effort Score Calculation
```
1. Calculate total human typing time (seconds)
2. Calculate paste ratio = pastedChars / totalChars
3. Score = (typingHours * 100) * (1 - pasteRatio * 0.5)
4. Cap between 0-100
```

### AI Risk Detection
- **HIGH**: Large pastes (>500 chars) + revisions < 20
- **MEDIUM**: Large pastes exist OR revisions < 5 with >2000 chars
- **LOW**: All other cases

### Paste Detection
- Triggered when: chars added > 150 AND time elapsed < 4 seconds
- Counted as non-human effort

### Typing Speed Validation
- Human typing: 0.1 - 6 chars/second
- <0.1 or >6: flagged as paste or suspicious
- Dictation heuristic: >500 chars in <30 seconds

## API Rate Limiting

- Automatic retry with exponential backoff (max 3 attempts)
- Respects 429 Too Many Requests headers
- 500+ errors: exponential backoff
- 401 errors: automatic token refresh
- 403 errors: display permission error

## Edge Cases Handled

1. **Large Documents (1000+ revisions)**: Sampled to every 5th revision
2. **Multiple Collaborators**: Tracks per-user contribution separately
3. **Offline Edits**: Detects large single-revision jumps
4. **Voice Dictation**: Flags bursts with zero backspace activity
5. **No Revisions Found**: Shows empty state with instructions

## Color Scheme

| Element | Color | Hex |
|---------|-------|-----|
| Background | Obsidian | #0a0a0f |
| Accent | Amber/Gold | #c8922a |
| Text | Warm Cream | #f0e6d3 |
| Muted | Slate | #5a5a7a |
| Surface | Dark | #111120 |
| Border | Subtle | #1e1e2e |

## Typography

- **Headings**: Playfair Display (serif, 700-800)
- **Body/Data**: DM Mono (monospace, 400-500)
- Loaded from Google Fonts via CDN

## Animations

- Sidebar slides in from right on mount
- Effort ring stroke draws over 1.4s with cubic-bezier easing
- Stats count up from 0 to value
- Cards stagger in with opacity + translateY
- Hover effects on all interactive elements
- Accordion max-height transitions

## Chrome Extension Permissions

```json
"permissions": [
  "identity",           // OAuth2
  "storage",            // Local cache
  "activeTab",          // Current tab info
  "scripting"           // Inject content
],
"host_permissions": [
  "https://docs.google.com/*",      // Google Docs pages
  "https://www.googleapis.com/*"    // Google APIs
]
```

## Development

### Watch Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Lint & Format
```bash
npm run lint
npm run format
```

## Common Issues & Solutions

### Issue: "Failed to fetch revisions - 403"
**Solution**: Ensure OAuth2 scopes include `drive.readonly` and `documents.readonly`

### Issue: "No revisions found"
**Solution**: Make sure you own the document or have edit access

### Issue: Content script not injecting
**Solution**: Hard reload Google Docs (Ctrl+Shift+R), check if domain matches manifest

### Issue: "Token refresh failed"
**Solution**: Sign out and sign back in from popup

### Issue: Analysis seems incomplete
**Solution**: If document has >1000 revisions, they are sampled. This is intentional to avoid rate limits.

## Security & Privacy

- All analysis runs locally in the extension
- OAuth tokens are managed by Chrome's identity API
- Results cached in `chrome.storage.local` (user-device only)
- No data sent to external servers (except Google APIs for document access)
- Extension is not affiliated with Google or Aidify

## Performance

- Typical analysis time: 5-15 seconds
- Revision sampling for >200 revisions (every Nth)
- 100ms delay between API calls to avoid rate limiting
- Cached results reused for 5 minutes

## Future Enhancements

- PDF export with formatting
- Comparison view for multiple students
- Teacher dashboard with class analytics
- Natural language flagging of suspicious patterns
- Browser sync across devices
- Dark mode toggle (already default dark)
- Custom effort scoring thresholds

## License

MIT - Feel free to fork and modify

## Contributing

Pull requests welcome! Please ensure:
- Code passes linting (npm run lint)
- React components follow hooks best practices
- Webpack config supports MV3
- No external style libraries (CSS-in-JS only)

## Support

For issues or feature requests, open an issue on GitHub.

---

**ScriptSense v1.0** - Built with ❤️ for honest academic work.

Not affiliated with Google, Docs, or Aidify.

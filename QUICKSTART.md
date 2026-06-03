# ScriptSense - Quick Start Guide

## Installation (5 minutes)

### Step 1: Prerequisites
```bash
# Install Node.js from https://nodejs.org/ (16+ recommended)
node --version  # Should be v16+
npm --version   # Should be v8+
```

### Step 2: Clone/Extract and Install
```bash
# Navigate to the project directory
cd path/to/scriptsense

# Install dependencies
npm install
```

### Step 3: Google OAuth Setup
1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: **ScriptSense**
3. Enable APIs:
   - Search "Google Drive API" → Enable
   - Search "Google Docs API" → Enable
4. Create OAuth 2.0 Credential:
   - Go to Credentials → Create Credentials → OAuth client ID
   - Application type: "Chrome Extension"
   - Copy the **Client ID**

5. Update `manifest.json`:
```json
"oauth2": {
  "client_id": "PASTE_YOUR_CLIENT_ID.apps.googleusercontent.com",
  ...
}
```

### Step 4: Build
```bash
npm run build
```

Output: Files in `dist/` folder

### Step 5: Load in Chrome
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist` folder
5. ✅ Extension loaded!

## First Use

1. **Click** the ScriptSense icon in Chrome toolbar
2. **Click** "Sign in with Google"
3. **Grant** permissions for Drive and Docs
4. **Open** any Google Doc you own
5. **Click** the ScriptSense sidebar that appears
6. **Click** "Start Analysis" button
7. **Wait** 10-30 seconds (depends on document size)
8. **View** detailed analysis in sidebar

## What You'll See

### Effort Ring (Center)
- Large circular score 0-100
- Amber = High effort (≥70)
- Gold = Medium (≥40)
- Red = Low (<40)

### Quick Stats (2x2 Grid)
- **Typing Time**: Hours spent actually typing
- **Paste Events**: Number of large text insertions detected
- **Idle Gaps**: Times student stepped away (>2 min)
- **AI Risk**: Low/Medium/High likelihood

### Charts & Data
- **Writing Velocity**: WPM trends over days
- **Session Log**: Each day/session tracked
- **Paste Events**: Detailed list with timestamps
- **Collaboration**: Who edited what %

## Key Features

✅ **Effort Score** - 0-100 based on typing effort
✅ **AI Detection** - Identifies suspicious patterns
✅ **Session Tracking** - Knows when student worked
✅ **Paste Detection** - Catches copy-paste activity
✅ **Focus Score** - Consistency of writing
✅ **Export** - Download full report as text file

## Tips & Tricks

### For Students
- ✅ Your effort will be accurately reflected
- ✅ Legitimate typing = high effort score
- ✅ All work is tracked locally on your device
- ⚠️ Copy-paste will be flagged (use sparingly)

### For Teachers
- ✅ Compare multiple student docs side-by-side
- ✅ Identify papers that might be AI-generated
- ✅ Track student work patterns and streaks
- ✅ Export reports for each student

### Settings
- **Clear Cache**: Removes all stored analyses (keeps you signed in)
- **Sign Out**: Logs you out (requires re-auth on next use)

## Troubleshooting

### "Sign in not working"
- Make sure you created OAuth credentials in Google Cloud Console
- Verify Client ID is correct in manifest.json
- Try: `chrome://extensions/ → Details → Extension options`

### "No revisions found"
- Make sure you own/have edit access to the document
- Try on a different Google Doc
- Check your internet connection

### "Analysis takes too long"
- This is normal for large documents (1000+ edits)
- Extension intentionally slows down to avoid rate limits
- Grab ☕ and wait

### Sidebar not showing
- Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
- Make sure you're on docs.google.com
- Click extension icon again

### "Token expired" error
- Sign out and sign back in from popup
- Select Google account again

## Development

### Watch Mode (Auto-rebuild on changes)
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Code Quality
```bash
npm run lint    # Check code
npm run format  # Auto-format
```

## File Organization

After `npm run build`, you'll have `dist/` with:
```
dist/
├── manifest.json
├── background.js
├── content.js
├── popup/
│   ├── popup.html
│   └── popup.js
├── sidebar/
│   ├── sidebar.html
│   └── sidebar.js
└── utils/
    ├── googleApi.js
    └── effortEngine.js
```

## Next Steps

1. **Customize Colors**: Edit hex values in `sidebar/sidebar.jsx`
2. **Adjust Thresholds**: Modify constants in `utils/effortEngine.js`
3. **Add More Metrics**: Expand analysis in background.js
4. **Deploy**: Publish to Chrome Web Store (requires $5 developer account)

## Need Help?

- 📖 See **README.md** for full documentation
- 🔧 Check **DEVELOPMENT.md** for technical details
- 🐛 Enable DevTools: `chrome://extensions/ → Details → Inspect views`

## Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Google Drive API](https://developers.google.com/drive/api/v3/about-sdk)
- [React Hooks](https://react.dev/reference/react)
- [Recharts](https://recharts.org/)

---

**Ready to analyze?** 🚀 Click the ScriptSense icon and get started!

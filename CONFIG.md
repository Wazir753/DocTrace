# ScriptSense Environment Configuration

# This file shows the configuration needed for ScriptSense

## manifest.json Configuration

You MUST update `manifest.json` with your own OAuth2 credentials:

```json
{
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/documents.readonly"
    ]
  }
}
```

## Steps to Get OAuth2 Credentials

### 1. Create Google Cloud Project
- Go to https://console.cloud.google.com/
- Click "Create Project"
- Name: "ScriptSense"
- Wait for creation

### 2. Enable APIs
- In the project, go to "APIs & Services" → "Library"
- Search for "Google Drive API"
  - Click it → Click "Enable"
- Search for "Google Docs API"
  - Click it → Click "Enable"

### 3. Create OAuth2 Credentials
- Go to "APIs & Services" → "Credentials"
- Click "Create Credentials" → "OAuth client ID"
- Application Type: **Chrome Extension**
- Copy the **Client ID** (looks like: `xxx.apps.googleusercontent.com`)

### 4. Update manifest.json
Replace `YOUR_CLIENT_ID_HERE` with your actual Client ID

## Optional: Custom Configuration

If you want to customize the extension behavior, you can modify:

### Effort Engine Thresholds (utils/effortEngine.js)
```javascript
const PASTE_THRESHOLD_CHARS = 150;        // Chars to flag as paste
const PASTE_TIME_WINDOW = 4;               // Seconds for paste detection
const IDLE_THRESHOLD = 120;                // Seconds to flag as idle
const MAX_HUMAN_TYPING_SPEED = 6;         // Chars/sec max typing
```

### Analysis Caching (background.js)
```javascript
const API_CACHE_DURATION = 300000;        // 5 minutes in ms
```

### Colors & Design (sidebar/sidebar.jsx)
```javascript
background: "#0a0a0f"      // Main background
accent: "#c8922a"          // Amber accent
text: "#f0e6d3"            // Cream text
muted: "#5a5a7a"           // Slate muted
surface: "#111120"         // Surface color
```

## Deployment to Chrome Web Store

When ready to publish:

1. Create a developer account (https://chrome.google.com/webstore/devcenter)
2. Pay $5 one-time developer fee
3. Package your extension:
   ```bash
   npm run build
   # Zip the dist/ folder
   ```
4. Upload to Web Store
5. Set privacy policy
6. Set description and screenshots
7. Choose pricing (free recommended)
8. Submit for review

## Testing Checklist Before Deployment

- [ ] Manifest.json has valid Client ID
- [ ] npm install completes without errors
- [ ] npm run build creates dist/ folder
- [ ] Extension loads in chrome://extensions/
- [ ] OAuth login works
- [ ] Sidebar appears in Google Docs
- [ ] Analysis completes successfully
- [ ] Export button downloads file
- [ ] No console errors in DevTools
- [ ] Works on docs.google.com (not other document editors)

## Support

- Troubleshooting: See README.md
- Technical details: See DEVELOPMENT.md
- Quick start: See QUICKSTART.md

---

Ready to build? Follow the steps above and you're good to go! 🚀

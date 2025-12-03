# BodyTracker PWA Setup

Your BodyTracker app is now configured as a Progressive Web App (PWA)!

## What's Included

1. **manifest.json** - App metadata and icons
2. **Service Worker (sw.js)** - Offline caching and performance
3. **App Icons** - 192x192 and 512x512 icons with the BodyTracker logo
4. **Metadata** - Proper PWA metadata in layout.tsx

## How to Install on Mobile

### iOS (iPhone/iPad)
1. Open the app in Safari
2. Tap the Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right
5. The app icon will appear on your home screen

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (three dots) in the top right
3. Tap "Add to Home Screen" or "Install App"
4. Confirm by tapping "Add" or "Install"
5. The app icon will appear on your home screen

## Features

- **Offline Support**: The app works even without internet connection (cached pages)
- **Installable**: Can be installed on home screen like a native app
- **Fast Loading**: Resources are cached for instant loading
- **Standalone Mode**: Opens without browser UI for app-like experience
- **Auto Updates**: Service worker automatically updates when you deploy changes

## Testing PWA Features

### In Chrome DevTools
1. Open Chrome DevTools (F12)
2. Go to "Application" tab
3. Check:
   - Manifest section (should show BodyTracker details)
   - Service Workers section (should show registered worker)
   - Cache Storage (should show cached resources)

### Lighthouse PWA Audit
1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Progressive Web App" category
4. Click "Generate report"
5. Should score 100/100 for most PWA criteria

## Icons

Currently using SVG placeholder icons. For production:
1. Open `/public/generate-icons.html` in browser
2. Download the generated PNG icons (192x192 and 512x512)
3. Replace the placeholder icons in `/public/`

Or create custom PNG icons and place them in:
- `/public/icon-192.png` (192x192)
- `/public/icon-512.png` (512x512)

## Customization

### Change App Name
Edit `/public/manifest.json`:
```json
{
  "name": "Your App Name",
  "short_name": "AppName"
}
```

### Change Theme Color
Edit `/public/manifest.json` and `/app/layout.tsx`:
```json
{
  "theme_color": "#yourcolor",
  "background_color": "#yourcolor"
}
```

### Update Service Worker Cache
Edit `/public/sw.js` and update `CACHE_NAME` version:
```javascript
const CACHE_NAME = 'bodytracker-v2'; // Increment version
```

## Deployment Notes

When deploying to production:
1. Make sure all static assets are properly cached
2. Test offline functionality
3. Verify service worker registration in production
4. Check manifest.json is accessible at `/manifest.json`
5. Ensure icons are proper PNG files (not SVG placeholders)

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Ensure app is served over HTTPS (required for PWA)
- Clear browser cache and hard reload

### Manifest Not Loading
- Check `/manifest.json` is accessible
- Verify JSON syntax is valid
- Check browser console for manifest errors

### Icons Not Showing
- Ensure icon files exist at correct paths
- Check icon sizes match manifest specifications
- Clear cache and reinstall app

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

# BodyTracker - Health & Fitness Tracking App

A modern, AI-powered health tracking application built with Next.js, Firebase, and Gemini AI. Track your weight, food intake, and exercise with beautiful visualizations and intelligent insights.

## Features

- **Weight Tracking**: Monitor your weight progress over time
- **Food Logging**: Track calories and meals
- **Exercise Tracking**: Log workouts and activities
- **Interactive Charts**: Visualize your health data with customizable time ranges
- **AI Health Coach**: Get personalized insights powered by Google Gemini AI
- **Demo Data**: Load sample data to explore features

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Firebase** - Authentication and Firestore database
- **Recharts** - Data visualization
- **Lucide React** - Beautiful icons
- **Google Gemini AI** - AI-powered health insights

## Getting Started

### Prerequisites

- Node.js 20+ installed
- (Optional) A Firebase project for cloud sync - [What's Firebase?](FIREBASE_INFO.md)
- (Optional) Google Gemini API key for AI features

### Quick Start (No Setup Required!)

The app works immediately without any configuration:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - your data will be saved locally in your browser.

### Optional: Enable Cloud Sync with Firebase

If you want to sync data across devices:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication (Anonymous sign-in)
3. Create a Firestore database
4. Create `.env.local` and add your Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here

# Optional: For AI Coach feature
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

5. Restart the development server

The app will now use Firebase for cloud sync!

## Storage Modes

### Local Storage Mode (Default)
- ✅ No setup required
- ✅ Works immediately
- ✅ Data saved in your browser
- ⚠️ Data only on this device
- ⚠️ Lost if you clear browser data

### Firebase Cloud Mode (Optional)
- ✅ All local mode features
- ✅ Data synced across devices
- ✅ Cloud backup
- ✅ Data persists forever
- ⚠️ Requires 5-minute Firebase setup

[Learn more about Firebase](FIREBASE_INFO.md)

## Firebase Setup Details

### Firestore Database Structure

The app uses the following Firestore structure:

```
artifacts/
  └── health-tracker-v1/
      └── users/
          └── {userId}/
              └── tracker_entries/
                  └── {entryId}
                      ├── type: string ('weight' | 'food' | 'exercise')
                      ├── value: number
                      ├── name: string
                      ├── details: string
                      ├── date: string (YYYY-MM-DD)
                      └── timestamp: timestamp
```

### Firestore Security Rules

Add these rules to your Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Usage

### Adding Entries

1. Click the **+** button in the bottom navigation
2. Select entry type (Weight, Food, or Exercise)
3. Fill in the details
4. For food entries, use the "Auto-Estimate" button for AI calorie estimation
5. Click "Save Entry"

### Viewing Progress

- **Dashboard Tab**: View your current stats, charts, and recent logs
- Use time range selectors (1W, 1M, 1Y, ALL) to filter data
- Toggle different metrics on the chart (Weight, Calories, Workout)

### History Log

- **History Tab**: See all your entries grouped by day
- Delete entries by hovering and clicking the trash icon

### AI Health Coach

- Click "AI Coach" on the dashboard
- Get personalized insights based on your recent data
- Requires Gemini API key in environment variables

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Customization

### Changing Colors

Edit Tailwind classes in [app/components/BodyTracker.tsx](app/components/BodyTracker.tsx):
- Primary color: `emerald-600`
- Food tracking: `orange-500`
- Exercise tracking: `purple-500`

### Modifying Chart Appearance

The chart configuration is in the `Dashboard` component. You can adjust:
- Time ranges
- Y-axis domains
- Line styles
- Colors

## Project Structure

```
bodytracker/
├── app/
│   ├── components/
│   │   └── BodyTracker.tsx    # Main app component
│   ├── globals.css             # Global styles & animations
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── public/                     # Static assets
├── .env.local.example          # Environment variables template
└── README.md                   # This file
```

## Troubleshooting

### Firebase Connection Issues

- Verify your environment variables are correct
- Check that Anonymous authentication is enabled in Firebase Console
- Ensure Firestore is created and security rules are set

### AI Features Not Working

- Verify your Gemini API key is set in `.env.local`
- Check the browser console for API errors
- The app will still work without AI features

### Build Errors

- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules package-lock.json && npm install`

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts](https://recharts.org/)

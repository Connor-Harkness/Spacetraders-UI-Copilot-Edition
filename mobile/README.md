# SpaceTraders Mobile App

This is the React Native mobile version of the SpaceTraders UI, built with Expo.

## Features

- **Native mobile components** optimized for touch interfaces
- **Touch-optimized interface** with proper touch targets and gestures
- **Offline capability** with action queuing for when network is unavailable
- **APK build pipeline** for Android distribution
- **Cross-platform** support (iOS, Android, Web)

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g @expo/cli`)
- EAS CLI (`npm install -g eas-cli`) for building

## Development

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS (requires macOS and Xcode)
npm run ios

# Run in web browser
npm run web
```

## Building

### Android APK (for testing)
```bash
# Build APK for testing/distribution
npm run build:apk
```

### Production Builds
```bash
# Build Android App Bundle (for Play Store)
npm run build:android

# Build iOS app (requires Apple Developer account)
npm run build:ios
```

## Mobile-Specific Features

### Touch Optimization
- Minimum 44pt touch targets for accessibility
- Haptic feedback for user actions
- Swipe gesture support
- Long press interactions

### Offline Support
- Actions are queued when offline
- Automatic sync when connection is restored
- Local storage using AsyncStorage
- Smart retry logic for failed actions

### Performance
- Optimized rate limiting for mobile networks
- Adaptive behavior for slow connections
- Efficient memory management
- Background task support

### Platform Integration
- Native navigation with tab bar
- Dark mode support
- Adaptive icons
- Proper status bar handling

## Architecture

The mobile app shares most components and logic with the web version through symlinks:

- `src/screens/` - Symlinked from web app screens
- `src/services/` - Symlinked API services
- `src/types/` - Symlinked type definitions
- `src/context/TokenContext.tsx` - Mobile-specific version using AsyncStorage
- `src/utils/mobileUtils.ts` - Mobile-specific utilities

## Configuration

- `app.json` - Expo configuration
- `eas.json` - EAS Build configuration
- `babel.config.js` - Babel configuration for Expo

## Distribution

### Android
1. Build APK: `npm run build:apk`
2. Download APK from EAS dashboard
3. Install on device or distribute

### iOS
1. Build iOS app: `npm run build:ios`  
2. Submit to App Store: `npm run submit:ios`

## Testing

The app can be tested using:
- Expo Go app on physical devices
- Android Studio emulator
- iOS Simulator (macOS only)
- Web browser for cross-platform testing

## Troubleshooting

### Common Issues

**Build fails**: Ensure all dependencies are installed and EAS CLI is authenticated
**Network issues**: Check that the API endpoints are accessible from mobile network
**Storage issues**: Clear AsyncStorage if experiencing token/data issues

### Debug Mode

Start with debug flags:
```bash
expo start --dev-client --clear
```

### Performance Profiling

Use React DevTools and Flipper for performance analysis and debugging.
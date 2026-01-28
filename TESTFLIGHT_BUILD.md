# Build and Submit to TestFlight

## Quick Start

Run this command in your terminal (it will prompt you for credentials):

```bash
eas build --platform ios --profile production
```

## What to Expect

1. **Apple Account Login**: You'll be prompted to log in to your Apple Developer account
   - Use your Apple ID associated with your developer account
   - EAS will securely handle credential generation

2. **Build Process**: 
   - The build will run on Expo's servers
   - Takes approximately 15-20 minutes for the first build
   - You'll get a URL to monitor progress

3. **After Build Completes**: Submit to TestFlight:
   ```bash
   eas submit --platform ios --profile production
   ```

## Alternative: Build and Auto-Submit

To build and submit in one command:

```bash
eas build --platform ios --profile production --auto-submit
```

## Prerequisites Checklist

- [x] EAS CLI installed (`eas --version`)
- [x] Logged into EAS (`eas whoami` shows: austthomps12)
- [ ] Apple Developer Account (paid membership required)
- [ ] App created in App Store Connect with bundle ID: `com.networkmore.app`
- [ ] Apple ID credentials ready

## Important Notes

- The app name in the store will be "Network More" (from app.json)
- Bundle ID: `com.networkmore.app`
- First submission may require additional setup in App Store Connect
- After submission, the app will appear in TestFlight within a few hours

## Troubleshooting

If you get a slug mismatch error:
- The slug is currently set to match the Expo project
- You can update it in Expo dashboard later if needed

If credential issues occur:
- EAS can generate credentials automatically if you provide Apple account access
- Or you can manually provide certificates and provisioning profiles



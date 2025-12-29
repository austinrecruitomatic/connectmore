# Debugging CocoaPods Build Error

## Build Logs
Check the detailed error in the build logs:
https://expo.dev/accounts/austthomps12/projects/bolt-expo-nativewind/builds/050e32c9-8cfc-4ba0-954b-801f8cc6034b

## What to Look For
In the build logs, search for:
- "error" or "Error"
- "pod install" failures
- Specific package names that are failing
- Version conflicts

## Possible Solutions Based on Common Issues

### If it's a react-native-worklets issue:
Since we have worklets installed (0.5.1), it might be a version mismatch with react-native-reanimated.

### If it's a Stripe issue:
The Stripe package (0.50.3) might need additional configuration.

### If it's a general CocoaPods cache issue:
Try building again - sometimes EAS Build has transient issues.

## Next Steps
1. **Check the build logs URL above** - look for the specific error message
2. **Share the error details** so we can fix it precisely
3. **Alternative**: Try building with a fresh project configuration


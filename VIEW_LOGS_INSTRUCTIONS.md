# How to View Build Logs in Expo Dashboard

## Step-by-Step Instructions

### Option 1: Direct Build URL (Easiest)
1. Go to this URL in your browser:
   ```
   https://expo.dev/accounts/austthomps12/projects/bolt-expo-nativewind/builds/7a4e7495-62a8-45fd-b48e-84b501897bb5
   ```

2. You should see the build details page with:
   - Build status (errored)
   - Build number
   - A section showing build phases
   - A "View logs" button or expandable logs section

3. Click on the logs section to expand it

4. Look for the "Install pods" phase and click on it to see the detailed error

### Option 2: Via Expo Dashboard Navigation
1. Go to https://expo.dev
2. Sign in if needed
3. Click on your account name (top right) → Select "austthomps12" if not already selected
4. Click on the project "bolt-expo-nativewind" 
5. Click "Builds" in the left sidebar
6. Click on the most recent failed build (it should show "errored" status)
7. Scroll down to see the build phases
8. Find "Install pods" phase and click to expand it
9. Look for red error messages

## What You're Looking For

In the logs, specifically in the "Install pods" section, look for:
- Red error messages
- Text that says something like `[!] Error` or `pod install failed`
- Package names mentioned in errors
- Version conflict messages

## Copy the Error

Once you find the error, copy the entire error message (it might be a few lines) and share it here so we can fix it!

The error will likely mention:
- A specific package name
- A version number
- Something like "Unable to resolve dependency" or "Conflict"


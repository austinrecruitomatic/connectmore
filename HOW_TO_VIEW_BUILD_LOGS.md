# How to View Build Logs

## Method 1: Using the Build URL

The build log URL is provided in the terminal output. Copy and paste it into your browser:

```
https://expo.dev/accounts/austthomps12/projects/bolt-expo-nativewind/builds/7a4e7495-62a8-45fd-b48e-84b501897bb5
```

Just paste this URL into your web browser and it will show you the detailed build logs.

## Method 2: Using EAS CLI

Run this command to get the latest build log URL:

```bash
eas build:list --platform ios --limit 1
```

This will show you the build ID and log URL. Copy the URL and open it in your browser.

## Method 3: Expo Dashboard

1. Go to https://expo.dev
2. Log in to your account (austthomps12)
3. Navigate to your project: `bolt-expo-nativewind`
4. Click on "Builds" in the sidebar
5. Click on the failed build (most recent one)
6. You'll see the build details and logs

## What to Look For in the Logs

Once you're viewing the logs:

1. **Scroll to the "Install pods" section** - Look for this phase in the build steps
2. **Find red error messages** - These will tell you what's failing
3. **Look for package names** - The error will mention which package is causing issues
4. **Copy the error message** - It will look something like:
   - `[!] Error installing <package-name>`
   - `Podfile.lock conflict`
   - `Unable to find a specification for <package>`
   - Version conflicts

## Quick Command to Get Latest Build Log URL

```bash
eas build:list --platform ios --limit 1 --non-interactive | grep "Logs"
```

This will output just the log URL that you can copy and paste into your browser.


# Pull from GitHub and Build for TestFlight

## Quick Workflow

This workflow will:
1. Pull latest changes from GitHub
2. Preserve "Connect More" app configuration
3. Ensure build configuration is correct
4. Build and submit to TestFlight

## Step-by-Step Process

### 1. Pull from GitHub (preserving local config)

```bash
# Stash your local configuration changes
git stash push -m "Connect More config" app.json eas.json package.json package-lock.json

# Pull latest from GitHub
git pull origin main

# Restore your configuration
git stash pop
```

### 2. Fix app.json icon paths

The GitHub version uses `icon.png` but we need to ensure the icon exists. After pulling, update app.json to use the correct icon path, or create the assets directory.

### 3. Install dependencies

```bash
npm install
```

### 4. Ensure eas.json exists with environment variables

The `eas.json` file should be in your repo with environment variables configured.

### 5. Build and Submit

```bash
# Build only
eas build --platform ios --profile production

# Or build and auto-submit
eas build --platform ios --profile production --auto-submit
```

## Configuration to Preserve

When pulling from GitHub, make sure these settings in `app.json` remain:

- `name: "Connect More"`
- `bundleIdentifier: "com.connectmore.app"`  
- `package: "com.connectmore.app"`
- `scheme: "connectmore"`
- EAS project ID and update configuration
- `expo-updates` plugin

## Important Files

- `eas.json` - Must have environment variables in production.env section
- `app.json` - Must have Connect More name and bundle ID


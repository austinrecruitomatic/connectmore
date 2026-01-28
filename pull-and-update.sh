#!/bin/bash
# Pull from GitHub and prepare for TestFlight build
# This preserves the "Network More" configuration

set -e

echo "🔄 Pulling latest changes from GitHub..."

# Stash only the config files we want to preserve
git stash push -m "Network More config backup" app.json eas.json 2>/dev/null || true

# Pull latest changes
git pull origin main || git pull origin master

# Restore the stashed config
if git stash list | grep -q "Network More config backup"; then
    git stash pop
    echo "✅ Restored Network More configuration"
else
    echo "⚠️  No stashed config found, applying configuration..."
fi

# Ensure eas.json exists
if [ ! -f eas.json ]; then
    echo "📝 Creating eas.json with environment variables..."
    cat > eas.json << 'EOF'
{
  "cli": {
    "version": ">= 16.28.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://xmnymxmjbvezqadlkfhl.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtbnlteG1qYnZlenFhZGxrZmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDQwMTAsImV4cCI6MjA4MDUyMDAxMH0.1MjxEVIyhDd4xL07bTOhwkjL2Nap3bwX2xUe-QeXZdA",
        "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY": "pk_live_51RcaiKP42BlMMgLRnq2dZtbtSx7ARcLToBhYAF2tqy0Hi5vFf7kW23SsicZSdVq1OMzRiS3GicmsWPtT9KHqLt5n00oTDeiwsu"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
EOF
fi

# Apply Network More config to app.json using a Node script
node << 'NODE_SCRIPT'
const fs = require('fs');
const appJsonPath = './app.json';

if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    // Apply Network More configuration
    appJson.expo.name = "Network More";
    appJson.expo.scheme = "connectmore";
    
    if (!appJson.expo.ios) appJson.expo.ios = {};
    appJson.expo.ios.bundleIdentifier = "com.connectmore.app";
    
    if (!appJson.expo.android) appJson.expo.android = {};
    appJson.expo.android.package = "com.connectmore.app";
    
    // Ensure EAS config
    if (!appJson.expo.extra) appJson.expo.extra = {};
    if (!appJson.expo.extra.eas) appJson.expo.extra.eas = {};
    appJson.expo.extra.eas.projectId = "ad3fc800-5147-4f2e-afd8-a38723278c19";
    
    // Ensure updates config
    if (!appJson.expo.updates) appJson.expo.updates = {};
    appJson.expo.updates.url = "https://u.expo.dev/ad3fc800-5147-4f2e-afd8-a38723278c19";
    appJson.expo.updates.fallbackToCacheTimeout = 0;
    
    if (!appJson.expo.runtimeVersion) appJson.expo.runtimeVersion = {};
    appJson.expo.runtimeVersion.policy = "appVersion";
    
    // Ensure expo-updates plugin
    if (!appJson.expo.plugins) appJson.expo.plugins = [];
    if (!appJson.expo.plugins.includes('expo-updates')) {
        appJson.expo.plugins.push('expo-updates');
    }
    
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
    console.log('✅ Applied Network More configuration to app.json');
}
NODE_SCRIPT

echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Ready to build!"
echo ""
echo "To build for TestFlight, run:"
echo "  eas build --platform ios --profile production"
echo ""
echo "Or to build and auto-submit:"
echo "  eas build --platform ios --profile production --auto-submit"


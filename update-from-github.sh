#!/bin/bash
# Script to pull from GitHub while preserving Connect More configuration

set -e

echo "📥 Pulling latest changes from GitHub..."
git fetch origin
git stash

# Pull the latest changes
git pull origin main || git pull origin master

# Pop the stash to restore local config
git stash pop || true

echo "🔧 Applying Connect More configuration..."

# Ensure eas.json exists with environment variables
if [ ! -f eas.json ]; then
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

echo "📦 Installing dependencies..."
npm install

echo "✅ Ready! Run 'eas build --platform ios --profile production' to build for TestFlight"


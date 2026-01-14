# Custom Form Debugging Guide

This guide helps diagnose issues with custom forms not loading in production (App Store/TestFlight) builds.

## Common Issues

### 1. Environment Variables Not Set in Production

**Problem:** The Supabase URL and API key might not be loaded correctly in the production build.

**Check logs for:**
```
[Supabase] Missing environment variables!
[Supabase] URL: MISSING
[Supabase] Key: MISSING
```

**Solution:**
- Ensure your `.env` file is properly configured
- For EAS builds, make sure environment variables are set in `eas.json` or using EAS Secrets
- For standalone builds, verify that environment variables are baked into the build

### 2. Network Permissions

**Problem:** iOS/Android apps need explicit permission to make network requests.

**Solution for iOS:**
Check `Info.plist` for App Transport Security settings.

**Solution for Android:**
Check `AndroidManifest.xml` for INTERNET permission.

### 3. Row Level Security (RLS) Issues

**Problem:** Anonymous users might not have permission to read form fields.

**Check logs for:**
```
[CustomFormRenderer] Database error: permission denied for table custom_form_fields
```

**Solution:**
The RLS policy should already allow anonymous users to read form fields. Verify with:
```sql
SELECT policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'custom_form_fields'
AND policyname = 'Anyone can view form fields';
```

Expected result: Should show `roles: {anon, authenticated}` for `SELECT` command.

### 4. Form ID Not Set

**Problem:** The product doesn't have a form_id assigned.

**Check logs for:**
```
[ProductShare] Product loaded: [Product Name] form_id: null
[CustomFormRenderer] No form ID provided
```

**Solution:**
1. Go to the product in the admin panel
2. Assign a custom form to the product
3. Verify the product has a `form_id` in the database

### 5. No Form Fields Created

**Problem:** The form exists but has no fields.

**Check logs for:**
```
[CustomFormRenderer] Loaded fields: 0
```

**Solution:**
1. Go to the Form Builder in the admin panel
2. Edit the form and add custom fields
3. Save the form

## How to View Logs in Production

### TestFlight (iOS)

1. Connect your device to a Mac
2. Open Console.app on Mac
3. Select your device
4. Filter for your app name
5. Look for messages starting with `[Supabase]`, `[ProductShare]`, or `[CustomFormRenderer]`

### App Store (iOS)

Production apps don't show console logs. To debug:
1. Use TestFlight builds for testing
2. Implement crash reporting (e.g., Sentry)
3. Add error reporting to your app

### Google Play (Android)

1. Enable Developer Mode on your Android device
2. Connect via USB
3. Use `adb logcat` to view logs
4. Filter for your app: `adb logcat | grep "ReactNativeJS"`

## Enhanced Error Handling

The custom form now includes:

1. **Loading State:** Shows "Loading form..." while fetching fields
2. **Error State:** Shows specific error messages if loading fails
3. **Retry Button:** Allows users to retry loading the form
4. **Detailed Logging:** Console logs for debugging

## Testing Checklist

Before publishing to production:

- [ ] Test the form in development mode
- [ ] Test the form in a preview build
- [ ] Test the form in a TestFlight build
- [ ] Verify environment variables are set
- [ ] Verify network connectivity in the app
- [ ] Check that form_id is set on products
- [ ] Verify form fields are created
- [ ] Test with both authenticated and anonymous users

## Database Verification

Run these queries to verify your database setup:

```sql
-- Check if forms exist
SELECT id, name, company_id, is_active
FROM custom_forms
WHERE is_active = true;

-- Check if form fields exist
SELECT f.name as form_name, ff.label, ff.field_type, ff.required
FROM custom_forms f
LEFT JOIN custom_form_fields ff ON ff.form_id = f.id
ORDER BY f.name, ff.field_order;

-- Check if products have forms assigned
SELECT p.name, p.form_id, f.name as form_name
FROM products p
LEFT JOIN custom_forms f ON f.id = p.form_id
WHERE p.is_active = true;

-- Verify RLS policies
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('custom_form_fields', 'form_submissions')
ORDER BY tablename, policyname;
```

## Support

If you continue to experience issues:
1. Collect logs from the production app
2. Check the database using the queries above
3. Verify environment variables are correctly set
4. Test in TestFlight before publishing to App Store

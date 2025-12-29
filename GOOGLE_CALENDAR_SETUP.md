# Google Calendar Demo Scheduling Setup

This guide explains how to configure and use the demo scheduling system with Google Calendar integration.

## Features

### For Companies
- **Google Calendar Integration**: Connect your Google Calendar to automatically sync demo appointments
- **Demo Scheduling Toggle**: Enable/disable the ability for affiliates to schedule demos
- **Appointment Management**: View, update, and manage all scheduled demos
- **Push Notifications**: Receive notifications when new demos are scheduled
- **Customizable Settings**: Set available time slots and demo durations

### For Affiliates
- **Easy Scheduling**: Schedule demos directly from any company's profile page
- **Automatic Notifications**: Company receives instant notification when demo is booked
- **Customer Information**: Provide customer details, preferred time, and notes

## Setup Instructions

### 1. Google Cloud Console Setup

To enable Google Calendar integration, you need to set up OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application" as the application type
   - Add authorized redirect URIs:
     - `https://your-supabase-project.supabase.co/functions/v1/google-calendar-connect`
   - Note down the Client ID and Client Secret

5. Configure the OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Add the required scopes: `https://www.googleapis.com/auth/calendar`

### 2. Environment Variables

Add these environment variables to your Supabase project:

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

You can add these in the Supabase dashboard under:
- Settings > Edge Functions > Secrets

### 3. Company Setup

Once the Google OAuth is configured:

1. Navigate to your **Profile** page
2. Find the **Demo Scheduling** section
3. Click "Manage Demo Appointments"
4. Click "Connect Google Calendar" to authorize access
5. Toggle "Allow affiliates to schedule demos" to enable scheduling

### 4. How It Works

#### For Companies:

1. **Enable Demo Scheduling**:
   - Go to Profile > Demo Scheduling > Manage Demo Appointments
   - Connect your Google Calendar
   - Enable demo scheduling

2. **Manage Appointments**:
   - View all scheduled demos in one place
   - Mark appointments as completed, cancelled, or no-show
   - See customer contact information and notes
   - Appointments automatically sync to your Google Calendar

3. **Receive Notifications**:
   - Get push notifications when new demos are scheduled
   - View notifications in the Notifications tab

#### For Affiliates:

1. **Schedule a Demo**:
   - Visit any company's profile page
   - Click the "Schedule a Demo" button (green button with calendar icon)
   - Fill in customer information:
     - Name (required)
     - Email (required)
     - Phone (optional)
     - Preferred date and time
     - Duration (30 or 60 minutes)
     - Additional notes

2. **Confirmation**:
   - The company receives an instant notification
   - If Google Calendar is connected, the event is automatically added
   - You receive confirmation that the demo was scheduled

## Database Schema

### New Tables

#### `demo_appointments`
Stores all scheduled demo appointments:
- `company_id`: The company the demo is with
- `customer_name`, `customer_email`, `customer_phone`: Customer details
- `scheduled_time`: When the demo is scheduled
- `duration_minutes`: Demo duration
- `status`: scheduled, completed, cancelled, or no_show
- `google_calendar_event_id`: Link to Google Calendar event
- `notes`: Additional information

### Profile Fields

New fields added to the `profiles` table:
- `google_calendar_access_token`: OAuth access token (encrypted)
- `google_calendar_refresh_token`: OAuth refresh token (encrypted)
- `google_calendar_connected`: Boolean flag
- `demo_scheduling_enabled`: Whether scheduling is enabled
- `demo_duration_options`: Array of available durations [30, 60]
- `demo_availability`: Working hours by day of week

## API Endpoints

### Edge Functions

1. **google-calendar-connect**
   - Handles Google OAuth flow
   - Actions: `get-auth-url`, `exchange-code`, `disconnect`

2. **schedule-demo**
   - Creates new demo appointments
   - Syncs with Google Calendar if connected
   - Sends notifications to company

## Security

- All Google tokens are stored encrypted in the database
- Row Level Security (RLS) ensures:
  - Companies can only view their own appointments
  - Anyone (authenticated) can create appointments
  - Only companies can update appointment status
- OAuth tokens are only accessible by the profile owner

## Notifications

When a demo is scheduled:
1. A notification is created in the `notifications` table
2. Push notification is sent to the company owner
3. Notification includes:
   - Customer name
   - Scheduled time
   - Link to appointment details

## Troubleshooting

### Google Calendar Not Connecting
- Verify OAuth credentials are correct
- Check that redirect URI matches exactly
- Ensure Google Calendar API is enabled
- Verify scopes include `https://www.googleapis.com/auth/calendar`

### Appointments Not Syncing
- Check that Google Calendar connection is active
- Verify access token hasn't expired
- Check edge function logs for errors

### Notifications Not Received
- Ensure the company has notifications enabled in settings
- Check that the notification trigger is functioning
- Verify the user is logged in

## Example Usage

### Scheduling a Demo (Affiliate Perspective)

```typescript
// Navigate to company page
router.push(`/company/${companyId}`);

// Click "Schedule a Demo" button
// This navigates to: /company/${companyId}/schedule-demo

// Fill in the form and submit
// The schedule-demo edge function handles:
// 1. Creating database record
// 2. Creating Google Calendar event
// 3. Sending notification to company
```

### Viewing Appointments (Company Perspective)

```typescript
// Navigate to demo appointments
router.push('/demo-appointments');

// View list of appointments
// Update status as needed
// Connect/disconnect Google Calendar
```

## Future Enhancements

Potential improvements for the system:
- Calendar availability checking to prevent double-booking
- Email confirmations and reminders
- Rescheduling functionality
- Video meeting integration (Zoom, Google Meet)
- SMS reminders
- Custom availability rules
- Timezone support

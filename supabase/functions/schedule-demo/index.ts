import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      companyId,
      customerName,
      customerEmail,
      customerPhone,
      scheduledTime,
      durationMinutes,
      notes,
    } = await req.json();

    // Get company details and calendar token
    const { data: company } = await supabaseClient
      .from('companies')
      .select('*, profiles!inner(google_calendar_access_token, google_calendar_refresh_token, google_calendar_connected)')
      .eq('id', companyId)
      .single();

    if (!company) {
      return new Response(JSON.stringify({ error: 'Company not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create appointment in database
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from('demo_appointments')
      .insert({
        company_id: companyId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        scheduled_time: scheduledTime,
        duration_minutes: durationMinutes || 30,
        notes: notes,
        status: 'scheduled',
      })
      .select()
      .single();

    if (appointmentError) {
      return new Response(JSON.stringify({ error: appointmentError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If Google Calendar is connected, create event
    if (company.profiles.google_calendar_connected && company.profiles.google_calendar_access_token) {
      const startTime = new Date(scheduledTime);
      const endTime = new Date(startTime.getTime() + (durationMinutes || 30) * 60000);

      const event = {
        summary: `Demo with ${customerName}`,
        description: `Demo appointment\n\nCustomer: ${customerName}\nEmail: ${customerEmail}\nPhone: ${customerPhone || 'N/A'}\n\nNotes: ${notes || 'N/A'}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/New_York',
        },
        attendees: [
          { email: customerEmail },
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      const calendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${company.profiles.google_calendar_access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (calendarResponse.ok) {
        const calendarEvent = await calendarResponse.json();
        
        // Update appointment with calendar event ID
        await supabaseClient
          .from('demo_appointments')
          .update({ google_calendar_event_id: calendarEvent.id })
          .eq('id', appointment.id);
      }
    }

    return new Response(JSON.stringify({ success: true, appointment }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
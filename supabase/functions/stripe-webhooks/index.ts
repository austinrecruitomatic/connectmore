import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.4.0';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not set');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received Stripe webhook:', event.type);

    switch (event.type) {
      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;

      case 'transfer.paid':
        await handleTransferPaid(event.data.object as Stripe.Transfer);
        break;

      case 'transfer.failed':
        await handleTransferFailed(event.data.object as Stripe.Transfer);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleTransferCreated(transfer: Stripe.Transfer) {
  const { data: payout } = await supabase
    .from('payouts')
    .select('*')
    .eq('stripe_transfer_id', transfer.id)
    .maybeSingle();

  if (payout) {
    await supabase
      .from('payouts')
      .update({ status: 'processing' })
      .eq('id', payout.id);

    await supabase.from('payout_audit_log').insert({
      payout_id: payout.id,
      event_type: 'processing',
      event_data: { transfer_id: transfer.id },
      stripe_event_id: transfer.id,
    });
  }
}

async function handleTransferPaid(transfer: Stripe.Transfer) {
  const { data: payout } = await supabase
    .from('payouts')
    .select('*')
    .eq('stripe_transfer_id', transfer.id)
    .maybeSingle();

  if (payout) {
    await supabase
      .from('payouts')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', payout.id);

    await supabase
      .from('commissions')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .in('id', payout.commission_ids);

    await supabase.from('payout_audit_log').insert({
      payout_id: payout.id,
      event_type: 'completed',
      event_data: { transfer_id: transfer.id, amount: transfer.amount },
      stripe_event_id: transfer.id,
    });

    const { data: preferences } = await supabase
      .from('payout_preferences')
      .select('*')
      .eq('affiliate_id', payout.affiliate_id)
      .maybeSingle();

    if (preferences) {
      const nextDate = calculateNextPayoutDate(
        preferences.payout_frequency,
        preferences.payout_frequency_days
      );

      await supabase
        .from('payout_preferences')
        .update({ next_scheduled_payout_date: nextDate })
        .eq('affiliate_id', payout.affiliate_id);
    }
  }
}

async function handleTransferFailed(transfer: Stripe.Transfer) {
  const { data: payout } = await supabase
    .from('payouts')
    .select('*')
    .eq('stripe_transfer_id', transfer.id)
    .maybeSingle();

  if (payout) {
    await supabase
      .from('payouts')
      .update({
        status: 'failed',
        failure_reason: transfer.failure_message || 'Transfer failed',
        processing_error_code: transfer.failure_code || '',
      })
      .eq('id', payout.id);

    await supabase
      .from('commissions')
      .update({ status: 'approved' })
      .in('id', payout.commission_ids);

    await supabase.from('payout_audit_log').insert({
      payout_id: payout.id,
      event_type: 'failed',
      event_data: {
        transfer_id: transfer.id,
        failure_code: transfer.failure_code,
        failure_message: transfer.failure_message,
      },
      stripe_event_id: transfer.id,
    });
  }
}

async function handleAccountUpdated(account: Stripe.Account) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('stripe_connect_account_id', account.id)
    .maybeSingle();

  if (profile) {
    const status = account.charges_enabled ? 'verified' : 
                   account.requirements?.disabled_reason ? 'restricted' : 'pending';

    await supabase
      .from('profiles')
      .update({
        stripe_account_status: status,
        stripe_onboarding_completed: account.details_submitted || false,
      })
      .eq('stripe_connect_account_id', account.id);
  }
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  console.log('Payout paid to Connect account:', payout.id);
}

async function handlePayoutFailed(payout: Stripe.Payout) {
  console.log('Payout failed to Connect account:', payout.id, payout.failure_message);
}

function calculateNextPayoutDate(frequency: string, days: number): string {
  const now = new Date();
  let nextDate = new Date();

  switch (frequency) {
    case 'weekly':
      nextDate.setDate(now.getDate() + 7);
      break;
    case 'bi_weekly':
      nextDate.setDate(now.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(now.getMonth() + 1);
      break;
    case 'custom':
      nextDate.setDate(now.getDate() + days);
      break;
    default:
      nextDate.setDate(now.getDate() + 30);
  }

  return nextDate.toISOString().split('T')[0];
}
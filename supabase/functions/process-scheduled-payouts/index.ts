import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.4.0';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
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
    const authHeader = req.headers.get('authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting scheduled payout processing...');

    const today = new Date().toISOString().split('T')[0];

    const { data: preferences, error: prefsError } = await supabase
      .from('payout_preferences')
      .select(`
        *,
        profiles!inner(id, email, full_name, stripe_connect_account_id, stripe_account_status)
      `)
      .eq('auto_payout_enabled', true)
      .lte('next_scheduled_payout_date', today);

    if (prefsError) {
      console.error('Error fetching preferences:', prefsError);
      throw prefsError;
    }

    console.log(`Found ${preferences?.length || 0} affiliates ready for payout`);

    const results = {
      processed: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const pref of preferences || []) {
      try {
        const profile = pref.profiles;

        if (!profile.stripe_connect_account_id) {
          console.log(`Skipping ${profile.email}: No Stripe account`);
          results.skipped++;
          continue;
        }

        if (profile.stripe_account_status !== 'verified') {
          console.log(`Skipping ${profile.email}: Account not verified`);
          results.skipped++;
          continue;
        }

        const { data: commissions } = await supabase
          .from('commissions')
          .select('*')
          .eq('affiliate_id', profile.id)
          .eq('status', 'approved');

        if (!commissions || commissions.length === 0) {
          console.log(`Skipping ${profile.email}: No approved commissions`);
          results.skipped++;
          continue;
        }

        const totalAmount = commissions.reduce(
          (sum, c) => sum + parseFloat(c.affiliate_payout_amount),
          0
        );

        if (totalAmount < pref.minimum_payout_threshold) {
          console.log(`Skipping ${profile.email}: Below threshold ($${totalAmount} < $${pref.minimum_payout_threshold})`);
          results.skipped++;
          continue;
        }

        const platformFeeTotal = commissions.reduce(
          (sum, c) => sum + parseFloat(c.platform_fee_amount),
          0
        );

        const stripeFee = calculateStripeFee(totalAmount, pref.preferred_payout_method);
        const netAmount = totalAmount - stripeFee;
        const amountInCents = Math.round(netAmount * 100);

        console.log(`Processing payout for ${profile.email}: $${totalAmount} ($${netAmount} after fees)`);

        const transfer = await stripe.transfers.create({
          amount: amountInCents,
          currency: 'usd',
          destination: profile.stripe_connect_account_id,
          description: `Payout for ${commissions.length} commissions`,
          metadata: {
            affiliate_id: profile.id,
            commission_count: commissions.length.toString(),
          },
        });

        const { data: payout, error: payoutError } = await supabase
          .from('payouts')
          .insert({
            affiliate_id: profile.id,
            total_amount: totalAmount,
            platform_fee_total: platformFeeTotal,
            commission_ids: commissions.map(c => c.id),
            status: 'processing',
            scheduled_date: today,
            stripe_transfer_id: transfer.id,
            payout_method: pref.preferred_payout_method,
            stripe_fee_amount: stripeFee,
            notes: `Automated payout: ${pref.payout_frequency}`,
          })
          .select()
          .single();

        if (payoutError) {
          console.error('Error creating payout record:', payoutError);
          throw payoutError;
        }

        await supabase.from('payout_audit_log').insert({
          payout_id: payout.id,
          event_type: 'created',
          event_data: {
            transfer_id: transfer.id,
            amount: totalAmount,
            commission_count: commissions.length,
            automated: true,
          },
        });

        console.log(`Successfully created payout ${payout.id} for ${profile.email}`);
        results.processed++;
      } catch (error) {
        console.error(`Error processing payout for affiliate:`, error);
        results.failed++;
        results.errors.push(error.message);
      }
    }

    console.log('Payout processing complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fatal error in payout processing:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateStripeFee(amount: number, method: string): number {
  if (method === 'ach_standard') {
    return 0;
  }

  if (method === 'ach_instant' || method === 'debit_instant') {
    return Math.round(amount * 0.01 * 100) / 100;
  }

  return 0;
}
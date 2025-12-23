import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.4.0';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile || profile.user_type !== 'affiliate') {
      return new Response(
        JSON.stringify({ error: 'Only affiliates can create Connect accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'create';

    if (action === 'create') {
      if (profile.stripe_connect_account_id) {
        return new Response(
          JSON.stringify({ accountId: profile.stripe_connect_account_id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: profile.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
      });

      await supabaseClient
        .from('profiles')
        .update({
          stripe_connect_account_id: account.id,
          stripe_account_status: 'pending',
        })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({ accountId: account.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'onboarding_link') {
      const accountId = profile.stripe_connect_account_id;
      if (!accountId) {
        return new Response(
          JSON.stringify({ error: 'No Stripe account found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${Deno.env.get('APP_URL')}/stripe-onboarding?stripe_onboarding=refresh`,
        return_url: `${Deno.env.get('APP_URL')}/stripe-onboarding?stripe_onboarding=success`,
        type: 'account_onboarding',
      });

      return new Response(
        JSON.stringify({ url: accountLink.url }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status') {
      const accountId = profile.stripe_connect_account_id;
      if (!accountId) {
        return new Response(
          JSON.stringify({ status: 'not_created' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const account = await stripe.accounts.retrieve(accountId);

      const status = account.charges_enabled ? 'verified' : 
                     account.requirements?.disabled_reason ? 'restricted' : 'pending';

      await supabaseClient
        .from('profiles')
        .update({
          stripe_account_status: status,
          stripe_onboarding_completed: account.details_submitted || false,
        })
        .eq('id', user.id);

      const externalAccounts = await stripe.accounts.listExternalAccounts(accountId, {
        object: 'bank_account',
        limit: 1,
      });

      const defaultAccount = externalAccounts.data[0];
      if (defaultAccount) {
        await supabaseClient
          .from('profiles')
          .update({
            stripe_external_account_id: defaultAccount.id,
            stripe_external_account_last4: defaultAccount.last4,
            stripe_external_account_type: 'bank_account',
          })
          .eq('id', user.id);
      }

      return new Response(
        JSON.stringify({
          status,
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          requirements: account.requirements,
          external_account: defaultAccount ? {
            last4: defaultAccount.last4,
            bank_name: defaultAccount.bank_name,
          } : null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
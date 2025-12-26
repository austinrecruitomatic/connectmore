import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.4.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'STRIPE_SECRET_KEY not found in environment',
          details: 'Please configure your Stripe secret key in Supabase dashboard'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stripeKey.startsWith('sk_test_') && !stripeKey.startsWith('sk_live_')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid Stripe secret key format',
          keyPrefix: stripeKey.substring(0, 8),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-12-18.acacia',
    });

    const account = await stripe.accounts.retrieve();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Stripe configuration is valid',
        account: {
          id: account.id,
          email: account.email,
          type: account.type,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        },
        environment: stripeKey.startsWith('sk_test_') ? 'test' : 'live',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Stripe verification error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        type: error.type,
        details: 'Your Stripe key may be invalid or restricted. Please check your Stripe dashboard.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
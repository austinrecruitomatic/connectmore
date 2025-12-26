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
    
    const result: any = {
      timestamp: new Date().toISOString(),
      environment: {
        STRIPE_SECRET_KEY: stripeKey ? `${stripeKey.substring(0, 7)}...${stripeKey.substring(stripeKey.length - 4)}` : 'NOT_SET',
        SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? 'SET' : 'NOT_SET',
        SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') ? 'SET' : 'NOT_SET',
      },
    };

    if (!stripeKey) {
      result.error = 'STRIPE_SECRET_KEY environment variable is not set';
      result.help = 'Set this in your Supabase project settings under Edge Functions secrets';
      return new Response(
        JSON.stringify(result),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-12-18.acacia',
    });

    const balance = await stripe.balance.retrieve();
    
    result.stripeConnection = 'SUCCESS';
    result.stripeLivemode = balance.livemode;
    result.message = 'Stripe is configured correctly!';

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Stripe verification error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        type: error.type || 'unknown',
        help: 'Check that your STRIPE_SECRET_KEY is valid and has the correct permissions',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
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

type CheckoutRequest = {
  product_id: string;
  partnership_id?: string;
  amount: number;
  customer_email: string;
  customer_name?: string;
  success_url: string;
  cancel_url: string;
  metadata?: Record<string, string>;
  mode?: 'payment' | 'subscription';
  billing_frequency?: 'monthly' | 'quarterly' | 'annual';
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: CheckoutRequest = await req.json();
    const {
      product_id,
      partnership_id,
      amount,
      customer_email,
      customer_name,
      success_url,
      cancel_url,
      metadata = {},
      mode = 'payment',
      billing_frequency,
    } = body;

    // Validate required fields
    if (!product_id || !amount || !customer_email || !success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get product and company details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        company_id,
        companies (
          id,
          company_name,
          stripe_customer_id
        )
      `)
      .eq('id', product_id)
      .maybeSingle();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create Stripe customer for the company
    let stripeCustomerId = product.companies.stripe_customer_id;
    
    // Create customer payment record
    const { data: customerPayment, error: paymentError } = await supabase
      .from('customer_payments')
      .insert({
        company_id: product.company_id,
        product_id: product_id,
        partnership_id: partnership_id || null,
        amount_total: amount,
        payment_status: 'pending',
        customer_email: customer_email,
        customer_name: customer_name || '',
        customer_metadata: metadata,
        auto_create_deal: true,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating customer payment:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Stripe Checkout Session
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.description || '',
          },
          unit_amount: Math.round(amount * 100), // Convert to cents
          ...(mode === 'subscription' && billing_frequency ? {
            recurring: {
              interval: billing_frequency === 'annual' ? 'year' : 'month',
              interval_count: billing_frequency === 'quarterly' ? 3 : 1,
            },
          } : {}),
        },
        quantity: 1,
      },
    ];

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: mode,
      line_items: lineItems,
      success_url: success_url,
      cancel_url: cancel_url,
      customer_email: customer_email,
      metadata: {
        customer_payment_id: customerPayment.id,
        product_id: product_id,
        company_id: product.company_id,
        partnership_id: partnership_id || '',
        ...metadata,
      },
      payment_intent_data: mode === 'payment' ? {
        metadata: {
          customer_payment_id: customerPayment.id,
          product_id: product_id,
          company_id: product.company_id,
          partnership_id: partnership_id || '',
        },
      } : undefined,
      subscription_data: mode === 'subscription' ? {
        metadata: {
          customer_payment_id: customerPayment.id,
          product_id: product_id,
          company_id: product.company_id,
          partnership_id: partnership_id || '',
        },
      } : undefined,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Update payment record with session ID
    await supabase
      .from('customer_payments')
      .update({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string || null,
        payment_status: 'processing',
      })
      .eq('id', customerPayment.id);

    // Create audit log
    await supabase.from('payment_audit_log').insert({
      event_type: 'checkout_session_created',
      event_source: 'api_call',
      entity_type: 'customer_payment',
      entity_id: customerPayment.id,
      new_status: 'processing',
      amount: amount,
      event_data: {
        session_id: session.id,
        product_id: product_id,
        customer_email: customer_email,
      },
    });

    return new Response(
      JSON.stringify({
        session_id: session.id,
        session_url: session.url,
        customer_payment_id: customerPayment.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
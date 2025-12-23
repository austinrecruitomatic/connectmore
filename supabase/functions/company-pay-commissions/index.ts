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

type PaymentRequest = {
  commission_ids: string[];
  payment_method_id?: string;
  success_url: string;
  cancel_url: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: PaymentRequest = await req.json();
    const { commission_ids, payment_method_id, success_url, cancel_url } = body;

    if (!commission_ids || commission_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No commissions specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get company for this user
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get commissions to be paid
    const { data: commissions, error: commissionsError } = await supabase
      .from('commissions')
      .select(`
        id,
        commission_amount,
        platform_fee_amount,
        status,
        company_payment_status,
        deals (
          partnership_id,
          affiliate_partnerships (
            product_id,
            products (
              company_id
            )
          )
        )
      `)
      .in('id', commission_ids)
      .eq('status', 'approved')
      .eq('company_payment_status', 'pending');

    if (commissionsError || !commissions || commissions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid commissions found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify all commissions belong to this company
    const invalidCommissions = commissions.filter(
      (c: any) => c.deals?.affiliate_partnerships?.products?.company_id !== company.id
    );

    if (invalidCommissions.length > 0) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to pay these commissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate total amount (commission + platform fee)
    const totalAmount = commissions.reduce(
      (sum: number, c: any) => sum + parseFloat(c.commission_amount) + parseFloat(c.platform_fee_amount),
      0
    );

    // Create company commission payment record
    const { data: commissionPayment, error: paymentError } = await supabase
      .from('company_commission_payments')
      .insert({
        company_id: company.id,
        total_amount: totalAmount,
        payment_status: 'pending',
        commission_ids: commission_ids,
        number_of_commissions: commissions.length,
        payment_method_id: payment_method_id || null,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating commission payment:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create Stripe customer for company
    let stripeCustomerId = company.stripe_customer_id;
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: company.company_name,
        metadata: {
          company_id: company.id,
          user_id: user.id,
        },
      });
      
      stripeCustomerId = customer.id;
      
      // Update company with Stripe customer ID
      await supabase
        .from('companies')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', company.id);
    }

    // Create checkout session or payment intent based on whether payment method is provided
    if (payment_method_id) {
      // Direct payment with saved payment method
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: payment_method_id,
        confirm: true,
        return_url: success_url,
        metadata: {
          commission_payment_id: commissionPayment.id,
          company_id: company.id,
          commission_ids: commission_ids.join(','),
        },
        description: `Commission payment for ${commissions.length} commission(s)`,
      });

      // Update payment record
      await supabase
        .from('company_commission_payments')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          payment_status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'processing',
          paid_at: paymentIntent.status === 'succeeded' ? new Date().toISOString() : null,
        })
        .eq('id', commissionPayment.id);

      if (paymentIntent.status === 'succeeded') {
        // Update commissions as paid by company
        await supabase
          .from('commissions')
          .update({
            company_payment_status: 'paid',
            company_paid_at: new Date().toISOString(),
            company_commission_payment_id: commissionPayment.id,
          })
          .in('id', commission_ids);

        // Create reconciliation records
        for (const commission of commissions) {
          await supabase.from('payment_reconciliation').insert({
            commission_id: commission.id,
            company_commission_payment_id: commissionPayment.id,
            commission_approved: true,
            company_paid_commission: true,
            commission_amount: commission.commission_amount,
            platform_fee_amount: commission.platform_fee_amount,
            commission_approved_at: new Date().toISOString(),
            company_paid_at: new Date().toISOString(),
          });
        }

        // Record in platform treasury
        await supabase.from('platform_treasury').insert({
          transaction_type: 'commission_received',
          amount: totalAmount,
          company_commission_payment_id: commissionPayment.id,
          description: `Commission payment from ${company.company_name}`,
          metadata: { commission_ids: commission_ids },
        });
      }

      // Create audit log
      await supabase.from('payment_audit_log').insert({
        event_type: 'company_payment_created',
        event_source: 'api_call',
        entity_type: 'company_payment',
        entity_id: commissionPayment.id,
        new_status: paymentIntent.status,
        amount: totalAmount,
        triggered_by_user_id: user.id,
        event_data: {
          payment_intent_id: paymentIntent.id,
          commission_count: commissions.length,
        },
      });

      return new Response(
        JSON.stringify({
          payment_id: commissionPayment.id,
          payment_intent_id: paymentIntent.id,
          status: paymentIntent.status,
          client_secret: paymentIntent.client_secret,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Create checkout session for new payment
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: stripeCustomerId,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Commission Payment',
                description: `Payment for ${commissions.length} commission(s)`,
              },
              unit_amount: Math.round(totalAmount * 100),
            },
            quantity: 1,
          },
        ],
        success_url: success_url,
        cancel_url: cancel_url,
        metadata: {
          commission_payment_id: commissionPayment.id,
          company_id: company.id,
          commission_ids: commission_ids.join(','),
        },
      });

      // Update payment record with session ID
      await supabase
        .from('company_commission_payments')
        .update({
          stripe_payment_intent_id: session.payment_intent as string || null,
          payment_status: 'processing',
        })
        .eq('id', commissionPayment.id);

      // Update commissions status
      await supabase
        .from('commissions')
        .update({ company_payment_status: 'processing' })
        .in('id', commission_ids);

      // Create audit log
      await supabase.from('payment_audit_log').insert({
        event_type: 'company_checkout_created',
        event_source: 'api_call',
        entity_type: 'company_payment',
        entity_id: commissionPayment.id,
        new_status: 'processing',
        amount: totalAmount,
        triggered_by_user_id: user.id,
        event_data: {
          session_id: session.id,
          commission_count: commissions.length,
        },
      });

      return new Response(
        JSON.stringify({
          payment_id: commissionPayment.id,
          session_id: session.id,
          session_url: session.url,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Payment error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
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

async function processImmediatePayouts(commissionIds: string[], companyCommissionPaymentId: string) {
  try {
    // Get commissions with affiliate details
    const { data: commissions, error: commissionsError } = await supabase
      .from('commissions')
      .select(`
        id,
        affiliate_id,
        affiliate_payout_amount,
        commission_amount,
        platform_fee_amount,
        deal_id,
        profiles!commissions_affiliate_id_fkey (
          id,
          stripe_connect_account_id,
          stripe_account_status,
          full_name,
          email
        )
      `)
      .in('id', commissionIds)
      .eq('company_payment_status', 'paid');

    if (commissionsError || !commissions || commissions.length === 0) {
      console.error('Failed to fetch commissions for payout:', commissionsError);
      return;
    }

    // Group commissions by affiliate
    const affiliateCommissions = new Map<string, typeof commissions>();
    for (const commission of commissions) {
      const affiliateId = commission.affiliate_id;
      if (!affiliateCommissions.has(affiliateId)) {
        affiliateCommissions.set(affiliateId, []);
      }
      affiliateCommissions.get(affiliateId)!.push(commission);
    }

    // Process payout for each affiliate
    for (const [affiliateId, affiliateComms] of affiliateCommissions.entries()) {
      try {
        const affiliate = affiliateComms[0].profiles;

        // Check if affiliate has valid Stripe Connect account
        if (!affiliate.stripe_connect_account_id || affiliate.stripe_account_status !== 'verified') {
          console.log(`Skipping payout for affiliate ${affiliateId} - Stripe not connected or verified`);
          continue;
        }

        // Calculate total payout amount for this affiliate
        const totalPayoutAmount = affiliateComms.reduce(
          (sum, c) => sum + parseFloat(c.affiliate_payout_amount),
          0
        );

        // Create Stripe transfer
        const transfer = await stripe.transfers.create({
          amount: Math.round(totalPayoutAmount * 100), // Convert to cents
          currency: 'usd',
          destination: affiliate.stripe_connect_account_id,
          description: `Commission payout for ${affiliateComms.length} commission(s)`,
          metadata: {
            affiliate_id: affiliateId,
            commission_ids: affiliateComms.map(c => c.id).join(','),
            company_commission_payment_id: companyCommissionPaymentId,
          },
        });

        // Create payout record
        const { data: payout, error: payoutError } = await supabase
          .from('payouts')
          .insert({
            affiliate_id: affiliateId,
            amount: totalPayoutAmount,
            status: 'processing',
            commission_ids: affiliateComms.map(c => c.id),
            stripe_transfer_id: transfer.id,
            payout_method: 'ach_standard',
          })
          .select()
          .single();

        if (payoutError) {
          console.error('Failed to create payout record:', payoutError);
          continue;
        }

        // Update commissions to mark as processing payout
        await supabase
          .from('commissions')
          .update({
            status: 'pending_payout',
            affiliate_payout_id: payout.id,
          })
          .in('id', affiliateComms.map(c => c.id));

        // Update payment reconciliation
        for (const comm of affiliateComms) {
          await supabase
            .from('payment_reconciliation')
            .update({
              affiliate_payout_id: payout.id,
              affiliate_payout_initiated: true,
              affiliate_payout_initiated_at: new Date().toISOString(),
            })
            .eq('commission_id', comm.id);
        }

        // Create payout audit log
        await supabase.from('payout_audit_log').insert({
          payout_id: payout.id,
          event_type: 'created',
          event_data: {
            transfer_id: transfer.id,
            amount: totalPayoutAmount,
            commission_count: affiliateComms.length,
          },
        });

        // Record in platform treasury
        await supabase.from('platform_treasury').insert({
          transaction_type: 'affiliate_payout',
          amount: -totalPayoutAmount, // Negative because money is leaving platform
          payout_id: payout.id,
          description: `Payout to ${affiliate.full_name || affiliate.email}`,
          metadata: {
            affiliate_id: affiliateId,
            commission_ids: affiliateComms.map(c => c.id),
            transfer_id: transfer.id,
          },
        });

        console.log(`Created transfer ${transfer.id} for affiliate ${affiliateId}: $${totalPayoutAmount}`);
      } catch (affiliateError) {
        console.error(`Failed to process payout for affiliate ${affiliateId}:`, affiliateError);
        // Continue with other affiliates even if one fails
      }
    }
  } catch (error) {
    console.error('Error in processImmediatePayouts:', error);
  }
}

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

        // Process immediate payouts to affiliates
        await processImmediatePayouts(commission_ids, commissionPayment.id);
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
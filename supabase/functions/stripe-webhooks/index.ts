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
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

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

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);

  const metadata = session.metadata || {};

  if (metadata.customer_payment_id) {
    const { data: payment } = await supabase
      .from('customer_payments')
      .select('*')
      .eq('id', metadata.customer_payment_id)
      .maybeSingle();

    if (payment) {
      await supabase
        .from('customer_payments')
        .update({
          payment_status: 'succeeded',
          stripe_charge_id: session.payment_intent as string,
          stripe_customer_id: session.customer as string || null,
          receipt_url: session.url || null,
        })
        .eq('id', payment.id);

      if (payment.auto_create_deal && payment.partnership_id) {
        const { data: partnership } = await supabase
          .from('affiliate_partnerships')
          .select('affiliate_id, product_id')
          .eq('id', payment.partnership_id)
          .maybeSingle();

        if (partnership) {
          const { data: newDeal } = await supabase
            .from('deals')
            .insert({
              partnership_id: payment.partnership_id,
              affiliate_id: partnership.affiliate_id,
              deal_value: payment.amount_total,
              contract_type: 'one_time',
              status: 'active',
              contract_start_date: new Date().toISOString().split('T')[0],
              notes: `Auto-created from customer payment ${payment.id}`,
              customer_payment_id: payment.id,
              payment_verified: true,
              stripe_payment_intent_id: session.payment_intent as string,
            })
            .select()
            .single();

          if (newDeal) {
            await supabase
              .from('customer_payments')
              .update({ deal_id: newDeal.id })
              .eq('id', payment.id);

            await supabase.from('payment_reconciliation').insert({
              customer_payment_id: payment.id,
              deal_id: newDeal.id,
              customer_paid: true,
              deal_created: true,
              customer_payment_amount: payment.amount_total,
              customer_paid_at: new Date().toISOString(),
            });
          }
        }
      }

      await supabase.from('payment_audit_log').insert({
        event_type: 'customer_payment_succeeded',
        event_source: 'stripe_webhook',
        entity_type: 'customer_payment',
        entity_id: payment.id,
        new_status: 'succeeded',
        amount: payment.amount_total,
        stripe_event_id: session.id,
      });
    }
  } else if (metadata.commission_payment_id) {
    const { data: payment } = await supabase
      .from('company_commission_payments')
      .select('*, companies(company_name)')
      .eq('id', metadata.commission_payment_id)
      .maybeSingle();

    if (payment) {
      await supabase
        .from('company_commission_payments')
        .update({
          payment_status: 'succeeded',
          stripe_charge_id: session.payment_intent as string,
          paid_at: new Date().toISOString(),
          receipt_url: session.url || null,
        })
        .eq('id', payment.id);

      await supabase
        .from('commissions')
        .update({
          company_payment_status: 'paid',
          company_paid_at: new Date().toISOString(),
          company_commission_payment_id: payment.id,
        })
        .in('id', payment.commission_ids);

      await supabase
        .from('payment_reconciliation')
        .update({
          company_commission_payment_id: payment.id,
          company_paid_commission: true,
          company_paid_at: new Date().toISOString(),
        })
        .in('commission_id', payment.commission_ids);

      await supabase.from('platform_treasury').insert({
        transaction_type: 'commission_received',
        amount: payment.total_amount,
        company_commission_payment_id: payment.id,
        description: `Commission payment from ${payment.companies.company_name}`,
        metadata: { commission_ids: payment.commission_ids },
      });

      await supabase.from('payment_audit_log').insert({
        event_type: 'company_payment_succeeded',
        event_source: 'stripe_webhook',
        entity_type: 'company_payment',
        entity_id: payment.id,
        new_status: 'succeeded',
        amount: payment.total_amount,
        stripe_event_id: session.id,
      });

      // Process immediate payouts to affiliates
      await processImmediatePayouts(payment.commission_ids, payment.id);
    }
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment intent succeeded:', paymentIntent.id);

  const metadata = paymentIntent.metadata || {};

  if (metadata.customer_payment_id) {
    const { data: payment } = await supabase
      .from('customer_payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle();

    if (payment && payment.payment_status !== 'succeeded') {
      await supabase
        .from('customer_payments')
        .update({
          payment_status: 'succeeded',
          stripe_charge_id: paymentIntent.latest_charge as string,
        })
        .eq('id', payment.id);
    }
  } else if (metadata.commission_payment_id) {
    const { data: payment } = await supabase
      .from('company_commission_payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle();

    if (payment && payment.payment_status !== 'succeeded') {
      await supabase
        .from('company_commission_payments')
        .update({
          payment_status: 'succeeded',
          stripe_charge_id: paymentIntent.latest_charge as string,
          paid_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment intent failed:', paymentIntent.id);

  const metadata = paymentIntent.metadata || {};

  if (metadata.customer_payment_id) {
    await supabase
      .from('customer_payments')
      .update({ payment_status: 'failed' })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    await supabase.from('payment_audit_log').insert({
      event_type: 'customer_payment_failed',
      event_source: 'stripe_webhook',
      entity_type: 'customer_payment',
      entity_id: metadata.customer_payment_id,
      new_status: 'failed',
      stripe_event_id: paymentIntent.id,
      event_data: { failure_message: paymentIntent.last_payment_error?.message },
    });
  } else if (metadata.commission_payment_id) {
    await supabase
      .from('company_commission_payments')
      .update({ payment_status: 'failed' })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    await supabase.from('payment_audit_log').insert({
      event_type: 'company_payment_failed',
      event_source: 'stripe_webhook',
      entity_type: 'company_payment',
      entity_id: metadata.commission_payment_id,
      new_status: 'failed',
      stripe_event_id: paymentIntent.id,
      event_data: { failure_message: paymentIntent.last_payment_error?.message },
    });
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log('Charge refunded:', charge.id);

  const { data: payment } = await supabase
    .from('customer_payments')
    .select('*')
    .eq('stripe_charge_id', charge.id)
    .maybeSingle();

  if (payment) {
    const refundAmount = charge.amount_refunded / 100;

    await supabase
      .from('customer_payments')
      .update({
        payment_status: charge.refunded ? 'refunded' : 'succeeded',
        refunded_amount: refundAmount,
        refunded_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (payment.deal_id) {
      const { data: commissions } = await supabase
        .from('commissions')
        .select('id')
        .eq('deal_id', payment.deal_id);

      if (commissions) {
        console.log('Commissions need adjustment due to refund:', commissions);
      }
    }

    await supabase.from('payment_audit_log').insert({
      event_type: 'payment_refunded',
      event_source: 'stripe_webhook',
      entity_type: 'customer_payment',
      entity_id: payment.id,
      new_status: 'refunded',
      amount: refundAmount,
      stripe_event_id: charge.id,
    });
  }
}

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
    // Update payout status to completed
    await supabase
      .from('payouts')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', payout.id);

    // Update commissions to mark as paid
    await supabase
      .from('commissions')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .in('id', payout.commission_ids);

    // Update payment reconciliation
    await supabase
      .from('payment_reconciliation')
      .update({
        affiliate_paid: true,
        affiliate_paid_at: new Date().toISOString(),
        fully_settled: true,
      })
      .in('commission_id', payout.commission_ids);

    // Create payout audit log
    await supabase.from('payout_audit_log').insert({
      payout_id: payout.id,
      event_type: 'completed',
      event_data: {
        transfer_id: transfer.id,
        amount: transfer.amount / 100, // Convert from cents
        destination: transfer.destination,
      },
      stripe_event_id: transfer.id,
    });

    // Create payment audit log for each commission
    await supabase.from('payment_audit_log').insert({
      event_type: 'affiliate_payout_completed',
      event_source: 'stripe_webhook',
      entity_type: 'payout',
      entity_id: payout.id,
      new_status: 'completed',
      amount: payout.amount,
      stripe_event_id: transfer.id,
    });

    console.log(`Transfer ${transfer.id} completed for payout ${payout.id}`);
  }
}

async function handleTransferFailed(transfer: Stripe.Transfer) {
  const { data: payout } = await supabase
    .from('payouts')
    .select('*')
    .eq('stripe_transfer_id', transfer.id)
    .maybeSingle();

  if (payout) {
    // Update payout status to failed
    await supabase
      .from('payouts')
      .update({
        status: 'failed',
        failure_reason: transfer.failure_message || 'Transfer failed',
        processing_error_code: transfer.failure_code || '',
      })
      .eq('id', payout.id);

    // Revert commission status back to approved so they can be retried
    await supabase
      .from('commissions')
      .update({
        status: 'approved',
        affiliate_payout_id: null,
      })
      .in('id', payout.commission_ids);

    // Update payment reconciliation
    await supabase
      .from('payment_reconciliation')
      .update({
        affiliate_payout_id: null,
        affiliate_payout_initiated: false,
        affiliate_payout_initiated_at: null,
      })
      .in('commission_id', payout.commission_ids);

    // Create payout audit log
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

    // Create payment audit log
    await supabase.from('payment_audit_log').insert({
      event_type: 'affiliate_payout_failed',
      event_source: 'stripe_webhook',
      entity_type: 'payout',
      entity_id: payout.id,
      new_status: 'failed',
      stripe_event_id: transfer.id,
      event_data: {
        failure_code: transfer.failure_code,
        failure_message: transfer.failure_message,
      },
    });

    console.error(`Transfer ${transfer.id} failed for payout ${payout.id}: ${transfer.failure_message}`);
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
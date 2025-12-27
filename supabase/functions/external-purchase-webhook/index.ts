import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Webhook-Secret",
};

interface ExternalPurchasePayload {
  affiliate_code: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  purchase_amount: number;
  quantity?: number;
  external_purchase_id?: string;
  purchased_at?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: ExternalPurchasePayload = await req.json();

    if (!payload.affiliate_code || !payload.product_id || !payload.customer_email || !payload.purchase_amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: affiliate_code, product_id, customer_email, purchase_amount" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, description, product_price, currency, company_id, commission_rate, commission_type, product_url, affiliate_discount_enabled, affiliate_discount_type, affiliate_discount_value")
      .eq("id", payload.product_id)
      .maybeSingle();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: partnership, error: partnershipError } = await supabase
      .from("affiliate_partnerships")
      .select("id, affiliate_id, company_id, affiliate_code")
      .eq("affiliate_code", payload.affiliate_code)
      .eq("company_id", product.company_id)
      .eq("status", "approved")
      .maybeSingle();

    if (partnershipError || !partnership) {
      return new Response(
        JSON.stringify({ error: "Partnership not found or not approved" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const quantity = payload.quantity || 1;
    const purchaseAmount = payload.purchase_amount;

    let commissionAmount = 0;
    if (product.commission_type === "percentage") {
      commissionAmount = (purchaseAmount * product.commission_rate) / 100;
    } else {
      commissionAmount = product.commission_rate * quantity;
    }

    const { data: settings } = await supabase
      .from("company_settings")
      .select("platform_fee_rate")
      .eq("company_id", product.company_id)
      .maybeSingle();

    const platformFeeRate = settings?.platform_fee_rate || 20;
    const platformFee = (commissionAmount * platformFeeRate) / 100;

    let discountAmount = 0;
    let discountApplied = false;
    if (product.affiliate_discount_enabled && product.affiliate_discount_value) {
      discountApplied = true;
      if (product.affiliate_discount_type === "percentage") {
        const originalAmount = purchaseAmount / (1 - product.affiliate_discount_value / 100);
        discountAmount = originalAmount - purchaseAmount;
      } else {
        discountAmount = product.affiliate_discount_value * quantity;
      }
    }

    const { data: purchase, error: purchaseError } = await supabase
      .from("product_purchases")
      .insert({
        product_id: product.id,
        affiliate_id: partnership.affiliate_id,
        company_id: product.company_id,
        customer_name: payload.customer_name,
        customer_email: payload.customer_email,
        customer_phone: payload.customer_phone || null,
        purchase_amount: purchaseAmount,
        commission_amount: commissionAmount,
        platform_fee: platformFee,
        quantity: quantity,
        status: "completed",
        payment_method: "external",
        product_url: product.product_url || null,
        discount_applied: discountApplied,
        discount_amount: discountAmount,
        purchased_at: payload.purchased_at || new Date().toISOString(),
        external_purchase_id: payload.external_purchase_id || null,
      })
      .select()
      .single();

    if (purchaseError) {
      console.error("Error creating purchase:", purchaseError);
      throw purchaseError;
    }

    await supabase.from("leads").insert({
      partnership_id: partnership.id,
      lead_type: "conversion",
      lead_data: {
        source: "external_purchase_webhook",
        product_id: product.id,
        purchase_id: purchase.id,
        purchase_amount: purchaseAmount,
        commission_amount: commissionAmount,
        external_purchase_id: payload.external_purchase_id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        purchase_id: purchase.id,
        commission_amount: commissionAmount,
        message: "Purchase tracked successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing external purchase webhook:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

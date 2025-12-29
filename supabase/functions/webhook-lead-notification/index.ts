import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ContactSubmission {
  event_type: 'new_lead' | 'lead_update';
  id: string;
  product_id: string;
  affiliate_id: string;
  contact_name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  contract_value?: number;
  contract_length_months?: number;
  status?: string;
  created_at: string;
  updated_at?: string;
  previous_status?: string;
  previous_contract_value?: number;
}

interface WebhookPayload {
  event_type: 'new_lead' | 'lead_update';
  lead_id: string;
  product_name: string;
  affiliate_name: string;
  affiliate_email: string;
  contact_name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  contract_value?: number;
  contract_length_months?: number;
  status?: string;
  source_tag: string;
  submitted_at: string;
  updated_at?: string;
  previous_status?: string;
  previous_contract_value?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const submission: ContactSubmission = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const productResponse = await fetch(
      `${supabaseUrl}/rest/v1/products?id=eq.${submission.product_id}&select=product_name,company_id`,
      {
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    const products = await productResponse.json();
    if (!products || products.length === 0) {
      throw new Error("Product not found");
    }

    const product = products[0];

    const companyResponse = await fetch(
      `${supabaseUrl}/rest/v1/companies?id=eq.${product.company_id}&select=webhook_url,webhook_secret,webhook_enabled,lead_source_tag`,
      {
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    const companies = await companyResponse.json();
    if (!companies || companies.length === 0) {
      throw new Error("Company not found");
    }

    const company = companies[0];

    if (!company.webhook_enabled || !company.webhook_url) {
      console.log("Webhook not enabled for company");
      return new Response(
        JSON.stringify({ message: "Webhook not configured" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const affiliateResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${submission.affiliate_id}&select=full_name,email`,
      {
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    const affiliates = await affiliateResponse.json();
    const affiliate = affiliates?.[0];

    const webhookPayload: WebhookPayload = {
      event_type: submission.event_type || 'new_lead',
      lead_id: submission.id,
      product_name: product.product_name,
      affiliate_name: affiliate?.full_name || "Unknown",
      affiliate_email: affiliate?.email || "",
      contact_name: submission.contact_name,
      email: submission.email,
      phone: submission.phone,
      company: submission.company,
      message: submission.message,
      contract_value: submission.contract_value,
      contract_length_months: submission.contract_length_months,
      status: submission.status,
      source_tag: company.lead_source_tag || "connect more",
      submitted_at: submission.created_at,
      updated_at: submission.updated_at,
      ...(submission.event_type === 'lead_update' && {
        previous_status: submission.previous_status,
        previous_contract_value: submission.previous_contract_value,
      }),
    };

    const webhookHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (company.webhook_secret) {
      webhookHeaders["X-Webhook-Secret"] = company.webhook_secret;
    }

    const webhookResponse = await fetch(company.webhook_url, {
      method: "POST",
      headers: webhookHeaders,
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      console.error(
        `Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`
      );
    }

    return new Response(
      JSON.stringify({
        message: "Webhook sent",
        status: webhookResponse.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
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
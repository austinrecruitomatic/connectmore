# External Purchase Tracking Guide

When a customer clicks "Get Started" on a shared product link, the system tracks the click and appends the affiliate code to the external checkout URL (e.g., `?ref=AFFILIATE123`).

To track when these external purchases complete, configure your external checkout system to call our webhook.

## Webhook Endpoint

```
POST https://[YOUR_SUPABASE_URL]/functions/v1/external-purchase-webhook
```

## Required Payload

Send a POST request with this JSON payload when a purchase completes:

```json
{
  "affiliate_code": "AFFILIATE123",
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "customer_name": "Jane Smith",
  "customer_email": "jane@example.com",
  "customer_phone": "+1 555-123-4567",
  "purchase_amount": 299.99,
  "quantity": 1,
  "external_purchase_id": "stripe_ch_abc123",
  "purchased_at": "2024-01-15T10:30:00Z"
}
```

### Required Fields

- `affiliate_code` - The affiliate code from the URL parameter (e.g., `?ref=AFFILIATE123`)
- `product_id` - Your product ID from the system
- `customer_name` - Customer's full name
- `customer_email` - Customer's email address
- `purchase_amount` - Final purchase amount (after any discounts)

### Optional Fields

- `customer_phone` - Customer's phone number
- `quantity` - Number of units purchased (default: 1)
- `external_purchase_id` - Your system's purchase/transaction ID
- `purchased_at` - ISO 8601 timestamp (default: current time)

## Response

Success (200):
```json
{
  "success": true,
  "purchase_id": "uuid-of-purchase-record",
  "commission_amount": 50.00,
  "message": "Purchase tracked successfully"
}
```

Error (400/404/500):
```json
{
  "error": "Error description"
}
```

## Integration Examples

### Stripe Webhook

```javascript
// In your Stripe webhook handler
app.post('/stripe-webhook', async (req, res) => {
  const event = req.body;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Get affiliate code from metadata
    const affiliateCode = session.metadata?.affiliate_code;

    if (affiliateCode) {
      await fetch('https://your-supabase-url.supabase.co/functions/v1/external-purchase-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_code: affiliateCode,
          product_id: session.metadata.product_id,
          customer_name: session.customer_details.name,
          customer_email: session.customer_details.email,
          purchase_amount: session.amount_total / 100,
          external_purchase_id: session.id,
          purchased_at: new Date().toISOString()
        })
      });
    }
  }

  res.json({ received: true });
});
```

### Gumroad Webhook

```javascript
// In your Gumroad webhook handler
app.post('/gumroad-webhook', async (req, res) => {
  const sale = req.body;

  // Gumroad includes custom fields
  const affiliateCode = sale.custom_fields?.affiliate_code;

  if (affiliateCode) {
    await fetch('https://your-supabase-url.supabase.co/functions/v1/external-purchase-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        affiliate_code: affiliateCode,
        product_id: sale.product_id,
        customer_name: sale.full_name,
        customer_email: sale.email,
        purchase_amount: parseFloat(sale.price),
        external_purchase_id: sale.sale_id,
        purchased_at: sale.created_at
      })
    });
  }

  res.json({ success: true });
});
```

## What Happens When a Purchase is Tracked

1. **Purchase Record Created** - A record is added to `product_purchases` table
2. **Commission Calculated** - Based on product commission settings
3. **Platform Fee Applied** - Based on company settings
4. **Lead Conversion Tracked** - A "conversion" lead is created
5. **Outgoing Webhook Sent** - Your configured webhook receives the purchase notification
6. **Affiliate Notified** - Affiliate sees the commission in their dashboard

## Testing

Test the webhook with curl:

```bash
curl -X POST https://your-supabase-url.supabase.co/functions/v1/external-purchase-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "affiliate_code": "TEST123",
    "product_id": "your-product-id",
    "customer_name": "Test Customer",
    "customer_email": "test@example.com",
    "purchase_amount": 99.99
  }'
```

## Important Notes

1. **Capture the affiliate code** - Extract the `ref` parameter from your checkout URL
2. **Store in metadata** - Save the affiliate code in your checkout system's metadata
3. **Call webhook on success** - Only call when payment is confirmed
4. **Handle errors** - The webhook returns error details if something fails
5. **Idempotency** - Each external_purchase_id should be unique to prevent duplicates

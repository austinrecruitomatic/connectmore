# Purchase Webhook Integration Guide

This guide explains how to integrate the purchase webhook system with your CRM or external systems.

## Overview

When a customer completes a purchase through an affiliate link, the system automatically sends a webhook notification to your configured endpoint. This allows you to track sales, update your CRM, and trigger automated workflows.

## Webhook Configuration

### Setting Up the Webhook

1. Navigate to **Profile** → **CRM Integration** → **Configure Webhook**
2. Enter your webhook URL (must be HTTPS)
3. Set a webhook secret for security (recommended)
4. Save the configuration

The same webhook URL configured for leads will also receive purchase notifications.

## Webhook Payload

### Purchase Completed Event

When a purchase is completed, your endpoint will receive a POST request with the following JSON payload:

```json
{
  "event": "purchase.completed",
  "purchase_id": "550e8400-e29b-41d4-a716-446655440000",
  "product": {
    "id": "abc123...",
    "name": "Premium Software License",
    "description": "Annual subscription to premium features",
    "price": 299.99,
    "currency": "USD"
  },
  "affiliate": {
    "id": "def456...",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "customer": {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1 555-123-4567"
  },
  "purchase_details": {
    "amount": 254.99,
    "quantity": 1,
    "commission_amount": 50.00,
    "discount_applied": true,
    "discount_amount": 45.00,
    "product_url": "https://yoursite.com/product/premium"
  },
  "purchased_at": "2024-01-15T10:30:00Z",
  "timestamp": "2024-01-15T10:30:05Z"
}
```

### Payload Fields

| Field | Type | Description |
|-------|------|-------------|
| `event` | string | Always "purchase.completed" for purchases |
| `purchase_id` | string | Unique identifier for the purchase |
| `product.id` | string | Product identifier |
| `product.name` | string | Product name |
| `product.description` | string | Product description |
| `product.price` | number | Original product price |
| `product.currency` | string | Currency code (USD, EUR, etc.) |
| `affiliate.id` | string | Affiliate identifier |
| `affiliate.name` | string | Affiliate full name |
| `affiliate.email` | string | Affiliate email address |
| `customer.name` | string | Customer full name |
| `customer.email` | string | Customer email address |
| `customer.phone` | string\|null | Customer phone number |
| `purchase_details.amount` | number | Final purchase amount (after discount) |
| `purchase_details.quantity` | number | Number of units purchased |
| `purchase_details.commission_amount` | number | Commission earned by affiliate |
| `purchase_details.discount_applied` | boolean | Whether affiliate discount was used |
| `purchase_details.discount_amount` | number | Amount discounted |
| `purchase_details.product_url` | string\|null | Product URL used during checkout |
| `purchased_at` | string | ISO 8601 timestamp of purchase |
| `timestamp` | string | ISO 8601 timestamp of webhook send |

## Request Headers

The webhook request includes the following headers:

```
Content-Type: application/json
X-Webhook-Secret: your-configured-secret
X-Event-Type: purchase.completed
```

## Security

### Verifying Webhook Authenticity

Always verify the webhook secret to ensure the request is legitimate:

1. Check the `X-Webhook-Secret` header matches your configured secret
2. Validate the request came from your expected source
3. Implement request signing for additional security

Example verification (Node.js/Express):

```javascript
app.post('/webhook/purchases', (req, res) => {
  const secret = req.headers['x-webhook-secret'];

  // Verify the secret
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = req.body;

  // Process the purchase event
  if (payload.event === 'purchase.completed') {
    // Update CRM, send notifications, etc.
    console.log('Purchase completed:', payload.purchase_id);
    console.log('Customer:', payload.customer.email);
    console.log('Amount:', payload.purchase_details.amount);
  }

  res.status(200).json({ received: true });
});
```

## Response Requirements

Your webhook endpoint should:

1. Respond with HTTP 200 status code to acknowledge receipt
2. Return a JSON response (e.g., `{ "received": true }`)
3. Process the webhook asynchronously if needed
4. Respond within 10 seconds to avoid timeouts

## Use Cases

### CRM Integration

Update your CRM when a purchase is completed:

```javascript
async function handlePurchaseWebhook(payload) {
  // Create or update customer in CRM
  await crm.customers.upsert({
    email: payload.customer.email,
    name: payload.customer.name,
    phone: payload.customer.phone
  });

  // Create deal/opportunity
  await crm.deals.create({
    customer_email: payload.customer.email,
    amount: payload.purchase_details.amount,
    product: payload.product.name,
    affiliate: payload.affiliate.email,
    status: 'closed_won'
  });

  // Track commission
  await crm.commissions.create({
    affiliate_email: payload.affiliate.email,
    amount: payload.purchase_details.commission_amount,
    purchase_id: payload.purchase_id
  });
}
```

### Email Automation

Trigger automated email sequences:

```javascript
async function handlePurchaseWebhook(payload) {
  // Send purchase confirmation to customer
  await emailService.send({
    to: payload.customer.email,
    template: 'purchase-confirmation',
    data: {
      product_name: payload.product.name,
      amount: payload.purchase_details.amount,
      discount: payload.purchase_details.discount_amount
    }
  });

  // Notify affiliate of earned commission
  await emailService.send({
    to: payload.affiliate.email,
    template: 'commission-earned',
    data: {
      commission: payload.purchase_details.commission_amount,
      customer_name: payload.customer.name,
      product_name: payload.product.name
    }
  });
}
```

### Analytics Tracking

Send purchase data to analytics platforms:

```javascript
async function handlePurchaseWebhook(payload) {
  // Track in Google Analytics
  await analytics.track({
    event: 'purchase',
    user_id: payload.customer.email,
    properties: {
      revenue: payload.purchase_details.amount,
      product_id: payload.product.id,
      product_name: payload.product.name,
      affiliate_id: payload.affiliate.id,
      discount_applied: payload.purchase_details.discount_applied
    }
  });
}
```

## Testing

### Test Your Webhook

1. Set up a test endpoint (use services like webhook.site for testing)
2. Complete a test purchase in the system
3. Verify your endpoint receives the webhook payload
4. Check all fields are present and correct
5. Implement proper error handling

### Example Test Endpoint

```javascript
// Simple Express server for testing
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook/test', (req, res) => {
  console.log('Received webhook:');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('Headers:', req.headers);

  res.status(200).json({ received: true });
});

app.listen(3000, () => {
  console.log('Test webhook server running on port 3000');
});
```

## Troubleshooting

### Webhook Not Received

1. Verify webhook URL is correct and accessible
2. Check your firewall allows incoming requests
3. Ensure SSL certificate is valid (HTTPS required)
4. Check server logs for errors
5. Verify webhook is configured in company settings

### Invalid Payload

1. Check webhook secret matches
2. Verify JSON parsing is working
3. Ensure all required fields are accessed correctly
4. Check for null values where applicable

### Timeout Issues

1. Respond quickly (within 10 seconds)
2. Process webhook data asynchronously
3. Return 200 status immediately
4. Queue heavy processing for background jobs

## Best Practices

1. **Always verify the webhook secret** before processing
2. **Respond quickly** with 200 status
3. **Process asynchronously** for heavy operations
4. **Log all webhook requests** for debugging
5. **Handle errors gracefully** and return 200 even on processing errors
6. **Implement retry logic** in your application if needed
7. **Test thoroughly** before going to production
8. **Monitor webhook failures** and set up alerts
9. **Keep webhook URLs secure** and don't expose them publicly
10. **Document your integration** for future reference

## Support

If you encounter issues with webhook integration:

1. Check the webhook configuration in your profile settings
2. Test with a simple endpoint first
3. Review server logs for errors
4. Contact support with webhook payload examples
5. Provide your webhook URL for debugging (if comfortable)

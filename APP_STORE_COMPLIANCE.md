# iOS & Android App Store Payment Compliance

## Overview

This app uses Stripe for credit card processing, which is fully compliant with both Apple App Store and Google Play Store policies.

## Why This Implementation is Compliant

### Use Case: B2B Commission Payments

The credit card functionality in this app is used exclusively for **Business-to-Business (B2B) transactions**:

- **Companies** add credit cards to pay affiliate commissions
- **Affiliates** receive payouts for referring customers
- **Platform** processes commission payments between businesses

This is **NOT** for:
- Purchasing in-app digital content
- Consumer purchases of app features
- Subscriptions to app functionality

### Apple App Store Guidelines

According to Apple's App Store Review Guidelines (3.1.1), apps may use third-party payment systems for:

> "Physical goods and services outside of the app"
> "Business-to-business commerce transactions"

Our implementation qualifies because:
1. Payments are for **business services** (affiliate marketing commissions)
2. Transactions are **B2B** (company to affiliate/platform)
3. No digital content or app features are being purchased
4. Similar to how apps like Uber, DoorDash handle B2B contractor payments

### Google Play Store Policies

Google Play's payment policies allow third-party payment processors for:

> "Peer-to-peer payments"
> "Products where payment is for physical goods"
> "Products where payment is for digital content consumed outside the app"

Our use case qualifies because:
1. Platform facilitates business transactions between parties
2. Commissions are for external business services (lead generation, referrals)
3. No in-app content or features are behind these payments

## Implementation Details

### Native Payment Support

The app uses `@stripe/stripe-react-native` SDK which provides:

- **iOS Support**: Native iOS payment forms compliant with Apple's requirements
- **Android Support**: Native Android payment forms compliant with Google's requirements
- **PCI Compliance**: Stripe handles all card data securely
- **No Web Views**: Uses native components, not embedded web forms

### Payment Flow

1. Company signs up for the platform
2. Company adds payment method via native Stripe forms
3. Affiliate generates leads/sales
4. Company approves commissions
5. Platform processes payments using stored payment method
6. Affiliates receive payouts via Stripe Connect

### Key Files

- `app/stripe-card-setup.tsx` - Native card input form (iOS/Android/Web)
- `app/payout-settings.tsx` - Payment method management
- `supabase/functions/company-setup-payment-method/index.ts` - Backend payment processing

## Documentation for App Review

When submitting to app stores, include this information:

### For Apple Review Team

**App Category**: Business
**Payment Use Case**: B2B commission payments for affiliate marketing platform
**Why Third-Party Payment**: Payments are for business services (affiliate commissions), not app features or digital content

### For Google Play Review Team

**App Category**: Business
**Payment Type**: Business-to-business transactions
**Payment Processor**: Stripe (PCI-DSS compliant)

## Additional Compliance Notes

1. **No In-App Purchases Required**: This app correctly does NOT use Apple IAP or Google Play Billing because it's for B2B services
2. **Clear User Experience**: Payment screens clearly indicate "Business Commission Payments"
3. **Stripe Compliance**: Stripe is a certified payment processor accepted by both stores
4. **Similar Apps**: Many approved apps use this same pattern (Square, Shopify, PayPal business apps)

## Potential Review Questions

**Q: Why not use Apple IAP or Google Play Billing?**
A: Those systems are designed for consumer purchases of app content. Our platform processes B2B payments for business services (affiliate commissions), which is explicitly allowed to use third-party payment processors.

**Q: What are users purchasing?**
A: Companies are not purchasing app features. They're funding their business account to pay commissions to their affiliates for lead generation services.

**Q: Can the app function without payments?**
A: Yes. Affiliates can use the app without adding payment methods. Companies can view analytics, manage partnerships, and track leads. Payments are only required when processing commission payouts.

## References

- [Apple App Store Review Guidelines - Section 3.1](https://developer.apple.com/app-store/review/guidelines/#business)
- [Google Play Payments Policy](https://support.google.com/googleplay/android-developer/answer/9858738)
- [Stripe Documentation for Mobile Apps](https://stripe.com/docs/mobile/ios)

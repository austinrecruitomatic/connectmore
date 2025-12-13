import { Platform } from 'react-native';

export const STRIPE_CONFIG = {
  publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  merchantIdentifier: 'merchant.com.affiliate.portal',
  urlScheme: 'affiliate-portal',
};

export const PAYOUT_METHODS = [
  {
    value: 'ach_standard',
    label: 'Bank Transfer (ACH)',
    description: 'Free, arrives in 2-3 business days',
    fee: 0,
    feeDescription: 'No fees',
    estimatedArrival: '2-3 business days',
  },
  {
    value: 'ach_instant',
    label: 'Instant Bank Transfer',
    description: '1% fee, arrives in minutes',
    fee: 0.01,
    feeDescription: '1% of transfer amount',
    estimatedArrival: '30 minutes',
    minAmount: 1,
    maxAmount: 100000,
  },
  {
    value: 'debit_instant',
    label: 'Instant to Debit Card',
    description: '1% fee, arrives in 30 minutes',
    fee: 0.01,
    feeDescription: '1% of transfer amount',
    estimatedArrival: '30 minutes',
    minAmount: 1,
    maxAmount: 5000,
  },
];

export const PAYOUT_FREQUENCIES = [
  {
    value: 'weekly',
    label: 'Weekly',
    description: 'Payouts every 7 days',
    days: 7,
  },
  {
    value: 'bi_weekly',
    label: 'Bi-Weekly',
    description: 'Payouts every 14 days',
    days: 14,
  },
  {
    value: 'monthly',
    label: 'Monthly',
    description: 'Payouts every 30 days',
    days: 30,
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Set your own frequency (7-90 days)',
    days: 30,
  },
];

export const MINIMUM_PAYOUT_THRESHOLDS = [
  { value: 10, label: '$10' },
  { value: 25, label: '$25' },
  { value: 50, label: '$50' },
  { value: 100, label: '$100' },
  { value: 250, label: '$250' },
  { value: 500, label: '$500' },
];

export function calculateStripeFee(amount: number, method: string): number {
  const payoutMethod = PAYOUT_METHODS.find(m => m.value === method);
  if (!payoutMethod || payoutMethod.fee === 0) return 0;

  return Math.round(amount * payoutMethod.fee * 100) / 100;
}

export function calculateNetPayout(amount: number, method: string): number {
  const fee = calculateStripeFee(amount, method);
  return amount - fee;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function getPayoutMethodDetails(method: string) {
  return PAYOUT_METHODS.find(m => m.value === method);
}

export function isInstantPayoutMethod(method: string): boolean {
  return method === 'ach_instant' || method === 'debit_instant';
}

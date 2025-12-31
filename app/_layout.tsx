import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/lib/AuthContext';
import { StripeProvider } from '@stripe/stripe-react-native';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/signup" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="admin/affiliates" />
          <Stack.Screen name="admin/commissions" />
          <Stack.Screen name="admin/companies" />
          <Stack.Screen name="admin/payouts" />
          <Stack.Screen name="admin/purchases" />
          <Stack.Screen name="company/[id]" />
          <Stack.Screen name="company/[id]/write-review" />
          <Stack.Screen name="customer-earnings" />
          <Stack.Screen name="customer-portal" />
          <Stack.Screen name="customer-referrals" />
          <Stack.Screen name="landing-page/create" />
          <Stack.Screen name="landing-page/my-pages" />
          <Stack.Screen name="landing-page/view" />
          <Stack.Screen name="lp/[slug]" />
          <Stack.Screen name="marketing" />
          <Stack.Screen name="my-network" />
          <Stack.Screen name="payout-settings" />
          <Stack.Screen name="product/[id]/access" />
          <Stack.Screen name="product/[id]/checkout" />
          <Stack.Screen name="product/[id]/share" />
          <Stack.Screen name="product/[id]/template-edit" />
          <Stack.Screen name="product/[id]/templates" />
          <Stack.Screen name="stripe-card-setup" />
          <Stack.Screen name="stripe-onboarding" />
          <Stack.Screen name="stripe-test" />
          <Stack.Screen name="leaderboard" />
          <Stack.Screen name="webhook-settings" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </StripeProvider>
  );
}

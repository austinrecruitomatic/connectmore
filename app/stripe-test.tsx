import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function StripeTestScreen() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const router = useRouter();

  const runTests = async () => {
    setLoading(true);
    const testResults: any = {
      timestamp: new Date().toISOString(),
      tests: [],
    };

    try {
      testResults.tests.push({
        name: 'Environment Variables',
        status: 'checking',
        data: {
          EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT_SET',
          EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET',
          EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?
            `${process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY.substring(0, 20)}...` : 'NOT_SET',
        },
      });

      const { data: session } = await supabase.auth.getSession();
      testResults.tests.push({
        name: 'Auth Session',
        status: session?.session ? 'PASS' : 'FAIL',
        data: {
          userId: session?.session?.user?.id,
          email: session?.session?.user?.email,
        },
      });

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.session?.user?.id)
        .single();

      testResults.tests.push({
        name: 'Profile',
        status: profile ? 'PASS' : 'FAIL',
        data: {
          userType: profile?.user_type,
          stripeCustomerId: profile?.stripe_customer_id || 'NOT_SET',
          stripePaymentMethodId: profile?.stripe_payment_method_id || 'NOT_SET',
        },
      });

      const verifyResponse = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-stripe`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
        }
      );

      const verifyData = await verifyResponse.json();
      testResults.tests.push({
        name: 'Stripe Backend Connection',
        status: verifyResponse.ok ? 'PASS' : 'FAIL',
        data: verifyData,
      });

      if (typeof window !== 'undefined') {
        const stripeLoaded = !!(window as any).Stripe;
        testResults.tests.push({
          name: 'Stripe.js Frontend',
          status: stripeLoaded ? 'PASS' : 'FAIL',
          data: {
            loaded: stripeLoaded,
            scriptTag: !!document.getElementById('stripe-js'),
          },
        });

        if (stripeLoaded) {
          const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
          const stripeInstance = (window as any).Stripe(publishableKey);
          testResults.tests.push({
            name: 'Stripe Instance Creation',
            status: stripeInstance ? 'PASS' : 'FAIL',
            data: {
              instance: !!stripeInstance,
            },
          });
        }
      }

      const setupIntentResponse = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/company-setup-payment-method`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'create_setup_intent' }),
        }
      );

      const setupIntentData = await setupIntentResponse.json();
      testResults.tests.push({
        name: 'Create Setup Intent',
        status: setupIntentResponse.ok ? 'PASS' : 'FAIL',
        data: {
          statusCode: setupIntentResponse.status,
          hasClientSecret: !!setupIntentData.clientSecret,
          error: setupIntentData.error,
          customerId: setupIntentData.customerId,
        },
      });

    } catch (error: any) {
      testResults.tests.push({
        name: 'Error',
        status: 'FAIL',
        data: {
          message: error.message,
          stack: error.stack,
        },
      });
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Stripe Diagnostics</Text>
        <Text style={styles.subtitle}>
          Check if Stripe is configured correctly
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={runTests}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Run Tests</Text>
        )}
      </TouchableOpacity>

      {results && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>Test Results</Text>
          <Text style={styles.timestamp}>{results.timestamp}</Text>

          {results.tests.map((test: any, index: number) => (
            <View key={index} style={styles.testCard}>
              <View style={styles.testHeader}>
                <Text style={styles.testName}>{test.name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    test.status === 'PASS' && styles.statusPass,
                    test.status === 'FAIL' && styles.statusFail,
                  ]}
                >
                  <Text style={styles.statusText}>{test.status}</Text>
                </View>
              </View>
              <Text style={styles.testData}>
                {JSON.stringify(test.data, null, 2)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 32,
    marginTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  results: {
    marginBottom: 32,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  testCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#64748B',
  },
  statusPass: {
    backgroundColor: '#10B981',
  },
  statusFail: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  testData: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  backButton: {
    padding: 16,
  },
  backButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

if (typeof window !== 'undefined' && !document.getElementById('stripe-js')) {
  const script = document.createElement('script');
  script.id = 'stripe-js';
  script.src = 'https://js.stripe.com/v3/';
  script.async = true;
  document.head.appendChild(script);
}

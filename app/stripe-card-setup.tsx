import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react-native';

export default function StripeCardSetupScreen() {
  const router = useRouter();
  const { clientSecret } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [stripe, setStripe] = useState<any>(null);
  const [cardElement, setCardElement] = useState<any>(null);

  useEffect(() => {
    if (!clientSecret) {
      Alert.alert('Error', 'No client secret provided');
      router.back();
      return;
    }

    if (Platform.OS !== 'web') {
      Alert.alert('Error', 'Card setup is only available on web');
      router.back();
      return;
    }

    loadStripe();
  }, [clientSecret]);

  const loadStripe = async () => {
    if (typeof window === 'undefined') return;

    try {
      console.log('Starting Stripe loading process...');

      let attempts = 0;
      while (!(window as any).Stripe && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!(window as any).Stripe) {
        throw new Error('Stripe.js failed to load. Please check your internet connection.');
      }

      console.log('Stripe.js loaded successfully');

      const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      console.log('Publishable key:', publishableKey ? `${publishableKey.substring(0, 20)}...` : 'MISSING');

      if (!publishableKey || publishableKey === 'pk_test_your_key_here') {
        throw new Error('Stripe publishable key not configured');
      }

      if (!publishableKey.startsWith('pk_test_') && !publishableKey.startsWith('pk_live_')) {
        throw new Error('Invalid Stripe publishable key format');
      }

      console.log('Creating Stripe instance...');
      const stripeInstance = (window as any).Stripe(publishableKey);

      if (!stripeInstance) {
        throw new Error('Failed to initialize Stripe. Please check your Stripe key.');
      }

      setStripe(stripeInstance);
      console.log('Stripe instance created');

      console.log('Creating card elements...');
      const elements = stripeInstance.elements();
      const card = elements.create('card', {
        style: {
          base: {
            color: '#FFFFFF',
            fontSize: '16px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            '::placeholder': {
              color: '#94A3B8',
            },
            iconColor: '#94A3B8',
          },
          invalid: {
            color: '#EF4444',
            iconColor: '#EF4444',
          },
        },
      });

      console.log('Card element created');

      await new Promise(resolve => setTimeout(resolve, 100));

      const container = document.getElementById('stripe-card-element');
      console.log('Container found:', !!container);

      if (container) {
        console.log('Mounting card element...');
        card.mount('#stripe-card-element');
        setCardElement(card);

        card.on('change', (event: any) => {
          console.log('Card change event:', event);
          if (event.error) {
            setError(event.error.message);
          } else {
            setError('');
          }
        });

        card.on('ready', () => {
          console.log('Card element ready event fired!');
          setLoading(false);
        });

        // Force loading to false after 2 seconds if ready event doesn't fire
        setTimeout(() => {
          console.log('Forcing loading to false after timeout');
          setLoading(false);
        }, 2000);
      } else {
        throw new Error('Card container not found');
      }
    } catch (err: any) {
      console.error('Error loading Stripe:', err);
      Alert.alert(
        'Stripe Configuration Error',
        err.message || 'Failed to load payment form. Please verify your Stripe keys are correct in the dashboard.',
        [
          { text: 'Check Console', onPress: () => console.log('Open browser console for details') },
          { text: 'Go Back', onPress: () => router.back() }
        ]
      );
    }
  };

  const handleSubmit = async () => {
    if (!stripe || !cardElement) {
      setError('Payment form not ready');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret as string,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error('Session expired');
      }

      const confirmResponse = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/company-setup-payment-method`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'confirm_payment_method',
            setupIntentId: setupIntent.id,
          }),
        }
      );

      const confirmData = await confirmResponse.json();
      if (!confirmResponse.ok) throw new Error(confirmData.error);

      Alert.alert('Success', 'Card added successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error('Error submitting card:', err);
      setError(err.message || 'Failed to add card');
    } finally {
      setProcessing(false);
    }
  };

  if (Platform.OS !== 'web') {
    return null;
  }

  console.log('=== RENDERING STRIPE CARD SETUP PAGE ===');
  console.log('Client Secret:', clientSecret ? 'Present' : 'Missing');
  console.log('Loading:', loading);
  console.log('Stripe:', !!stripe);
  console.log('Card Element:', !!cardElement);

  return (
    <View style={styles.container}>
      <View style={{backgroundColor: '#10B981', padding: 20}}>
        <Text style={{color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center'}}>
          CARD SETUP PAGE IS RENDERING
        </Text>
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>Add Payment Card</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Enter your card details to securely store your payment method with Stripe.
        </Text>

        <View style={styles.cardContainer}>
          {typeof window !== 'undefined' && (
            <div
              id="stripe-card-element"
              style={{
                padding: '16px',
                backgroundColor: '#1E293B',
                borderRadius: '8px',
                border: '1px solid #334155',
                minHeight: '44px',
              }}
            />
          )}

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading payment form...</Text>
            </View>
          )}
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <View style={styles.securityNotice}>
          <Text style={styles.securityText}>
            🔒 Your payment information is securely processed by Stripe. We never store your card details.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (loading || processing || !stripe || !cardElement) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={loading || processing || !stripe || !cardElement}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Add Card</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 24,
    lineHeight: 20,
  },
  cardContainer: {
    marginBottom: 20,
    position: 'relative',
    minHeight: 80,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 16,
  },
  securityNotice: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  securityText: {
    fontSize: 13,
    color: '#60A5FA',
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

if (typeof window !== 'undefined' && !document.getElementById('stripe-js')) {
  const script = document.createElement('script');
  script.id = 'stripe-js';
  script.src = 'https://js.stripe.com/v3/';
  script.async = true;
  document.head.appendChild(script);
}

import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, CreditCard, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export default function StripeCardSetupScreen() {
  const { clientSecret } = useLocalSearchParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && clientSecret) {
      loadStripe();
    }
  }, [clientSecret]);

  const loadStripe = async () => {
    try {
      // Load Stripe.js dynamically
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;

      script.onload = () => {
        const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!stripeKey) {
          setError('Stripe is not configured');
          return;
        }

        // @ts-ignore - Stripe is loaded from CDN
        const stripeInstance = window.Stripe(stripeKey);
        setStripe(stripeInstance);

        // Create Elements
        const elementsInstance = stripeInstance.elements({
          clientSecret: clientSecret as string,
        });

        const paymentElement = elementsInstance.create('payment', {
          layout: 'tabs',
        });

        // Mount to DOM
        setTimeout(() => {
          const container = document.getElementById('payment-element');
          if (container) {
            paymentElement.mount('#payment-element');
          }
        }, 100);

        setElements(elementsInstance);
      };

      script.onerror = () => {
        setError('Failed to load Stripe');
      };

      document.head.appendChild(script);
    } catch (err: any) {
      console.error('Error loading Stripe:', err);
      setError(err.message);
    }
  };

  const handleAddCard = async () => {
    if (!stripe || !elements) {
      setError('Stripe not loaded');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: submitError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payout-settings',
        },
        redirect: 'if_required',
      });

      if (submitError) {
        setError(submitError.message);
        return;
      }

      // Get the setup intent to retrieve payment method
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) throw new Error('No session');

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/company-setup-payment-method`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'verify_setup',
            clientSecret: clientSecret as string
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (data.paymentMethodId) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            stripe_payment_method_id: data.paymentMethodId,
            payment_method: 'stripe'
          })
          .eq('id', profile?.id);

        if (updateError) throw updateError;

        alert('Payment card added successfully!');
        router.back();
      }
    } catch (err: any) {
      console.error('Error adding card:', err);
      setError(err.message || 'Failed to add card');
    } finally {
      setLoading(false);
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Payment Card</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <CreditCard size={48} color="#60A5FA" />
          </View>

          <Text style={styles.description}>
            Credit card setup requires native app
          </Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Please use this feature in a mobile build of the app.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Payment Card</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={24} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <CreditCard size={48} color="#60A5FA" />
        </View>

        <Text style={styles.description}>
          Enter your card details to enable automatic commission payments
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.cardFieldContainer}>
          <div id="payment-element" style={{
            minHeight: 200,
            padding: 16,
            backgroundColor: '#1E293B',
            borderRadius: 8,
          }} />
        </View>

        <View style={styles.securityNote}>
          <Text style={styles.securityText}>
            Your card information is encrypted and securely processed by Stripe. We never store your full card details.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addButton, loading && styles.addButtonDisabled]}
          onPress={handleAddCard}
          disabled={loading || !stripe || !elements}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.addButtonText}>Add Card</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
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
    justifyContent: 'center',
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  description: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 24,
    lineHeight: 22,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  cardFieldContainer: {
    width: '100%',
    marginBottom: 16,
  },
  securityNote: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  securityText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cancelButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  infoText: {
    fontSize: 14,
    color: '#93C5FD',
    lineHeight: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
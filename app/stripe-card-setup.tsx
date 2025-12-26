import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react-native';
import { CardField, useStripe, StripeProvider } from '@stripe/stripe-react-native';

function CardSetupContent() {
  const router = useRouter();
  const { clientSecret } = useLocalSearchParams();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const { confirmSetupIntent } = useStripe();
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = async () => {
    if (!clientSecret || typeof clientSecret !== 'string') {
      setError('Invalid setup intent');
      return;
    }

    if (!cardComplete) {
      setError('Please enter complete card details');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const { error: confirmError, setupIntent } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
      });

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Payment Card</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Enter your card details to securely store your payment method for B2B commission payments.
        </Text>

        <View style={styles.cardContainer}>
          <Text style={styles.cardLabel}>Card Information</Text>
          <CardField
            postalCodeEnabled={true}
            placeholders={{
              number: '4242 4242 4242 4242',
            }}
            cardStyle={styles.cardField}
            style={styles.cardFieldContainer}
            onCardChange={(cardDetails) => {
              setCardComplete(cardDetails.complete);
              if (cardDetails.validNumber === 'Invalid') {
                setError('Invalid card number');
              } else {
                setError('');
              }
            }}
          />
          <Text style={styles.cardHint}>
            Enter your card number, expiration date, CVC, and postal code
          </Text>
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <View style={styles.securityNotice}>
          <Text style={styles.securityText}>
            Your payment information is securely processed by Stripe. We never store your card details.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (processing || !cardComplete) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={processing || !cardComplete}
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

export default function StripeCardSetupScreen() {
  const { clientSecret } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!clientSecret) {
      Alert.alert('Error', 'No client secret provided');
      router.back();
      return;
    }
  }, [clientSecret]);

  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey || publishableKey === 'pk_test_your_key_here') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorText}>
            Stripe publishable key not configured. Please add your Stripe key to the environment variables.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <StripeProvider publishableKey={publishableKey}>
      <CardSetupContent />
    </StripeProvider>
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
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#F1F5F9',
  },
  cardFieldContainer: {
    height: 50,
    marginBottom: 8,
  },
  cardField: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    textColor: '#1E293B',
    fontSize: 16,
    placeholderColor: '#64748B',
  },
  cardHint: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
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
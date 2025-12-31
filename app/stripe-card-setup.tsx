import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, CreditCard, AlertCircle } from 'lucide-react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export default function StripeCardSetupScreen() {
  const { clientSecret } = useLocalSearchParams();
  const router = useRouter();
  const { confirmSetupIntent } = useStripe();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddCard = async () => {
    if (!clientSecret || !cardComplete) {
      setError('Please enter valid card details');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { setupIntent, error: confirmError } = await confirmSetupIntent(
        clientSecret as string,
        {
          paymentMethodType: 'Card',
        }
      );

      if (confirmError) {
        setError(confirmError.message);
        return;
      }

      if (setupIntent?.status === 'Succeeded' && setupIntent.paymentMethodId) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            stripe_payment_method_id: setupIntent.paymentMethodId,
            payment_method: 'stripe'
          })
          .eq('id', profile?.id);

        if (updateError) {
          throw updateError;
        }

        const message = 'Payment card added successfully!';
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert('Success', message);
        }

        router.back();
      }
    } catch (err: any) {
      console.error('Error adding card:', err);
      setError(err.message || 'Failed to add card');
    } finally {
      setLoading(false);
    }
  };

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
          <CardField
            postalCodeEnabled={true}
            placeholders={{
              number: '4242 4242 4242 4242',
            }}
            cardStyle={{
              backgroundColor: '#1E293B',
              textColor: '#FFFFFF',
              placeholderColor: '#64748B',
              borderRadius: 8,
            }}
            style={styles.cardField}
            onCardChange={(cardDetails) => {
              setCardComplete(cardDetails.complete);
              if (cardDetails.complete) {
                setError(null);
              }
            }}
          />
        </View>

        <View style={styles.securityNote}>
          <Text style={styles.securityText}>
            Your card information is encrypted and securely processed by Stripe. We never store your full card details.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addButton, (!cardComplete || loading) && styles.addButtonDisabled]}
          onPress={handleAddCard}
          disabled={!cardComplete || loading}
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
  cardField: {
    width: '100%',
    height: 50,
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
});
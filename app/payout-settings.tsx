import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Pressable, Platform } from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, CreditCard, FileText } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import W9Form from '@/components/W9Form';

const PAYMENT_METHODS = [
  { value: 'venmo', label: 'Venmo', placeholder: 'Enter your Venmo username, phone, or email' },
  { value: 'paypal', label: 'PayPal', placeholder: 'Enter your PayPal email' },
  { value: 'bank_transfer', label: 'Bank Transfer', placeholder: 'Enter your account details' },
  { value: 'wise', label: 'Wise', placeholder: 'Enter your Wise email' },
  { value: 'other', label: 'Other', placeholder: 'Enter your payment details' },
];

export default function PayoutSettingsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [w9Completed, setW9Completed] = useState(false);
  const [showW9Form, setShowW9Form] = useState(false);

  useEffect(() => {
    if (profile?.user_type === 'affiliate') {
      loadPreferences();
    } else if (profile?.user_type === 'company') {
      setLoading(false);
    }
  }, [profile]);


  const loadPreferences = async () => {
    try {
      setPaymentMethod(profile?.payment_method || '');
      const details = profile?.payment_details as any;
      setPaymentDetails(details?.account || '');
      setW9Completed(profile?.w9_completed || false);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleW9Complete = async () => {
    setW9Completed(true);
    setShowW9Form(false);
    await loadPreferences();
  };

  const handleSave = async () => {
    if (!profile) {
      Alert.alert('Error', 'User profile not found');
      return;
    }

    if (!paymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    if (!paymentDetails.trim()) {
      Alert.alert('Error', 'Please enter your payment details');
      return;
    }

    setSaving(true);

    try {
      const updateData: any = {
        payment_method: paymentMethod,
        payment_details: { account: paymentDetails.trim() },
      };

      // If Venmo is selected, also store in venmo_username field for easy access
      if (paymentMethod === 'venmo') {
        updateData.venmo_username = paymentDetails.trim();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id);

      if (error) throw error;

      Alert.alert('Success', 'Payment settings saved successfully!');
      router.back();
    } catch (error: any) {
      console.error('Error saving payment settings:', error);
      Alert.alert('Error', error.message || 'Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCard = async () => {
    console.log('=== handleAddCard called ===');
    console.log('Platform:', Platform.OS);

    setCardLoading(true);
    console.log('Card loading set to true');

    try {
      console.log('Getting session...');
      const { data: session } = await supabase.auth.getSession();
      console.log('Session:', session?.session?.user?.email);

      if (!session?.session) {
        console.error('No session found');
        throw new Error('No session');
      }

      const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/company-setup-payment-method`;
      console.log('Fetching from:', url);
      console.log('Request body:', JSON.stringify({ action: 'create_setup_intent' }));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'create_setup_intent' }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error('Response not OK:', data.error);
        throw new Error(data.error);
      }

      if (!data.clientSecret) {
        console.error('No clientSecret in response');
        throw new Error('No client secret returned');
      }

      const navigationUrl = `/stripe-card-setup?clientSecret=${data.clientSecret}`;
      console.log('Navigating to:', navigationUrl);
      router.push(navigationUrl);
      console.log('Navigation complete');
    } catch (error: any) {
      console.error('=== Error in handleAddCard ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      Alert.alert(
        'Card Setup Error',
        `${error.message}\n\nCheck the browser console for details.`,
        [
          { text: 'Open Console', onPress: () => console.log('=== Check console for errors ===') },
          { text: 'OK' }
        ]
      );
    } finally {
      console.log('Setting card loading to false');
      setCardLoading(false);
    }
  };


  const handleRemoveCard = () => {
    Alert.alert(
      'Remove Card',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
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
                  body: JSON.stringify({ action: 'remove_payment_method' }),
                }
              );

              const data = await response.json();
              if (!response.ok) throw new Error(data.error);

              Alert.alert('Success', 'Card removed successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (profile?.user_type === 'company') {
    console.log('Rendering company payment method screen');
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <CreditCard size={32} color="#60A5FA" />
          </View>
          <Text style={styles.title}>Payment Method</Text>
          <Text style={styles.subtitle}>
            Add a credit or debit card to pay affiliate commissions
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card Information</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Your payment card will be securely stored and used to automatically pay affiliate commissions when you approve them.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.addCardButton,
              pressed && styles.addCardButtonPressed,
              cardLoading && { opacity: 0.6 }
            ]}
            onPress={handleAddCard}
            disabled={cardLoading}
          >
            {cardLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <CreditCard size={20} color="#fff" />
            )}
            <Text style={styles.addCardButtonText}>
              {cardLoading ? 'Loading...' : profile.stripe_payment_method_id ? 'Update Card' : 'Add Credit/Debit Card'}
            </Text>
          </Pressable>

          {profile.stripe_payment_method_id && (
            <View style={styles.currentCardCard}>
              <Text style={styles.currentCardTitle}>Current Card</Text>
              <View style={styles.currentCardRow}>
                <CreditCard size={20} color="#60A5FA" />
                <Text style={styles.currentCardText}>Card ending in ****</Text>
              </View>
              <TouchableOpacity
                style={styles.removeCardButton}
                onPress={handleRemoveCard}
              >
                <Text style={styles.removeCardText}>Remove Card</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoListItem}>1. Add your credit or debit card securely via Stripe</Text>
            <Text style={styles.infoListItem}>2. When you approve commissions, your card is charged</Text>
            <Text style={styles.infoListItem}>3. Funds are transferred directly to affiliate accounts</Text>
            <Text style={styles.infoListItem}>4. Platform fee is automatically calculated</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const selectedMethod = PAYMENT_METHODS.find(m => m.value === paymentMethod);

  if (showW9Form) {
    return <W9Form onComplete={handleW9Complete} userId={profile?.id || ''} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <DollarSign size={32} color="#60A5FA" />
        </View>
        <Text style={styles.title}>Payment Settings</Text>
        <Text style={styles.subtitle}>
          Configure how you want to receive your commission payouts
        </Text>
      </View>

      {!w9Completed && (
        <View style={styles.w9RequiredCard}>
          <View style={styles.w9RequiredHeader}>
            <FileText size={24} color="#F59E0B" />
            <Text style={styles.w9RequiredTitle}>W-9 Tax Information Required</Text>
          </View>
          <Text style={styles.w9RequiredText}>
            IRS regulations require W-9 tax information before processing commission payments of $600 or more per year. Complete your W-9 to unlock payment settings.
          </Text>
          <TouchableOpacity
            style={styles.completeW9Button}
            onPress={() => setShowW9Form(true)}
          >
            <Text style={styles.completeW9ButtonText}>Complete W-9 Form</Text>
          </TouchableOpacity>
        </View>
      )}

      {w9Completed && (
        <View style={styles.w9CompletedCard}>
          <FileText size={20} color="#10B981" />
          <View style={styles.w9CompletedContent}>
            <Text style={styles.w9CompletedTitle}>W-9 Verified</Text>
            <Text style={styles.w9CompletedText}>
              Your tax information is on file
            </Text>
          </View>
        </View>
      )}

      {w9Completed && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <Text style={styles.sectionDescription}>
            Select how you'd like to receive your earnings. Your information is securely stored and only visible to platform administrators when processing payouts.
          </Text>

          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.value}
              style={[
                styles.paymentMethodOption,
                paymentMethod === method.value && styles.paymentMethodOptionSelected
              ]}
              onPress={() => setPaymentMethod(method.value)}
            >
              <View style={styles.paymentMethodContent}>
                <View style={[
                  styles.radioOuter,
                  paymentMethod === method.value && styles.radioOuterSelected
                ]}>
                  {paymentMethod === method.value && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={[
                  styles.paymentMethodLabel,
                  paymentMethod === method.value && styles.paymentMethodLabelSelected
                ]}>
                  {method.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {w9Completed && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <Text style={styles.sectionDescription}>
            {selectedMethod?.placeholder || 'Enter your payment information'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder={selectedMethod?.placeholder || 'Enter your payment details'}
            placeholderTextColor="#64748B"
            value={paymentDetails}
            onChangeText={setPaymentDetails}
            autoCapitalize="none"
            editable={!!paymentMethod}
          />

          {paymentMethod === 'venmo' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                Enter your Venmo username (e.g., @john-doe), phone number, or email address. Make sure it's the account you want to receive payments to.
              </Text>
            </View>
          )}

          {paymentMethod === 'paypal' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                Enter the email address associated with your PayPal account.
              </Text>
            </View>
          )}
        </View>
      )}

      {w9Completed && (
        <TouchableOpacity
          style={[styles.saveButton, (saving || !paymentMethod || !paymentDetails.trim()) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || !paymentMethod || !paymentDetails.trim()}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Payment Settings</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelButtonText}>{w9Completed ? 'Cancel' : 'Back'}</Text>
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 16,
  },
  paymentMethodOption: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  paymentMethodOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: '#3B82F6',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  paymentMethodLabelSelected: {
    color: '#F1F5F9',
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#334155',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#93C5FD',
    lineHeight: 20,
  },
  infoListItem: {
    fontSize: 14,
    color: '#CBD5E1',
    marginBottom: 8,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  cancelButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  addCardButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  addCardButtonPressed: {
    opacity: 0.8,
  },
  addCardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  currentCardCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  currentCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
  },
  currentCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  currentCardText: {
    fontSize: 15,
    color: '#F1F5F9',
    fontWeight: '500',
  },
  removeCardButton: {
    padding: 8,
  },
  removeCardText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  w9RequiredCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  w9RequiredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  w9RequiredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FCD34D',
  },
  w9RequiredText: {
    fontSize: 14,
    color: '#FCD34D',
    lineHeight: 20,
    marginBottom: 16,
  },
  completeW9Button: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  completeW9ButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  w9CompletedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  w9CompletedContent: {
    flex: 1,
  },
  w9CompletedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34D399',
    marginBottom: 4,
  },
  w9CompletedText: {
    fontSize: 13,
    color: '#6EE7B7',
  },
});

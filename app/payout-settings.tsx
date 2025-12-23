import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Switch, Modal, Platform } from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, DollarSign, Calendar, Bell, X, ChevronDown, CreditCard } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PAYOUT_FREQUENCIES, PAYOUT_METHODS, MINIMUM_PAYOUT_THRESHOLDS, formatCurrency, calculateStripeFee } from '@/lib/stripeConfig';
import { CardField, useStripe } from '@stripe/stripe-react-native';

type PayoutPreferences = {
  id: string;
  affiliate_id: string;
  payout_frequency: string;
  payout_frequency_days: number;
  minimum_payout_threshold: number;
  preferred_payout_method: string;
  auto_payout_enabled: boolean;
  notification_preferences: any;
};

export default function PayoutSettingsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const stripe = Platform.OS !== 'web' ? useStripe() : null;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<PayoutPreferences | null>(null);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [addingCard, setAddingCard] = useState(false);

  const [formData, setFormData] = useState({
    payout_frequency: 'monthly',
    payout_frequency_days: 30,
    minimum_payout_threshold: 50,
    preferred_payout_method: 'ach_standard',
    auto_payout_enabled: true,
    notification_preferences: {
      payout_scheduled: true,
      payout_completed: true,
      payout_failed: true,
    },
  });

  useEffect(() => {
    if (profile?.user_type === 'affiliate') {
      loadPreferences();
    } else if (profile?.user_type === 'company') {
      setLoading(false);
    }
  }, [profile]);

  const loadPreferences = async () => {
    try {
      const { data } = await supabase
        .from('payout_preferences')
        .select('*')
        .eq('affiliate_id', profile?.id)
        .maybeSingle();

      if (data) {
        setPreferences(data);
        setFormData({
          payout_frequency: data.payout_frequency,
          payout_frequency_days: data.payout_frequency_days,
          minimum_payout_threshold: data.minimum_payout_threshold,
          preferred_payout_method: data.preferred_payout_method,
          auto_payout_enabled: data.auto_payout_enabled,
          notification_preferences: data.notification_preferences || formData.notification_preferences,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.stripe_connect_account_id || profile?.stripe_account_status !== 'verified') {
      Alert.alert(
        'Setup Required',
        'Please complete Stripe Connect onboarding before configuring payout settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Setup Now', onPress: () => router.push('/stripe-onboarding') },
        ]
      );
      return;
    }

    setSaving(true);

    try {
      if (preferences) {
        const { error } = await supabase
          .from('payout_preferences')
          .update(formData)
          .eq('affiliate_id', profile.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payout_preferences')
          .insert({
            affiliate_id: profile.id,
            ...formData,
          });

        if (error) throw error;
      }

      Alert.alert('Success', 'Payout settings saved successfully!');
      router.back();
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save payout settings');
    } finally {
      setSaving(false);
    }
  };

  const getFrequencyLabel = () => {
    const freq = PAYOUT_FREQUENCIES.find(f => f.value === formData.payout_frequency);
    if (formData.payout_frequency === 'custom') {
      return `Every ${formData.payout_frequency_days} days`;
    }
    return freq?.label || 'Monthly';
  };

  const getMethodLabel = () => {
    const method = PAYOUT_METHODS.find(m => m.value === formData.preferred_payout_method);
    return method?.label || 'Bank Transfer';
  };

  const handleAddCard = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Card management is only available on native platforms. Please use the mobile app.');
      return;
    }

    if (!cardComplete) {
      Alert.alert('Error', 'Please complete card details');
      return;
    }

    if (!stripe?.confirmSetupIntent) {
      Alert.alert('Error', 'Stripe not initialized');
      return;
    }

    setAddingCard(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) throw new Error('No session');

      const setupResponse = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/company-setup-payment-method`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'create_setup_intent' }),
        }
      );

      const setupData = await setupResponse.json();
      if (!setupResponse.ok) throw new Error(setupData.error);

      const { error: confirmError, setupIntent } = await stripe.confirmSetupIntent(
        setupData.clientSecret,
        {
          paymentMethodType: 'Card',
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
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

      Alert.alert('Success', 'Card added successfully!');
      setShowCardModal(false);
      router.back();
    } catch (error) {
      console.error('Error adding card:', error);
      Alert.alert('Error', error.message || 'Failed to add card');
    } finally {
      setAddingCard(false);
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
              router.back();
            } catch (error) {
              console.error('Error removing card:', error);
              Alert.alert('Error', 'Failed to remove card');
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

          <TouchableOpacity
            style={styles.addCardButton}
            onPress={() => {
              if (Platform.OS === 'web') {
                Alert.alert('Not Available', 'Card management is only available on native platforms. Please use the mobile app.');
              } else {
                setShowCardModal(true);
              }
            }}
          >
            <CreditCard size={20} color="#fff" />
            <Text style={styles.addCardButtonText}>
              {profile.stripe_payment_method_id ? 'Update Card' : 'Add Credit/Debit Card'}
            </Text>
          </TouchableOpacity>

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

        <Modal visible={showCardModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Payment Card</Text>
                <TouchableOpacity onPress={() => setShowCardModal(false)}>
                  <X size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              <View style={styles.cardModalBody}>
                <Text style={styles.cardModalDescription}>
                  Enter your card details to pay affiliate commissions
                </Text>
                {Platform.OS !== 'web' ? (
                  <CardField
                    postalCodeEnabled={true}
                    placeholder={{
                      number: '4242 4242 4242 4242',
                    }}
                    cardStyle={{
                      backgroundColor: '#0F172A',
                      textColor: '#FFFFFF',
                      placeholderColor: '#64748B',
                      borderWidth: 1,
                      borderColor: '#334155',
                      borderRadius: 8,
                    }}
                    style={styles.cardField}
                    onCardChange={(cardDetails) => {
                      setCardComplete(cardDetails.complete);
                    }}
                  />
                ) : (
                  <View style={styles.webNotice}>
                    <Text style={styles.webNoticeText}>
                      Card input is only available on mobile platforms
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[
                    styles.addCardModalButton,
                    (!cardComplete || addingCard) && styles.addCardModalButtonDisabled,
                  ]}
                  onPress={handleAddCard}
                  disabled={!cardComplete || addingCard}
                >
                  <Text style={styles.addCardModalButtonText}>
                    {addingCard ? 'Adding Card...' : 'Add Card'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.securityNote}>
                  Secured by Stripe. Your card details are encrypted and never stored on our servers.
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Settings size={32} color="#60A5FA" />
        </View>
        <Text style={styles.title}>Payout Settings</Text>
        <Text style={styles.subtitle}>
          Configure how and when you receive your earnings
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payout Schedule</Text>

        <TouchableOpacity
          style={styles.settingCard}
          onPress={() => setShowFrequencyModal(true)}
        >
          <View style={styles.settingLeft}>
            <View style={styles.settingIcon}>
              <Calendar size={20} color="#60A5FA" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Frequency</Text>
              <Text style={styles.settingValue}>{getFrequencyLabel()}</Text>
            </View>
          </View>
          <ChevronDown size={20} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingCard}
          onPress={() => setShowThresholdModal(true)}
        >
          <View style={styles.settingLeft}>
            <View style={styles.settingIcon}>
              <DollarSign size={20} color="#10B981" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Minimum Threshold</Text>
              <Text style={styles.settingValue}>
                {formatCurrency(formData.minimum_payout_threshold)}
              </Text>
            </View>
          </View>
          <ChevronDown size={20} color="#94A3B8" />
        </TouchableOpacity>

        <View style={styles.settingCard}>
          <View style={styles.settingLeft}>
            <View style={styles.settingIcon}>
              <Bell size={20} color="#F59E0B" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Automatic Payouts</Text>
              <Text style={styles.settingDescription}>
                Process payouts automatically when threshold is met
              </Text>
            </View>
          </View>
          <Switch
            value={formData.auto_payout_enabled}
            onValueChange={(value) =>
              setFormData({ ...formData, auto_payout_enabled: value })
            }
            trackColor={{ false: '#334155', true: '#3B82F680' }}
            thumbColor={formData.auto_payout_enabled ? '#3B82F6' : '#94A3B8'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payout Method</Text>

        <TouchableOpacity
          style={styles.settingCard}
          onPress={() => setShowMethodModal(true)}
        >
          <View style={styles.settingLeft}>
            <View style={styles.settingIcon}>
              <CreditCard size={20} color="#8B5CF6" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Payment Method</Text>
              <Text style={styles.settingValue}>{getMethodLabel()}</Text>
              <Text style={styles.settingDescription}>
                {PAYOUT_METHODS.find(m => m.value === formData.preferred_payout_method)?.description}
              </Text>
            </View>
          </View>
          <ChevronDown size={20} color="#94A3B8" />
        </TouchableOpacity>

        <View style={styles.feeCard}>
          <Text style={styles.feeTitle}>Fee Example</Text>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>$100.00 payout</Text>
            <Text style={styles.feeValue}>
              {formatCurrency(calculateStripeFee(100, formData.preferred_payout_method))} fee
            </Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>You receive</Text>
            <Text style={styles.feeValueBold}>
              {formatCurrency(100 - calculateStripeFee(100, formData.preferred_payout_method))}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingLeft}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Payout Scheduled</Text>
              <Text style={styles.settingDescription}>
                Notify when a payout is scheduled
              </Text>
            </View>
          </View>
          <Switch
            value={formData.notification_preferences.payout_scheduled}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                notification_preferences: {
                  ...formData.notification_preferences,
                  payout_scheduled: value,
                },
              })
            }
            trackColor={{ false: '#334155', true: '#3B82F680' }}
            thumbColor={formData.notification_preferences.payout_scheduled ? '#3B82F6' : '#94A3B8'}
          />
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingLeft}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Payout Completed</Text>
              <Text style={styles.settingDescription}>
                Notify when money arrives in your account
              </Text>
            </View>
          </View>
          <Switch
            value={formData.notification_preferences.payout_completed}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                notification_preferences: {
                  ...formData.notification_preferences,
                  payout_completed: value,
                },
              })
            }
            trackColor={{ false: '#334155', true: '#3B82F680' }}
            thumbColor={formData.notification_preferences.payout_completed ? '#3B82F6' : '#94A3B8'}
          />
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingLeft}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Payout Failed</Text>
              <Text style={styles.settingDescription}>
                Notify if a payout fails
              </Text>
            </View>
          </View>
          <Switch
            value={formData.notification_preferences.payout_failed}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                notification_preferences: {
                  ...formData.notification_preferences,
                  payout_failed: value,
                },
              })
            }
            trackColor={{ false: '#334155', true: '#3B82F680' }}
            thumbColor={formData.notification_preferences.payout_failed ? '#3B82F6' : '#94A3B8'}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      <Modal visible={showFrequencyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payout Frequency</Text>
              <TouchableOpacity onPress={() => setShowFrequencyModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {PAYOUT_FREQUENCIES.map((freq) => (
                <TouchableOpacity
                  key={freq.value}
                  style={[
                    styles.modalOption,
                    formData.payout_frequency === freq.value && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setFormData({
                      ...formData,
                      payout_frequency: freq.value,
                      payout_frequency_days: freq.days,
                    });
                    setShowFrequencyModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      formData.payout_frequency === freq.value && styles.modalOptionTextSelected,
                    ]}
                  >
                    {freq.label}
                  </Text>
                  <Text style={styles.modalOptionDescription}>{freq.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showMethodModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Method</Text>
              <TouchableOpacity onPress={() => setShowMethodModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {PAYOUT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    styles.modalOption,
                    formData.preferred_payout_method === method.value && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setFormData({
                      ...formData,
                      preferred_payout_method: method.value,
                    });
                    setShowMethodModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      formData.preferred_payout_method === method.value && styles.modalOptionTextSelected,
                    ]}
                  >
                    {method.label}
                  </Text>
                  <Text style={styles.modalOptionDescription}>{method.description}</Text>
                  <Text style={styles.modalOptionFee}>{method.feeDescription}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showThresholdModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Minimum Threshold</Text>
              <TouchableOpacity onPress={() => setShowThresholdModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {MINIMUM_PAYOUT_THRESHOLDS.map((threshold) => (
                <TouchableOpacity
                  key={threshold.value}
                  style={[
                    styles.modalOption,
                    formData.minimum_payout_threshold === threshold.value && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setFormData({
                      ...formData,
                      minimum_payout_threshold: threshold.value,
                    });
                    setShowThresholdModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      formData.minimum_payout_threshold === threshold.value && styles.modalOptionTextSelected,
                    ]}
                  >
                    {threshold.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  settingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  feeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  feeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  feeValue: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  feeValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  cancelButton: {
    padding: 18,
    marginBottom: 32,
  },
  cancelButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalList: {
    padding: 8,
  },
  modalOption: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalOptionTextSelected: {
    color: '#60A5FA',
    fontWeight: '600',
  },
  modalOptionDescription: {
    fontSize: 14,
    color: '#94A3B8',
  },
  modalOptionFee: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  infoListItem: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
    marginBottom: 8,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 18,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
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
    borderColor: '#10B981',
  },
  currentCardTitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  currentCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  currentCardText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  removeCardButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  removeCardText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  cardModalBody: {
    padding: 20,
  },
  cardModalDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 20,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginBottom: 20,
  },
  addCardModalButton: {
    backgroundColor: '#3B82F6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addCardModalButtonDisabled: {
    opacity: 0.6,
  },
  addCardModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  securityNote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  webNotice: {
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  webNoticeText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

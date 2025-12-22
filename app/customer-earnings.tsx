import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { DollarSign, TrendingUp, Clock, CheckCircle, Settings } from 'lucide-react-native';
import { router } from 'expo-router';

type CustomerData = {
  id: string;
  email: string;
  name: string;
  total_earned: number;
  total_paid: number;
  pending_balance: number;
  payout_minimum: number;
  preferred_payout_method: string;
  payout_email: string;
  stripe_account_id: string;
};

type PayoutRecord = {
  id: string;
  amount: number;
  status: string;
  payout_method: string;
  created_at: string;
  processed_at: string;
};

export default function CustomerEarnings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [payoutEmail, setPayoutEmail] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('manual');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCustomerData();
    }
  }, [user]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('email', user?.email)
        .maybeSingle();

      if (customerError) throw customerError;

      if (customer) {
        setCustomerData(customer);
        setPayoutEmail(customer.payout_email || user?.email || '');
        setPayoutMethod(customer.preferred_payout_method || 'manual');

        const { data: payoutsData, error: payoutsError } = await supabase
          .from('customer_payouts')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false });

        if (!payoutsError && payoutsData) {
          setPayouts(payoutsData);
        }
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      Alert.alert('Error', 'Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const savePayoutSettings = async () => {
    if (!customerData) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('customers')
        .update({
          payout_email: payoutEmail,
          preferred_payout_method: payoutMethod,
        })
        .eq('id', customerData.id);

      if (error) throw error;

      Alert.alert('Success', 'Payout settings saved successfully');
      setShowSettings(false);
      fetchCustomerData();
    } catch (error) {
      console.error('Error saving payout settings:', error);
      Alert.alert('Error', 'Failed to save payout settings');
    } finally {
      setSaving(false);
    }
  };

  const requestPayout = async () => {
    if (!customerData) return;

    if (customerData.pending_balance < customerData.payout_minimum) {
      Alert.alert(
        'Minimum Not Met',
        `You need at least $${customerData.payout_minimum} to request a payout. Current balance: $${customerData.pending_balance.toFixed(2)}`
      );
      return;
    }

    Alert.alert(
      'Request Payout',
      `Request a payout of $${customerData.pending_balance.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            try {
              const { error } = await supabase.from('customer_payouts').insert({
                customer_id: customerData.id,
                amount: customerData.pending_balance,
                status: 'pending',
                payout_method: customerData.preferred_payout_method,
              });

              if (error) throw error;

              Alert.alert('Success', 'Payout request submitted! You will be notified when it is processed.');
              fetchCustomerData();
            } catch (error) {
              console.error('Error requesting payout:', error);
              Alert.alert('Error', 'Failed to request payout');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#34C759';
      case 'processing':
        return '#FF9500';
      case 'failed':
        return '#FF3B30';
      default:
        return '#007AFF';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} color="#34C759" />;
      case 'processing':
        return <Clock size={20} color="#FF9500" />;
      default:
        return <Clock size={20} color="#007AFF" />;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading earnings...</Text>
      </View>
    );
  }

  if (!customerData) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <DollarSign size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No Earnings Yet</Text>
          <Text style={styles.emptyText}>
            Start referring friends to earn commissions!
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/customer-referrals')}
          >
            <Text style={styles.primaryButtonText}>Start Referring</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showSettings) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Payout Settings</Text>
          <Text style={styles.subtitle}>Configure how you receive your earnings</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Payout Email</Text>
          <TextInput
            style={styles.input}
            value={payoutEmail}
            onChangeText={setPayoutEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Payout Method</Text>
          <View style={styles.methodContainer}>
            <TouchableOpacity
              style={[
                styles.methodButton,
                payoutMethod === 'manual' && styles.methodButtonActive,
              ]}
              onPress={() => setPayoutMethod('manual')}
            >
              <Text
                style={[
                  styles.methodButtonText,
                  payoutMethod === 'manual' && styles.methodButtonTextActive,
                ]}
              >
                Manual Transfer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.methodButton,
                payoutMethod === 'stripe' && styles.methodButtonActive,
              ]}
              onPress={() => setPayoutMethod('stripe')}
            >
              <Text
                style={[
                  styles.methodButtonText,
                  payoutMethod === 'stripe' && styles.methodButtonTextActive,
                ]}
              >
                Stripe
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helperText}>
            Manual transfers are processed within 5-7 business days. Stripe transfers are
            processed within 2 business days.
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => setShowSettings(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={savePayoutSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Settings</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Earnings</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)}>
          <Settings size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.mainStat}>
          <Text style={styles.mainStatLabel}>Available Balance</Text>
          <Text style={styles.mainStatValue}>
            ${customerData.pending_balance.toFixed(2)}
          </Text>
          <TouchableOpacity
            style={[
              styles.payoutButton,
              customerData.pending_balance < customerData.payout_minimum &&
                styles.payoutButtonDisabled,
            ]}
            onPress={requestPayout}
            disabled={customerData.pending_balance < customerData.payout_minimum}
          >
            <Text style={styles.payoutButtonText}>Request Payout</Text>
          </TouchableOpacity>
          {customerData.pending_balance < customerData.payout_minimum && (
            <Text style={styles.minText}>
              Minimum: ${customerData.payout_minimum.toFixed(2)}
            </Text>
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <DollarSign size={24} color="#34C759" />
            <Text style={styles.statValue}>${customerData.total_earned.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={24} color="#007AFF" />
            <Text style={styles.statValue}>${customerData.total_paid.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Paid</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payout History</Text>
        {payouts.length === 0 ? (
          <View style={styles.emptyPayouts}>
            <Text style={styles.emptyPayoutsText}>No payouts yet</Text>
          </View>
        ) : (
          payouts.map((payout) => (
            <View key={payout.id} style={styles.payoutItem}>
              <View style={styles.payoutIcon}>{getStatusIcon(payout.status)}</View>
              <View style={styles.payoutDetails}>
                <Text style={styles.payoutAmount}>${payout.amount.toFixed(2)}</Text>
                <Text style={styles.payoutDate}>
                  {new Date(payout.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.payoutStatus}>
                <Text
                  style={[
                    styles.payoutStatusText,
                    { color: getStatusColor(payout.status) },
                  ]}
                >
                  {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    padding: 16,
  },
  mainStat: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainStatLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  mainStatValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 16,
  },
  payoutButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  payoutButtonDisabled: {
    backgroundColor: '#CCC',
  },
  payoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  minText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  emptyPayouts: {
    padding: 32,
    alignItems: 'center',
  },
  emptyPayoutsText: {
    fontSize: 16,
    color: '#999',
  },
  payoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  payoutIcon: {
    marginRight: 12,
  },
  payoutDetails: {
    flex: 1,
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  payoutDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  payoutStatus: {
    alignItems: 'flex-end',
  },
  payoutStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: '#000',
  },
  methodContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  methodButtonActive: {
    backgroundColor: '#007AFF',
  },
  methodButtonText: {
    fontSize: 16,
    color: '#666',
  },
  methodButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
});

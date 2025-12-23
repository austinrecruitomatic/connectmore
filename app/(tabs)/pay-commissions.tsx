import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  DollarSign,
  CreditCard,
  Check,
  AlertCircle,
  Clock,
  CheckCircle,
  ExternalLink,
} from 'lucide-react-native';

type Commission = {
  id: string;
  commission_amount: number;
  platform_fee_amount: number;
  status: string;
  company_payment_status: string;
  created_at: string;
  deals: {
    deal_value: number;
    contact_submissions: {
      name: string;
      email: string;
    } | null;
  };
  profiles: {
    full_name: string;
  };
};

type PaymentHistory = {
  id: string;
  total_amount: number;
  payment_status: string;
  number_of_commissions: number;
  paid_at: string;
  receipt_url: string | null;
  created_at: string;
};

export default function PayCommissionsScreen() {
  const { profile } = useAuth();
  const [pendingCommissions, setPendingCommissions] = useState<Commission[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [selectedCommissions, setSelectedCommissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [outstandingBalance, setOutstandingBalance] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (profile?.user_type !== 'company') return;

    setLoading(true);

    try {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, outstanding_commission_balance')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!companyData) return;

      setCompanyId(companyData.id);
      setOutstandingBalance(parseFloat(companyData.outstanding_commission_balance || '0'));

      const { data: commissionsData } = await supabase
        .from('commissions')
        .select(`
          id,
          commission_amount,
          platform_fee_amount,
          status,
          company_payment_status,
          created_at,
          deals (
            deal_value,
            contact_submissions (
              name,
              email
            )
          ),
          profiles (
            full_name
          )
        `)
        .eq('status', 'approved')
        .eq('company_payment_status', 'pending')
        .in('deal_id',
          supabase
            .from('deals')
            .select('id')
            .in('partnership_id',
              supabase
                .from('affiliate_partnerships')
                .select('id')
                .in('product_id',
                  supabase
                    .from('products')
                    .select('id')
                    .eq('company_id', companyData.id)
                )
            )
        )
        .order('created_at', { ascending: false });

      const { data: historyData } = await supabase
        .from('company_commission_payments')
        .select('*')
        .eq('company_id', companyData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setPendingCommissions(commissionsData || []);
      setPaymentHistory(historyData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCommission = (id: string) => {
    const newSelected = new Set(selectedCommissions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCommissions(newSelected);
  };

  const selectAll = () => {
    if (selectedCommissions.size === pendingCommissions.length) {
      setSelectedCommissions(new Set());
    } else {
      setSelectedCommissions(new Set(pendingCommissions.map((c) => c.id)));
    }
  };

  const calculateTotal = () => {
    return pendingCommissions
      .filter((c) => selectedCommissions.has(c.id))
      .reduce(
        (sum, c) =>
          sum + parseFloat(c.commission_amount) + parseFloat(c.platform_fee_amount),
        0
      );
  };

  const handlePayCommissions = async () => {
    if (selectedCommissions.size === 0) {
      Alert.alert('Error', 'Please select at least one commission to pay');
      return;
    }

    const totalAmount = calculateTotal();

    Alert.alert(
      'Confirm Payment',
      `You are about to pay $${totalAmount.toFixed(2)} for ${selectedCommissions.size} commission(s). This will redirect you to Stripe to complete the payment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue to Payment',
          onPress: () => processPayment(),
        },
      ]
    );
  };

  const processPayment = async () => {
    setProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'You must be logged in to make a payment');
        return;
      }

      const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/company-pay-commissions`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          commission_ids: Array.from(selectedCommissions),
          success_url: `${process.env.EXPO_PUBLIC_APP_URL || 'exp://'}?payment=success`,
          cancel_url: `${process.env.EXPO_PUBLIC_APP_URL || 'exp://'}?payment=cancelled`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment');
      }

      if (data.session_url) {
        await Linking.openURL(data.session_url);
        setSelectedCommissions(new Set());
      } else {
        Alert.alert('Success', 'Payment processed successfully');
        loadData();
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const totalSelected = calculateTotal();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Pay Commissions</Text>
        <Text style={styles.subtitle}>
          Manage and pay commissions owed to the platform
        </Text>
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <DollarSign size={32} color="#ef4444" />
          <Text style={styles.balanceLabel}>Outstanding Balance</Text>
        </View>
        <Text style={styles.balanceAmount}>${outstandingBalance.toFixed(2)}</Text>
        <Text style={styles.balanceSubtext}>
          {pendingCommissions.length} pending commission{pendingCommissions.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {pendingCommissions.length > 0 && (
        <>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Commissions</Text>
              <TouchableOpacity onPress={selectAll}>
                <Text style={styles.selectAllText}>
                  {selectedCommissions.size === pendingCommissions.length
                    ? 'Deselect All'
                    : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>

            {pendingCommissions.map((commission) => {
              const isSelected = selectedCommissions.has(commission.id);
              const total =
                parseFloat(commission.commission_amount) +
                parseFloat(commission.platform_fee_amount);

              return (
                <TouchableOpacity
                  key={commission.id}
                  style={[styles.commissionCard, isSelected && styles.commissionCardSelected]}
                  onPress={() => toggleCommission(commission.id)}
                >
                  <View style={styles.commissionHeader}>
                    <View style={styles.checkboxContainer}>
                      {isSelected ? (
                        <CheckCircle size={24} color="#0066cc" />
                      ) : (
                        <View style={styles.checkbox} />
                      )}
                    </View>
                    <View style={styles.commissionInfo}>
                      <Text style={styles.commissionAffiliate}>
                        {commission.profiles.full_name}
                      </Text>
                      <Text style={styles.commissionCustomer}>
                        Customer: {commission.deals.contact_submissions?.name || 'N/A'}
                      </Text>
                    </View>
                    <Text style={styles.commissionAmount}>${total.toFixed(2)}</Text>
                  </View>

                  <View style={styles.commissionDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Deal Value:</Text>
                      <Text style={styles.detailValue}>
                        ${parseFloat(commission.deals.deal_value).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Affiliate Commission:</Text>
                      <Text style={styles.detailValue}>
                        ${parseFloat(commission.commission_amount).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Platform Fee:</Text>
                      <Text style={styles.detailValue}>
                        ${parseFloat(commission.platform_fee_amount).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.commissionDate}>
                    Created: {new Date(commission.created_at).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedCommissions.size > 0 && (
            <View style={styles.paymentSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Selected Commissions ({selectedCommissions.size}):
                </Text>
                <Text style={styles.summaryValue}>${totalSelected.toFixed(2)}</Text>
              </View>

              <TouchableOpacity
                style={[styles.payButton, processing && styles.payButtonDisabled]}
                onPress={handlePayCommissions}
                disabled={processing}
              >
                <CreditCard size={20} color="#fff" />
                <Text style={styles.payButtonText}>
                  {processing ? 'Processing...' : `Pay $${totalSelected.toFixed(2)}`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {pendingCommissions.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <CheckCircle size={64} color="#10b981" />
          <Text style={styles.emptyStateTitle}>All Caught Up!</Text>
          <Text style={styles.emptyStateText}>
            You have no pending commission payments at this time.
          </Text>
        </View>
      )}

      {paymentHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment History</Text>

          {paymentHistory.map((payment) => (
            <View key={payment.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyAmount}>
                    ${parseFloat(payment.total_amount).toFixed(2)}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(payment.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    payment.payment_status === 'succeeded' && styles.statusSucceeded,
                    payment.payment_status === 'pending' && styles.statusPending,
                    payment.payment_status === 'failed' && styles.statusFailed,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {payment.payment_status.charAt(0).toUpperCase() +
                      payment.payment_status.slice(1)}
                  </Text>
                </View>
              </View>

              <Text style={styles.historyDetails}>
                {payment.number_of_commissions} commission{payment.number_of_commissions !== 1 ? 's' : ''}
              </Text>

              {payment.receipt_url && payment.payment_status === 'succeeded' && (
                <TouchableOpacity
                  style={styles.receiptButton}
                  onPress={() => Linking.openURL(payment.receipt_url!)}
                >
                  <ExternalLink size={16} color="#0066cc" />
                  <Text style={styles.receiptButtonText}>View Receipt</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  balanceCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fee2e2',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  balanceSubtext: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  selectAllText: {
    fontSize: 14,
    color: '#0066cc',
    fontWeight: '600',
  },
  commissionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  commissionCardSelected: {
    borderColor: '#0066cc',
    backgroundColor: '#f0f7ff',
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 6,
  },
  commissionInfo: {
    flex: 1,
  },
  commissionAffiliate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  commissionCustomer: {
    fontSize: 14,
    color: '#666',
  },
  commissionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  commissionDetails: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commissionDate: {
    fontSize: 12,
    color: '#999',
  },
  paymentSummary: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#0066cc',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066cc',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyInfo: {
    flex: 1,
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
  },
  historyDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusSucceeded: {
    backgroundColor: '#d1fae5',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusFailed: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  receiptButtonText: {
    fontSize: 14,
    color: '#0066cc',
    fontWeight: '600',
  },
});

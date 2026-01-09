import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import BackButton from '@/components/BackButton';

interface Commission {
  id: string;
  deal_id: string;
  affiliate_id: string;
  commission_amount: number;
  platform_fee_amount: number;
  affiliate_payout_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  expected_payout_date: string;
  company_paid: boolean;
  company_paid_at: string | null;
  rep_paid: boolean;
  rep_paid_at: string | null;
  payment_notes: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    venmo_username: string | null;
  };
  deals: {
    deal_value: number;
    contract_type: string;
  };
}

export default function AdminCommissions() {
  const { profile } = useAuth();
  const router = useRouter();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  useEffect(() => {
    if (!profile?.is_super_admin) {
      Alert.alert('Access Denied', 'Admin access required');
      router.back();
      return;
    }
    loadCommissions();
  }, [profile, filter]);

  const loadCommissions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('commissions')
        .select(`
          *,
          profiles!commissions_affiliate_id_fkey (full_name, email, venmo_username),
          deals (deal_value, contract_type)
        `);

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setCommissions(data || []);
    } catch (error) {
      console.error('Error loading commissions:', error);
      Alert.alert('Error', 'Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const updateCommissionStatus = async (commissionId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('commissions')
        .update({ status })
        .eq('id', commissionId);

      if (error) throw error;

      Alert.alert('Success', `Commission ${status}`);
      loadCommissions();
    } catch (error) {
      console.error('Error updating commission:', error);
      Alert.alert('Error', 'Failed to update commission');
    }
  };

  const markCompanyPaid = async (commissionId: string) => {
    try {
      const { error } = await supabase
        .from('commissions')
        .update({
          company_paid: true,
          company_paid_at: new Date().toISOString()
        })
        .eq('id', commissionId);

      if (error) throw error;

      Alert.alert('Success', 'Marked as company paid');
      loadCommissions();
    } catch (error) {
      console.error('Error marking company paid:', error);
      Alert.alert('Error', 'Failed to update payment status');
    }
  };

  const markRepPaid = async (commissionId: string) => {
    try {
      const { error } = await supabase
        .from('commissions')
        .update({
          rep_paid: true,
          rep_paid_at: new Date().toISOString()
        })
        .eq('id', commissionId);

      if (error) throw error;

      Alert.alert('Success', 'Marked as paid to rep');
      loadCommissions();
    } catch (error) {
      console.error('Error marking rep paid:', error);
      Alert.alert('Error', 'Failed to update payment status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'paid': return '#3B82F6';
      default: return '#64748B';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton color="#60A5FA" style={styles.backButton} />
        <View style={styles.headerContent}>
          <Text style={styles.title}>Commission Approval</Text>
          <Text style={styles.subtitle}>{commissions.length} commissions</Text>
        </View>
      </View>

      <View style={styles.filterBar}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadCommissions} />}
      >
        {commissions.map((commission) => (
          <View key={commission.id} style={styles.commissionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.affiliateInfo}>
                <Text style={styles.affiliateName}>{commission.profiles.full_name}</Text>
                <Text style={styles.affiliateEmail}>{commission.profiles.email}</Text>
                {commission.profiles.venmo_username && (
                  <Text style={styles.venmoUsername}>@{commission.profiles.venmo_username}</Text>
                )}
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(commission.status) + '20' },
                ]}
              >
                <Text style={[styles.statusText, { color: getStatusColor(commission.status) }]}>
                  {commission.status}
                </Text>
              </View>
            </View>

            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Deal Value</Text>
                <Text style={styles.detailValue}>${commission.deals.deal_value.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Commission</Text>
                <Text style={styles.detailValue}>${commission.commission_amount.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Platform Fee</Text>
                <Text style={styles.detailValue}>-${commission.platform_fee_amount.toFixed(2)}</Text>
              </View>
              <View style={[styles.detailRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Affiliate Payout</Text>
                <Text style={styles.totalValue}>${commission.affiliate_payout_amount.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Expected Payout</Text>
                <Text style={styles.detailValue}>
                  {new Date(commission.expected_payout_date).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {commission.status === 'pending' && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => updateCommissionStatus(commission.id, 'approved')}
                >
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => updateCommissionStatus(commission.id, 'rejected')}
                >
                  <XCircle size={16} color="#EF4444" />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}

            {commission.status === 'approved' && (
              <View style={styles.paymentTracking}>
                <Text style={styles.paymentTrackingTitle}>Payment Tracking</Text>

                <View style={styles.paymentRow}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentLabel}>Company Paid</Text>
                    {commission.company_paid && commission.company_paid_at && (
                      <Text style={styles.paymentDate}>
                        {new Date(commission.company_paid_at).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.paymentButton,
                      commission.company_paid && styles.paymentButtonPaid
                    ]}
                    onPress={() => !commission.company_paid && markCompanyPaid(commission.id)}
                    disabled={commission.company_paid}
                  >
                    {commission.company_paid ? (
                      <>
                        <CheckCircle size={16} color="#10B981" />
                        <Text style={styles.paymentButtonPaidText}>Paid</Text>
                      </>
                    ) : (
                      <Text style={styles.paymentButtonText}>Mark Paid</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.paymentRow}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentLabel}>Paid to Rep</Text>
                    {commission.rep_paid && commission.rep_paid_at && (
                      <Text style={styles.paymentDate}>
                        {new Date(commission.rep_paid_at).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.paymentButton,
                      commission.rep_paid && styles.paymentButtonPaid
                    ]}
                    onPress={() => !commission.rep_paid && markRepPaid(commission.id)}
                    disabled={commission.rep_paid}
                  >
                    {commission.rep_paid ? (
                      <>
                        <CheckCircle size={16} color="#10B981" />
                        <Text style={styles.paymentButtonPaidText}>Paid</Text>
                      </>
                    ) : (
                      <Text style={styles.paymentButtonText}>Mark Paid</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}

        {commissions.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Clock color="#64748B" size={48} />
            <Text style={styles.emptyText}>No commissions found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  filterBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  commissionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  affiliateInfo: {
    flex: 1,
  },
  affiliateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  affiliateEmail: {
    fontSize: 13,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  details: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 6,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
  },
  venmoUsername: {
    fontSize: 13,
    color: '#60A5FA',
    marginTop: 2,
    fontWeight: '500',
  },
  paymentTracking: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  paymentTrackingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: 12,
    color: '#64748B',
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  paymentButtonPaid: {
    backgroundColor: '#10B98120',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  paymentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paymentButtonPaidText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
});

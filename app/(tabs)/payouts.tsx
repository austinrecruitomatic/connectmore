import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, Calendar, CheckCircle, Clock, XCircle, TrendingUp, Settings, CreditCard } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { formatCurrency } from '@/lib/stripeConfig';

type PayoutData = {
  affiliate_id: string;
  pending_earnings: number;
  total_paid: number;
  pending_commission_count: number;
  last_payout_date: string | null;
  stripe_account_status: string | null;
  stripe_onboarding_completed: boolean;
  stripe_external_account_last4: string | null;
  stripe_external_account_type: string | null;
  payout_frequency: string | null;
  next_scheduled_payout_date: string | null;
  minimum_payout_threshold: number | null;
  preferred_payout_method: string | null;
  auto_payout_enabled: boolean;
};

type Payout = {
  id: string;
  total_amount: number;
  status: string;
  scheduled_date: string;
  processed_at: string | null;
  payout_method: string;
  stripe_fee_amount: number;
  commission_ids: string[];
  notes: string;
  created_at: string;
};

export default function PayoutsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payoutData, setPayoutData] = useState<PayoutData | null>(null);
  const [recentPayouts, setRecentPayouts] = useState<Payout[]>([]);

  useEffect(() => {
    if (profile?.user_type === 'affiliate') {
      loadPayoutData();
    }
  }, [profile]);

  const loadPayoutData = async () => {
    try {
      const { data: dashboardData } = await supabase
        .from('affiliate_payout_dashboard')
        .select('*')
        .eq('affiliate_id', profile?.id)
        .maybeSingle();

      if (dashboardData) {
        setPayoutData(dashboardData);
      }

      const { data: payoutsData } = await supabase
        .from('payouts')
        .select('*')
        .eq('affiliate_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (payoutsData) {
        setRecentPayouts(payoutsData);
      }
    } catch (error) {
      console.error('Error loading payout data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPayoutData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'processing':
        return '#F59E0B';
      case 'scheduled':
        return '#3B82F6';
      case 'failed':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'processing':
        return Clock;
      case 'scheduled':
        return Calendar;
      case 'failed':
        return XCircle;
      default:
        return Clock;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPayoutMethodLabel = (method: string) => {
    switch (method) {
      case 'ach_standard':
        return 'Bank Transfer (ACH)';
      case 'ach_instant':
        return 'Instant Bank Transfer';
      case 'debit_instant':
        return 'Instant to Debit Card';
      default:
        return method;
    }
  };

  if (profile?.user_type !== 'affiliate') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>This page is only for affiliates</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const needsStripeSetup = !payoutData?.stripe_onboarding_completed;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3B82F6" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Payouts</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/payout-settings')}
        >
          <Settings size={20} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      {needsStripeSetup && (
        <TouchableOpacity
          style={styles.setupBanner}
          onPress={() => router.push('/stripe-onboarding')}
        >
          <View style={styles.setupIconContainer}>
            <CreditCard size={24} color="#F59E0B" />
          </View>
          <View style={styles.setupContent}>
            <Text style={styles.setupTitle}>Setup Required</Text>
            <Text style={styles.setupDescription}>
              Connect your bank account to receive payouts
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <DollarSign size={24} color="#10B981" />
          </View>
          <Text style={styles.statValue}>
            {formatCurrency(payoutData?.pending_earnings || 0)}
          </Text>
          <Text style={styles.statLabel}>Pending Earnings</Text>
          {payoutData?.pending_commission_count ? (
            <Text style={styles.statSubtext}>
              {payoutData.pending_commission_count} commissions
            </Text>
          ) : null}
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <TrendingUp size={24} color="#3B82F6" />
          </View>
          <Text style={styles.statValue}>
            {formatCurrency(payoutData?.total_paid || 0)}
          </Text>
          <Text style={styles.statLabel}>Total Paid</Text>
          {payoutData?.last_payout_date && (
            <Text style={styles.statSubtext}>
              Last: {formatDate(payoutData.last_payout_date)}
            </Text>
          )}
        </View>
      </View>

      {payoutData?.next_scheduled_payout_date && payoutData?.auto_payout_enabled && (
        <View style={styles.nextPayoutCard}>
          <View style={styles.nextPayoutHeader}>
            <Calendar size={20} color="#60A5FA" />
            <Text style={styles.nextPayoutTitle}>Next Scheduled Payout</Text>
          </View>
          <Text style={styles.nextPayoutDate}>
            {formatDate(payoutData.next_scheduled_payout_date)}
          </Text>
          <Text style={styles.nextPayoutDescription}>
            Minimum threshold: {formatCurrency(payoutData.minimum_payout_threshold || 0)}
          </Text>
          {payoutData.pending_earnings >= (payoutData.minimum_payout_threshold || 0) && (
            <View style={styles.readyBadge}>
              <CheckCircle size={14} color="#10B981" />
              <Text style={styles.readyBadgeText}>Ready for payout</Text>
            </View>
          )}
        </View>
      )}

      {payoutData?.stripe_external_account_last4 && (
        <View style={styles.accountCard}>
          <View style={styles.accountHeader}>
            <CreditCard size={20} color="#94A3B8" />
            <Text style={styles.accountTitle}>Payout Account</Text>
          </View>
          <Text style={styles.accountDetails}>
            {payoutData.stripe_external_account_type === 'bank_account'
              ? 'Bank Account'
              : 'Debit Card'}
            {' '}ending in {payoutData.stripe_external_account_last4}
          </Text>
          <Text style={styles.accountMethod}>
            Method: {getPayoutMethodLabel(payoutData.preferred_payout_method || 'ach_standard')}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Payouts</Text>

        {recentPayouts.length === 0 ? (
          <View style={styles.emptyState}>
            <DollarSign size={48} color="#64748B" />
            <Text style={styles.emptyStateText}>No payouts yet</Text>
            <Text style={styles.emptyStateDescription}>
              Your payouts will appear here once commissions are approved
            </Text>
          </View>
        ) : (
          recentPayouts.map((payout) => {
            const StatusIcon = getStatusIcon(payout.status);
            return (
              <View key={payout.id} style={styles.payoutItem}>
                <View style={styles.payoutLeft}>
                  <View
                    style={[
                      styles.statusIcon,
                      { backgroundColor: `${getStatusColor(payout.status)}20` },
                    ]}
                  >
                    <StatusIcon size={20} color={getStatusColor(payout.status)} />
                  </View>
                  <View style={styles.payoutInfo}>
                    <Text style={styles.payoutAmount}>
                      {formatCurrency(payout.total_amount)}
                    </Text>
                    <Text style={styles.payoutDate}>
                      {formatDate(payout.processed_at || payout.scheduled_date)}
                    </Text>
                    {payout.stripe_fee_amount > 0 && (
                      <Text style={styles.payoutFee}>
                        Fee: {formatCurrency(payout.stripe_fee_amount)}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.payoutRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(payout.status)}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusColor(payout.status) },
                      ]}
                    >
                      {payout.status}
                    </Text>
                  </View>
                  <Text style={styles.commissionCount}>
                    {payout.commission_ids.length} commissions
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  setupBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  setupIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF9C3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  setupContent: {
    flex: 1,
    justifyContent: 'center',
  },
  setupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  setupDescription: {
    fontSize: 14,
    color: '#B45309',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#64748B',
  },
  nextPayoutCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  nextPayoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  nextPayoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextPayoutDate: {
    fontSize: 24,
    fontWeight: '700',
    color: '#60A5FA',
    marginBottom: 8,
  },
  nextPayoutDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B98120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  readyBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  accountCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  accountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  accountDetails: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  accountMethod: {
    fontSize: 14,
    color: '#94A3B8',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  payoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  payoutLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  payoutDate: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 2,
  },
  payoutFee: {
    fontSize: 12,
    color: '#64748B',
  },
  payoutRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  commissionCount: {
    fontSize: 12,
    color: '#64748B',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
});

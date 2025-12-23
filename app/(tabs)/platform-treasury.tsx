import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';

type TreasuryRecord = {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  created_at: string;
};

type ReconciliationRecord = {
  id: string;
  customer_paid: boolean;
  deal_created: boolean;
  commission_approved: boolean;
  company_paid_commission: boolean;
  affiliate_paid: boolean;
  fully_settled: boolean;
  customer_payment_amount: number;
  commission_amount: number;
  platform_fee_amount: number;
  affiliate_payout_amount: number;
  created_at: string;
};

type Stats = {
  totalReceived: number;
  totalPaidOut: number;
  platformRevenue: number;
  pendingPayouts: number;
  fullySettledCount: number;
  pendingReconciliation: number;
};

export default function PlatformTreasuryScreen() {
  const { profile } = useAuth();
  const [treasuryRecords, setTreasuryRecords] = useState<TreasuryRecord[]>([]);
  const [reconciliationRecords, setReconciliationRecords] = useState<ReconciliationRecord[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalReceived: 0,
    totalPaidOut: 0,
    platformRevenue: 0,
    pendingPayouts: 0,
    fullySettledCount: 0,
    pendingReconciliation: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'treasury' | 'reconciliation'>('overview');

  useEffect(() => {
    if (profile?.is_super_admin) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    setLoading(true);

    try {
      const { data: treasuryData } = await supabase
        .from('platform_treasury')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: reconciliationData } = await supabase
        .from('payment_reconciliation')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setTreasuryRecords(treasuryData || []);
      setReconciliationRecords(reconciliationData || []);

      const totalReceived = (treasuryData || [])
        .filter((r) => r.transaction_type === 'commission_received')
        .reduce((sum, r) => sum + parseFloat(r.amount), 0);

      const totalPaidOut = (treasuryData || [])
        .filter((r) => r.transaction_type === 'affiliate_payout')
        .reduce((sum, r) => sum + parseFloat(r.amount), 0);

      const platformRevenue = (treasuryData || [])
        .filter((r) => r.transaction_type === 'platform_fee_collected')
        .reduce((sum, r) => sum + parseFloat(r.amount), 0);

      const fullySettledCount = (reconciliationData || []).filter(
        (r) => r.fully_settled
      ).length;

      const pendingReconciliation = (reconciliationData || []).filter(
        (r) => !r.fully_settled
      ).length;

      const { data: pendingPayoutsData } = await supabase
        .from('payouts')
        .select('total_amount')
        .eq('status', 'pending');

      const pendingPayouts = (pendingPayoutsData || []).reduce(
        (sum, p) => sum + parseFloat(p.total_amount),
        0
      );

      setStats({
        totalReceived,
        totalPaidOut,
        platformRevenue,
        pendingPayouts,
        fullySettledCount,
        pendingReconciliation,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!profile?.is_super_admin) {
    return (
      <View style={styles.container}>
        <View style={styles.accessDenied}>
          <AlertCircle size={64} color="#ef4444" />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            This page is only accessible to platform administrators.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Platform Treasury</Text>
        <Text style={styles.subtitle}>
          Financial overview and reconciliation dashboard
        </Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'treasury' && styles.tabActive]}
          onPress={() => setActiveTab('treasury')}
        >
          <Text style={[styles.tabText, activeTab === 'treasury' && styles.tabTextActive]}>
            Treasury
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reconciliation' && styles.tabActive]}
          onPress={() => setActiveTab('reconciliation')}
        >
          <Text style={[styles.tabText, activeTab === 'reconciliation' && styles.tabTextActive]}>
            Reconciliation
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      >
        {activeTab === 'overview' && (
          <>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardGreen]}>
                <TrendingUp size={32} color="#10b981" />
                <Text style={styles.statLabel}>Received from Companies</Text>
                <Text style={styles.statValue}>${stats.totalReceived.toFixed(2)}</Text>
              </View>

              <View style={[styles.statCard, styles.statCardRed]}>
                <TrendingDown size={32} color="#ef4444" />
                <Text style={styles.statLabel}>Paid to Affiliates</Text>
                <Text style={styles.statValue}>${stats.totalPaidOut.toFixed(2)}</Text>
              </View>

              <View style={[styles.statCard, styles.statCardBlue]}>
                <DollarSign size={32} color="#0066cc" />
                <Text style={styles.statLabel}>Platform Revenue</Text>
                <Text style={styles.statValue}>${stats.platformRevenue.toFixed(2)}</Text>
              </View>

              <View style={[styles.statCard, styles.statCardYellow]}>
                <Activity size={32} color="#f59e0b" />
                <Text style={styles.statLabel}>Pending Payouts</Text>
                <Text style={styles.statValue}>${stats.pendingPayouts.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceAmount}>
                ${(stats.totalReceived - stats.totalPaidOut).toFixed(2)}
              </Text>
              <Text style={styles.balanceSubtext}>
                Available for affiliate payouts
              </Text>
            </View>

            <View style={styles.reconciliationSummary}>
              <Text style={styles.reconciliationTitle}>Reconciliation Status</Text>
              <View style={styles.reconciliationRow}>
                <CheckCircle size={20} color="#10b981" />
                <Text style={styles.reconciliationText}>
                  {stats.fullySettledCount} fully settled transactions
                </Text>
              </View>
              <View style={styles.reconciliationRow}>
                <AlertCircle size={20} color="#f59e0b" />
                <Text style={styles.reconciliationText}>
                  {stats.pendingReconciliation} pending reconciliation
                </Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'treasury' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {treasuryRecords.map((record) => (
              <View key={record.id} style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionType}>
                      {record.transaction_type.split('_').map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </Text>
                    <Text style={styles.transactionDescription}>
                      {record.description}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      (record.transaction_type === 'commission_received' ||
                        record.transaction_type === 'platform_fee_collected') &&
                        styles.transactionAmountPositive,
                      record.transaction_type === 'affiliate_payout' &&
                        styles.transactionAmountNegative,
                    ]}
                  >
                    {(record.transaction_type === 'commission_received' ||
                      record.transaction_type === 'platform_fee_collected')
                      ? '+'
                      : '-'}
                    ${parseFloat(record.amount).toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.transactionDate}>
                  {new Date(record.created_at).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'reconciliation' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Reconciliation</Text>
            {reconciliationRecords.map((record) => (
              <View key={record.id} style={styles.reconciliationCard}>
                <View style={styles.reconciliationHeader}>
                  <Text style={styles.reconciliationAmount}>
                    ${parseFloat(record.customer_payment_amount || '0').toFixed(2)}
                  </Text>
                  {record.fully_settled ? (
                    <View style={styles.settledBadge}>
                      <CheckCircle size={16} color="#10b981" />
                      <Text style={styles.settledText}>Settled</Text>
                    </View>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <AlertCircle size={16} color="#f59e0b" />
                      <Text style={styles.pendingText}>Pending</Text>
                    </View>
                  )}
                </View>

                <View style={styles.reconciliationSteps}>
                  <View style={styles.step}>
                    {record.customer_paid ? (
                      <CheckCircle size={16} color="#10b981" />
                    ) : (
                      <View style={styles.stepPending} />
                    )}
                    <Text style={styles.stepText}>Customer Paid</Text>
                  </View>
                  <View style={styles.step}>
                    {record.deal_created ? (
                      <CheckCircle size={16} color="#10b981" />
                    ) : (
                      <View style={styles.stepPending} />
                    )}
                    <Text style={styles.stepText}>Deal Created</Text>
                  </View>
                  <View style={styles.step}>
                    {record.commission_approved ? (
                      <CheckCircle size={16} color="#10b981" />
                    ) : (
                      <View style={styles.stepPending} />
                    )}
                    <Text style={styles.stepText}>Commission Approved</Text>
                  </View>
                  <View style={styles.step}>
                    {record.company_paid_commission ? (
                      <CheckCircle size={16} color="#10b981" />
                    ) : (
                      <View style={styles.stepPending} />
                    )}
                    <Text style={styles.stepText}>Company Paid</Text>
                  </View>
                  <View style={styles.step}>
                    {record.affiliate_paid ? (
                      <CheckCircle size={16} color="#10b981" />
                    ) : (
                      <View style={styles.stepPending} />
                    )}
                    <Text style={styles.stepText}>Affiliate Paid</Text>
                  </View>
                </View>

                {record.commission_amount && (
                  <View style={styles.reconciliationBreakdown}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Commission:</Text>
                      <Text style={styles.breakdownValue}>
                        ${parseFloat(record.commission_amount).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Platform Fee:</Text>
                      <Text style={styles.breakdownValue}>
                        ${parseFloat(record.platform_fee_amount || '0').toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                <Text style={styles.reconciliationDate}>
                  Created: {new Date(record.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#0066cc',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#0066cc',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    padding: 16,
    gap: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  statCardGreen: {
    borderLeftColor: '#10b981',
  },
  statCardRed: {
    borderLeftColor: '#ef4444',
  },
  statCardBlue: {
    borderLeftColor: '#0066cc',
  },
  statCardYellow: {
    borderLeftColor: '#f59e0b',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  balanceCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 8,
  },
  balanceSubtext: {
    fontSize: 14,
    color: '#999',
  },
  reconciliationSummary: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  reconciliationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  reconciliationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  reconciliationText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  transactionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionAmountPositive: {
    color: '#10b981',
  },
  transactionAmountNegative: {
    color: '#ef4444',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  reconciliationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reconciliationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reconciliationAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  settledText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  reconciliationSteps: {
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  stepPending: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  stepText: {
    fontSize: 14,
    color: '#666',
  },
  reconciliationBreakdown: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  reconciliationDate: {
    fontSize: 12,
    color: '#999',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

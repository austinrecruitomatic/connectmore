import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  DollarSign,
  Check,
  X,
  TrendingUp,
  AlertCircle,
} from 'lucide-react-native';

type Commission = {
  id: string;
  commission_amount: number;
  platform_fee_amount: number;
  affiliate_payout_amount: number;
  status: 'pending' | 'approved' | 'paid';
  expected_payout_date: string;
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
    email: string;
  };
};

export default function CommissionsScreen() {
  const { profile } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'paid'>('all');

  useEffect(() => {
    loadCommissions();
  }, [filter]);

  const loadCommissions = async () => {
    if (!profile?.id) return;

    setLoading(true);

    try {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!companyData) {
        setLoading(false);
        return;
      }

      setCompanyId(companyData.id);

      let query = supabase
        .from('commissions')
        .select(`
          *,
          deals!inner (
            deal_value,
            contact_submissions (name, email)
          ),
          profiles!commissions_affiliate_id_fkey (full_name, email)
        `)
        .eq('company_id', companyData.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCommissions(data || []);
    } catch (error) {
      console.error('Error loading commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (commissionId: string) => {
    try {
      const { error } = await supabase
        .from('commissions')
        .update({ status: 'approved' })
        .eq('id', commissionId);

      if (error) throw error;

      Alert.alert('Success', 'Commission approved!');
      loadCommissions();
    } catch (error: any) {
      console.error('Error approving commission:', error);
      Alert.alert('Error', error.message || 'Failed to approve commission');
    }
  };

  const handleBulkApprove = async () => {
    const pendingCommissions = commissions.filter((c) => c.status === 'pending');

    if (pendingCommissions.length === 0) {
      Alert.alert('No Pending Commissions', 'There are no pending commissions to approve');
      return;
    }

    Alert.alert(
      'Approve All Pending',
      `Are you sure you want to approve ${pendingCommissions.length} pending commission(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve All',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('commissions')
                .update({ status: 'approved' })
                .eq('company_id', companyId)
                .eq('status', 'pending');

              if (error) throw error;

              Alert.alert('Success', `${pendingCommissions.length} commissions approved!`);
              loadCommissions();
            } catch (error: any) {
              console.error('Error bulk approving:', error);
              Alert.alert('Error', error.message || 'Failed to approve commissions');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#F59E0B';
      case 'paid':
        return '#10B981';
      default:
        return '#3B82F6';
    }
  };

  const pendingTotal = commissions
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + c.affiliate_payout_amount, 0);

  const approvedTotal = commissions
    .filter((c) => c.status === 'approved')
    .reduce((sum, c) => sum + c.affiliate_payout_amount, 0);

  const paidTotal = commissions
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.affiliate_payout_amount, 0);

  const platformFeeTotal = commissions.reduce((sum, c) => sum + c.platform_fee_amount, 0);

  if (profile?.user_type !== 'company') {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>This feature is only available for companies</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Commissions</Text>
          <Text style={styles.subtitle}>{commissions.length} total commissions</Text>
        </View>
        {pendingTotal > 0 && (
          <TouchableOpacity style={styles.approveAllButton} onPress={handleBulkApprove}>
            <Check size={18} color="#fff" />
            <Text style={styles.approveAllText}>Approve All</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <AlertCircle size={20} color="#3B82F6" />
          <Text style={styles.statValue}>{formatCurrency(pendingTotal)}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Check size={20} color="#F59E0B" />
          <Text style={styles.statValue}>{formatCurrency(approvedTotal)}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statCard}>
          <DollarSign size={20} color="#10B981" />
          <Text style={styles.statValue}>{formatCurrency(paidTotal)}</Text>
          <Text style={styles.statLabel}>Paid Out</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'pending', 'approved', 'paid'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterButton, filter === status && styles.filterButtonActive]}
            onPress={() => setFilter(status)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === status && styles.filterButtonTextActive,
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadCommissions} />}
      >
        {commissions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No commissions found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all'
                ? 'Commissions will appear here when deals are created'
                : `No ${filter} commissions`}
            </Text>
          </View>
        ) : (
          commissions.map((commission) => (
            <View key={commission.id} style={styles.commissionCard}>
              <View style={styles.commissionHeader}>
                <View style={styles.commissionInfo}>
                  <Text style={styles.customerName}>
                    {commission.deals?.contact_submissions?.name || 'Customer'}
                  </Text>
                  <Text style={styles.affiliateName}>
                    to {commission.profiles?.full_name || 'Affiliate'}
                  </Text>
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

              <View style={styles.commissionBreakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Deal Value</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(commission.deals?.deal_value || 0)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Commission</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(commission.commission_amount)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Platform Fee</Text>
                  <Text style={[styles.breakdownValue, { color: '#F59E0B' }]}>
                    -{formatCurrency(commission.platform_fee_amount)}
                  </Text>
                </View>
                <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                  <Text style={styles.breakdownTotalLabel}>Affiliate Payout</Text>
                  <Text style={styles.breakdownTotalValue}>
                    {formatCurrency(commission.affiliate_payout_amount)}
                  </Text>
                </View>
              </View>

              <Text style={styles.commissionDate}>
                {commission.status === 'paid'
                  ? `Paid ${formatDate(commission.created_at)}`
                  : `Expected ${formatDate(commission.expected_payout_date)}`}
              </Text>

              {commission.status === 'pending' && (
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApprove(commission.id)}
                >
                  <Check size={16} color="#fff" />
                  <Text style={styles.approveButtonText}>Approve Commission</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

        {commissions.length > 0 && (
          <View style={styles.platformFeeCard}>
            <TrendingUp size={24} color="#8B5CF6" />
            <Text style={styles.platformFeeLabel}>Total Platform Fees</Text>
            <Text style={styles.platformFeeValue}>{formatCurrency(platformFeeTotal)}</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  approveAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  approveAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  commissionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  commissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  commissionInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  affiliateName: {
    fontSize: 14,
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
  commissionBreakdown: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 0,
  },
  breakdownTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  breakdownTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  commissionDate: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  platformFeeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  platformFeeLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    marginBottom: 4,
  },
  platformFeeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
  },
});

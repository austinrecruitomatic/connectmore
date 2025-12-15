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
  Users,
  Target,
  BarChart3,
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
  profiles?: {
    full_name: string;
    email: string;
  };
  companies?: {
    company_name: string;
  };
};

type PipelineMetrics = {
  totalLeads: number;
  qualifiedLeads: number;
  closedDeals: number;
  conversionRate: number;
  totalRevenue: number;
};

export default function CommissionsScreen() {
  const { profile } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'paid'>('all');
  const [pipelineMetrics, setPipelineMetrics] = useState<PipelineMetrics>({
    totalLeads: 0,
    qualifiedLeads: 0,
    closedDeals: 0,
    conversionRate: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadCommissions();
    loadPipelineMetrics();
  }, [filter]);

  const loadCommissions = async () => {
    if (!profile?.id) return;

    setLoading(true);

    try {
      if (profile.user_type === 'company') {
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
      } else {
        let query = supabase
          .from('commissions')
          .select(`
            *,
            deals!inner (
              deal_value,
              contact_submissions (name, email)
            ),
            companies!commissions_company_id_fkey (
              company_name
            )
          `)
          .eq('affiliate_id', profile.id)
          .order('created_at', { ascending: false });

        if (filter !== 'all') {
          query = query.eq('status', filter);
        }

        const { data, error } = await query;

        if (error) throw error;

        setCommissions(data || []);
      }
    } catch (error) {
      console.error('Error loading commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPipelineMetrics = async () => {
    if (!profile?.id) return;

    try {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!companyData) return;

      const { data: partnerships } = await supabase
        .from('affiliate_partnerships')
        .select('id')
        .eq('company_id', companyData.id);

      if (!partnerships || partnerships.length === 0) return;

      const partnershipIds = partnerships.map((p) => p.id);

      const { data: leads } = await supabase
        .from('contact_submissions')
        .select('status')
        .in('partnership_id', partnershipIds);

      const { data: deals } = await supabase
        .from('deals')
        .select('deal_value, status')
        .eq('company_id', companyData.id);

      const totalLeads = leads?.length || 0;
      const qualifiedLeads = leads?.filter((l) => l.status === 'qualified').length || 0;
      const closedDeals = leads?.filter((l) => l.status === 'closed').length || 0;
      const conversionRate = totalLeads > 0 ? (closedDeals / totalLeads) * 100 : 0;
      const totalRevenue =
        deals?.filter((d) => d.status === 'active').reduce((sum, d) => sum + d.deal_value, 0) || 0;

      setPipelineMetrics({
        totalLeads,
        qualifiedLeads,
        closedDeals,
        conversionRate,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error loading pipeline metrics:', error);
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

  const isCompany = profile?.user_type === 'company';
  const isAffiliate = profile?.user_type === 'affiliate';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{isCompany ? 'Commissions' : 'Earnings'}</Text>
          <Text style={styles.subtitle}>
            {isCompany
              ? `${commissions.length} commission payments to process`
              : `${commissions.length} commission payments earned`}
          </Text>
        </View>
        {isCompany && pendingTotal > 0 && (
          <TouchableOpacity style={styles.approveAllButton} onPress={handleBulkApprove}>
            <Check size={18} color="#fff" />
            <Text style={styles.approveAllText}>Approve All</Text>
          </TouchableOpacity>
        )}
      </View>

      {isCompany && (
        <View style={styles.dashboardContainer}>
          <Text style={styles.dashboardTitle}>Performance Dashboard</Text>

        <View style={styles.dashboardGrid}>
          <View style={styles.dashboardCard}>
            <View style={styles.dashboardCardHeader}>
              <Users size={20} color="#3B82F6" />
              <Text style={styles.dashboardCardLabel}>Pipeline</Text>
            </View>
            <Text style={styles.dashboardCardValue}>{pipelineMetrics.totalLeads}</Text>
            <Text style={styles.dashboardCardSubtext}>Total Leads</Text>
            <View style={styles.dashboardCardBreakdown}>
              <Text style={styles.breakdownItem}>
                Qualified: {pipelineMetrics.qualifiedLeads}
              </Text>
              <Text style={styles.breakdownItem}>Closed: {pipelineMetrics.closedDeals}</Text>
            </View>
          </View>

          <View style={styles.dashboardCard}>
            <View style={styles.dashboardCardHeader}>
              <Target size={20} color="#10B981" />
              <Text style={styles.dashboardCardLabel}>Conversion</Text>
            </View>
            <Text style={styles.dashboardCardValue}>
              {pipelineMetrics.conversionRate.toFixed(1)}%
            </Text>
            <Text style={styles.dashboardCardSubtext}>Close Rate</Text>
            <View style={styles.conversionBar}>
              <View
                style={[
                  styles.conversionBarFill,
                  { width: `${Math.min(pipelineMetrics.conversionRate, 100)}%` },
                ]}
              />
            </View>
          </View>

          <View style={[styles.dashboardCard, styles.dashboardCardWide]}>
            <View style={styles.dashboardCardHeader}>
              <BarChart3 size={20} color="#F59E0B" />
              <Text style={styles.dashboardCardLabel}>Revenue Generated</Text>
            </View>
            <Text style={styles.dashboardCardValue}>
              {formatCurrency(pipelineMetrics.totalRevenue)}
            </Text>
            <Text style={styles.dashboardCardSubtext}>Total Active Deal Value</Text>
          </View>
        </View>
      </View>
      )}


      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <AlertCircle size={20} color="#3B82F6" />
          <Text style={styles.statValue}>{formatCurrency(pendingTotal)}</Text>
          <Text style={styles.statLabel}>{isCompany ? 'To Approve' : 'Pending'}</Text>
        </View>
        <View style={styles.statCard}>
          <Check size={20} color="#F59E0B" />
          <Text style={styles.statValue}>{formatCurrency(approvedTotal)}</Text>
          <Text style={styles.statLabel}>{isCompany ? 'Approved' : 'Approved'}</Text>
        </View>
        <View style={styles.statCard}>
          <DollarSign size={20} color="#10B981" />
          <Text style={styles.statValue}>{formatCurrency(paidTotal)}</Text>
          <Text style={styles.statLabel}>{isCompany ? 'Paid' : 'Received'}</Text>
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
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              loadCommissions();
              loadPipelineMetrics();
            }}
          />
        }
      >
        {commissions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {isCompany ? 'No commissions found' : 'No earnings yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all'
                ? isCompany
                  ? 'Commissions will appear here when deals are created'
                  : 'Your earnings will appear here when companies close deals from your referrals'
                : `No ${filter} ${isCompany ? 'commissions' : 'earnings'}`}
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
                    {isCompany
                      ? `to ${commission.profiles?.full_name || 'Affiliate'}`
                      : `from ${commission.companies?.company_name || 'Company'}`}
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
                {isCompany && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Platform Fee</Text>
                    <Text style={[styles.breakdownValue, { color: '#F59E0B' }]}>
                      {formatCurrency(commission.platform_fee_amount)}
                    </Text>
                  </View>
                )}
                {!isCompany && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Platform Fee</Text>
                    <Text style={[styles.breakdownValue, { color: '#F59E0B' }]}>
                      -{formatCurrency(commission.platform_fee_amount)}
                    </Text>
                  </View>
                )}
                <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                  <Text style={styles.breakdownTotalLabel}>
                    {isCompany ? 'Total Payment' : 'Your Earnings'}
                  </Text>
                  <Text style={styles.breakdownTotalValue}>
                    {isCompany
                      ? formatCurrency(commission.commission_amount)
                      : formatCurrency(commission.affiliate_payout_amount)}
                  </Text>
                </View>
              </View>

              <Text style={styles.commissionDate}>
                {commission.status === 'paid'
                  ? isCompany
                    ? `Paid to platform ${formatDate(commission.created_at)}`
                    : `Received ${formatDate(commission.created_at)}`
                  : isCompany
                  ? `Due ${formatDate(commission.expected_payout_date)}`
                  : `Expected ${formatDate(commission.expected_payout_date)}`}
              </Text>

              {isCompany && commission.status === 'pending' && (
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

        {isCompany && commissions.length > 0 && (
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
  dashboardContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dashboardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  dashboardGrid: {
    gap: 12,
  },
  dashboardCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dashboardCardWide: {
    width: '100%',
  },
  dashboardCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dashboardCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  dashboardCardValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  dashboardCardSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  dashboardCardBreakdown: {
    flexDirection: 'row',
    gap: 16,
  },
  breakdownItem: {
    fontSize: 12,
    color: '#94A3B8',
  },
  conversionBar: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  conversionBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
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

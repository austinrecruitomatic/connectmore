import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
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
  Eye,
  MousePointer,
  Send,
  Ban,
  Bell,
} from 'lucide-react-native';

type Commission = {
  id: string;
  commission_amount: number;
  platform_fee_amount: number;
  affiliate_payout_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'denied';
  expected_payout_date: string;
  created_at: string;
  company_notes: string | null;
  company_notes_updated_at: string | null;
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

type TrackingStats = {
  totalViews: number;
  totalSubmissions: number;
  conversionRate: number;
  topPerformingTemplate: {
    id: string;
    title: string;
    views: number;
    submissions: number;
  } | null;
};

type CustomerReferralStats = {
  totalCustomers: number;
  activeReferrers: number;
  totalReferrals: number;
  convertedReferrals: number;
  referralCommissions: number;
};

type LeadSubmission = {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  status: string;
  created_at: string;
  contract_value: number | null;
  affiliate_notes: string | null;
  landing_page_slug: string | null;
  affiliate_partnerships: {
    affiliate_id: string;
    company_id: string;
    companies: {
      company_name: string;
    };
  };
  update_requests?: Array<{
    id: string;
    requested_at: string;
    resolved_at: string | null;
  }>;
};

export default function CommissionsScreen() {
  const { profile } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'denied'>('all');
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showLeadsModal, setShowLeadsModal] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [denyNotes, setDenyNotes] = useState('');
  const [trackingStats, setTrackingStats] = useState<TrackingStats>({
    totalViews: 0,
    totalSubmissions: 0,
    conversionRate: 0,
    topPerformingTemplate: null,
  });
  const [leadSubmissions, setLeadSubmissions] = useState<LeadSubmission[]>([]);
  const [pipelineMetrics, setPipelineMetrics] = useState<PipelineMetrics>({
    totalLeads: 0,
    qualifiedLeads: 0,
    closedDeals: 0,
    conversionRate: 0,
    totalRevenue: 0,
  });
  const [customerReferralStats, setCustomerReferralStats] = useState<CustomerReferralStats>({
    totalCustomers: 0,
    activeReferrers: 0,
    totalReferrals: 0,
    convertedReferrals: 0,
    referralCommissions: 0,
  });

  useEffect(() => {
    loadCommissions();
    loadPipelineMetrics();
    if (isAffiliate) {
      loadTrackingStats();
      loadCustomerReferralStats();
    }
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
            company_notes,
            company_notes_updated_at,
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
            company_notes,
            company_notes_updated_at,
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
        deals?.filter((d) => d.status !== 'cancelled').reduce((sum, d) => sum + d.deal_value, 0) || 0;

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

  const loadTrackingStats = async () => {
    if (!profile?.id) return;

    try {
      const { data: partnerships } = await supabase
        .from('affiliate_partnerships')
        .select('id')
        .eq('affiliate_id', profile.id);

      if (!partnerships) return;

      const partnershipIds = partnerships.map((p) => p.id);

      const { data: landingPages } = await supabase
        .from('landing_pages')
        .select('id, template_id, landing_page_templates(id, title, page_views)')
        .in('partnership_id', partnershipIds)
        .eq('is_published', true);

      let totalViews = 0;
      let templateStats: Array<{ id: string; title: string; views: number; submissions: number }> = [];

      if (landingPages) {
        for (const page of landingPages) {
          const template = page.landing_page_templates as any;
          if (template) {
            totalViews += template.page_views || 0;

            const { data: submissions } = await supabase
              .from('contact_submissions')
              .select('id')
              .in('partnership_id', partnershipIds)
              .eq('landing_page_slug', page.id);

            templateStats.push({
              id: template.id,
              title: template.title,
              views: template.page_views || 0,
              submissions: submissions?.length || 0,
            });
          }
        }
      }

      const { data: allSubmissions } = await supabase
        .from('contact_submissions')
        .select('id')
        .in('partnership_id', partnershipIds);

      const totalSubmissions = allSubmissions?.length || 0;
      const conversionRate = totalViews > 0 ? (totalSubmissions / totalViews) * 100 : 0;

      const topTemplate = templateStats.sort((a, b) => b.submissions - a.submissions)[0] || null;

      setTrackingStats({
        totalViews,
        totalSubmissions,
        conversionRate,
        topPerformingTemplate: topTemplate,
      });

      if (partnershipIds.length > 0) {
        const { data: leads, error: leadsError } = await supabase
          .from('contact_submissions')
          .select(`
            id,
            name,
            email,
            company_name,
            status,
            created_at,
            contract_value,
            affiliate_notes,
            landing_page_slug,
            affiliate_partnerships!inner (
              affiliate_id,
              company_id,
              companies (company_name)
            ),
            update_requests:lead_update_requests (
              id,
              requested_at,
              resolved_at
            )
          `)
          .in('partnership_id', partnershipIds)
          .order('created_at', { ascending: false });

        if (leadsError) {
          console.error('Error loading leads:', leadsError);
        } else {
          setLeadSubmissions((leads as unknown as LeadSubmission[]) || []);
        }
      } else {
        setLeadSubmissions([]);
      }
    } catch (error) {
      console.error('Error loading tracking stats:', error);
    }
  };

  const loadCustomerReferralStats = async () => {
    if (!profile?.id) return;

    try {
      // Get all customers that this affiliate brought in
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, total_referrals, first_purchase_at')
        .eq('original_affiliate_id', profile.id);

      if (customersError) throw customersError;

      const totalCustomers = customers?.length || 0;
      const activeReferrers = customers?.filter((c) => c.total_referrals > 0).length || 0;
      const totalReferrals = customers?.reduce((sum, c) => sum + (c.total_referrals || 0), 0) || 0;

      // Get customer referral records
      const { data: referrals, error: referralsError } = await supabase
        .from('customer_referrals')
        .select('id, status')
        .eq('original_affiliate_id', profile.id);

      if (referralsError) throw referralsError;

      const convertedReferrals =
        referrals?.filter((r) => r.status === 'converted' || r.status === 'rewarded').length || 0;

      // Get commissions from customer referrals
      const { data: referralCommissions, error: commissionsError } = await supabase
        .from('commissions')
        .select('affiliate_payout_amount')
        .eq('affiliate_id', profile.id)
        .eq('referral_tier', 'customer_referral');

      if (commissionsError) throw commissionsError;

      const referralCommissionsTotal =
        referralCommissions?.reduce((sum, c) => sum + (c.affiliate_payout_amount || 0), 0) || 0;

      setCustomerReferralStats({
        totalCustomers,
        activeReferrers,
        totalReferrals,
        convertedReferrals,
        referralCommissions: referralCommissionsTotal,
      });
    } catch (error) {
      console.error('Error loading customer referral stats:', error);
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

  const handleDenyPress = (commission: Commission) => {
    setSelectedCommission(commission);
    setDenyNotes('');
    setShowDenyModal(true);
  };

  const handleDenySubmit = async () => {
    if (!selectedCommission) return;

    if (!denyNotes.trim()) {
      Alert.alert('Notes Required', 'Please provide a reason for denying this commission');
      return;
    }

    try {
      const { error } = await supabase
        .from('commissions')
        .update({
          status: 'denied',
          company_notes: denyNotes.trim()
        })
        .eq('id', selectedCommission.id);

      if (error) throw error;

      Alert.alert('Success', 'Commission denied');
      setShowDenyModal(false);
      setSelectedCommission(null);
      setDenyNotes('');
      loadCommissions();
    } catch (error: any) {
      console.error('Error denying commission:', error);
      Alert.alert('Error', error.message || 'Failed to deny commission');
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
    const formatted = amount % 1 === 0
      ? amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `$${formatted}`;
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
      case 'denied':
        return '#EF4444';
      default:
        return '#3B82F6';
    }
  };

  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case 'closed':
        return '#10B981';
      case 'qualified':
        return '#F59E0B';
      case 'contacted':
        return '#3B82F6';
      case 'lost':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  const isLeadOver24Hours = (createdAt: string) => {
    const now = new Date().getTime();
    const leadTime = new Date(createdAt).getTime();
    const hoursDiff = (now - leadTime) / (1000 * 60 * 60);
    return hoursDiff > 24;
  };

  const hasUnresolvedRequest = (lead: LeadSubmission) => {
    return lead.update_requests?.some(req => req.resolved_at === null) || false;
  };

  const shouldShowRequestButton = (lead: LeadSubmission) => {
    return (
      lead.status === 'new' &&
      isLeadOver24Hours(lead.created_at) &&
      !hasUnresolvedRequest(lead)
    );
  };

  const handleRequestUpdate = async (lead: LeadSubmission) => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('lead_update_requests')
        .insert({
          contact_submission_id: lead.id,
          affiliate_id: profile.id,
          company_id: lead.affiliate_partnerships.company_id,
        });

      if (error) throw error;

      Alert.alert('Success', 'Update request sent to the company');
      loadTrackingStats();
    } catch (error: any) {
      console.error('Error requesting update:', error);
      Alert.alert('Error', error.message || 'Failed to send update request');
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

  const platformFeeTotal = commissions
    .filter((c) => c.status !== 'denied')
    .reduce((sum, c) => sum + c.platform_fee_amount, 0);

  const isCompany = profile?.user_type === 'company';
  const isAffiliate = profile?.user_type === 'affiliate';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>{isCompany ? 'Commissions' : 'Earnings'}</Text>
          {isCompany && pendingTotal > 0 && (
            <View style={styles.pendingAlert}>
              <Bell size={14} color="#3B82F6" />
              <Text style={styles.pendingAlertText}>
                {commissions.filter(c => c.status === 'pending').length} pending to review
              </Text>
            </View>
          )}
        </View>
        {isCompany && (
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.trackingButton}
              onPress={() => setShowDashboard(!showDashboard)}
            >
              <BarChart3 size={16} color="#fff" />
              <Text style={styles.trackingButtonText}>Dashboard</Text>
            </TouchableOpacity>
            {pendingTotal > 0 && (
              <TouchableOpacity style={styles.approveAllButton} onPress={handleBulkApprove}>
                <Check size={18} color="#fff" />
                <Text style={styles.approveAllText}>Approve All</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {isAffiliate && (
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.trackingButton}
              onPress={() => setShowTrackingModal(true)}
            >
              <BarChart3 size={16} color="#fff" />
              <Text style={styles.trackingButtonText}>Stats</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.trackingButton}
              onPress={() => setShowLeadsModal(true)}
            >
              <Users size={16} color="#fff" />
              <Text style={styles.trackingButtonText}>Leads</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
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
        {((isCompany && showDashboard) || isAffiliate) && (
          <View style={styles.metricsContainer}>
            <Text style={styles.dashboardTitle}>Performance Dashboard</Text>

            <View style={styles.metricsGrid}>
              {isCompany && (
                <>
                  <View style={styles.metricCard}>
                    <View style={styles.metricIcon}>
                      <Users size={24} color="#3B82F6" />
                    </View>
                    <Text style={styles.metricValue}>{pipelineMetrics.totalLeads}</Text>
                    <Text style={styles.metricLabel}>Pipeline</Text>
                    <Text style={styles.metricSubtext}>Total Leads</Text>
                    <View style={styles.metricBreakdown}>
                      <Text style={styles.breakdownText}>
                        Qualified: {pipelineMetrics.qualifiedLeads}
                      </Text>
                      <Text style={styles.breakdownText}>Closed: {pipelineMetrics.closedDeals}</Text>
                    </View>
                  </View>

                  <View style={styles.metricCard}>
                    <View style={styles.metricIcon}>
                      <Target size={24} color="#10B981" />
                    </View>
                    <Text style={styles.metricValue}>
                      {pipelineMetrics.conversionRate.toFixed(1)}%
                    </Text>
                    <Text style={styles.metricLabel}>Conversion</Text>
                    <Text style={styles.metricSubtext}>Close Rate</Text>
                    <View style={styles.conversionBar}>
                      <View
                        style={[
                          styles.conversionBarFill,
                          { width: `${Math.min(pipelineMetrics.conversionRate, 100)}%` },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.metricCard}>
                    <View style={styles.metricIcon}>
                      <BarChart3 size={24} color="#F59E0B" />
                    </View>
                    <Text style={styles.metricValue}>
                      {formatCurrency(pipelineMetrics.totalRevenue)}
                    </Text>
                    <Text style={styles.metricLabel}>Revenue Generated</Text>
                    <Text style={styles.metricSubtext}>Total Active Deal Value</Text>
                  </View>
                </>
              )}

              <View style={styles.earningsCard}>
                <View style={styles.metricIcon}>
                  <AlertCircle size={24} color="#3B82F6" />
                </View>
                <Text style={styles.metricValue}>{formatCurrency(pendingTotal)}</Text>
                <Text style={styles.metricLabel}>{isCompany ? 'To Approve' : 'Pending'}</Text>
              </View>

              <View style={styles.earningsCard}>
                <View style={styles.metricIcon}>
                  <Check size={24} color="#F59E0B" />
                </View>
                <Text style={styles.metricValue}>{formatCurrency(approvedTotal)}</Text>
                <Text style={styles.metricLabel}>Approved</Text>
              </View>

              <View style={styles.earningsCard}>
                <View style={styles.metricIcon}>
                  <DollarSign size={24} color="#10B981" />
                </View>
                <Text style={styles.metricValue}>{formatCurrency(paidTotal)}</Text>
                <Text style={styles.metricLabel}>{isCompany ? 'Paid' : 'Received'}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.filterContainer}>
          {(['all', 'pending', 'approved', 'paid', 'denied'] as const).map((status) => (
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
                  : commission.status === 'denied'
                  ? `Denied ${formatDate(commission.created_at)}`
                  : isCompany
                  ? `Due ${formatDate(commission.expected_payout_date)}`
                  : `Expected ${formatDate(commission.expected_payout_date)}`}
              </Text>

              {commission.company_notes && (
                <View style={styles.companyNotesBox}>
                  <View style={styles.companyNotesHeader}>
                    <AlertCircle size={16} color="#F59E0B" />
                    <Text style={styles.companyNotesLabel}>Company Notes:</Text>
                  </View>
                  <Text style={styles.companyNotes}>{commission.company_notes}</Text>
                  {commission.company_notes_updated_at && (
                    <Text style={styles.companyNotesDate}>
                      Updated {formatDate(commission.company_notes_updated_at)}
                    </Text>
                  )}
                </View>
              )}

              {isCompany && commission.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(commission.id)}
                  >
                    <Check size={16} color="#fff" />
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.denyButton}
                    onPress={() => handleDenyPress(commission)}
                  >
                    <Ban size={16} color="#fff" />
                    <Text style={styles.denyButtonText}>Deny</Text>
                  </TouchableOpacity>
                </View>
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

      <Modal
        visible={showTrackingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTrackingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Performance Tracking</Text>
              <TouchableOpacity onPress={() => setShowTrackingModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <View style={styles.trackingStatsGrid}>
                <View style={styles.trackingStatCard}>
                  <Eye size={24} color="#3B82F6" />
                  <Text style={styles.trackingStatValue}>{trackingStats.totalViews}</Text>
                  <Text style={styles.trackingStatLabel}>Total Views</Text>
                  <Text style={styles.trackingStatSubtext}>Landing page visits</Text>
                </View>

                <View style={styles.trackingStatCard}>
                  <MousePointer size={24} color="#10B981" />
                  <Text style={styles.trackingStatValue}>{trackingStats.totalSubmissions}</Text>
                  <Text style={styles.trackingStatLabel}>Conversions</Text>
                  <Text style={styles.trackingStatSubtext}>Form submissions</Text>
                </View>

                <View style={[styles.trackingStatCard, styles.trackingStatCardWide]}>
                  <Target size={24} color="#F59E0B" />
                  <Text style={styles.trackingStatValue}>
                    {trackingStats.conversionRate.toFixed(2)}%
                  </Text>
                  <Text style={styles.trackingStatLabel}>Conversion Rate</Text>
                  <Text style={styles.trackingStatSubtext}>Views to submissions</Text>
                  <View style={styles.conversionBar}>
                    <View
                      style={[
                        styles.conversionBarFill,
                        { width: `${Math.min(trackingStats.conversionRate, 100)}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>

              {trackingStats.topPerformingTemplate && (
                <View style={styles.topTemplateCard}>
                  <Text style={styles.topTemplateTitle}>Top Performing Page</Text>
                  <Text style={styles.topTemplateName}>
                    {trackingStats.topPerformingTemplate.title}
                  </Text>
                  <View style={styles.topTemplateStats}>
                    <View style={styles.topTemplateStat}>
                      <Eye size={16} color="#64748B" />
                      <Text style={styles.topTemplateStatText}>
                        {trackingStats.topPerformingTemplate.views} views
                      </Text>
                    </View>
                    <View style={styles.topTemplateStat}>
                      <Send size={16} color="#64748B" />
                      <Text style={styles.topTemplateStatText}>
                        {trackingStats.topPerformingTemplate.submissions} submissions
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.leadsSection}>
                <Text style={styles.leadsSectionTitle}>Your Leads ({leadSubmissions.length})</Text>
                {leadSubmissions.length === 0 ? (
                  <View style={styles.emptyLeadsState}>
                    <Text style={styles.emptyLeadsText}>No leads submitted yet</Text>
                    <Text style={styles.emptyLeadsSubtext}>
                      Leads will appear here when people fill out your landing pages
                    </Text>
                  </View>
                ) : (
                  leadSubmissions.map((lead) => (
                    <View key={lead.id} style={styles.leadCard}>
                      <View style={styles.leadHeader}>
                        <View style={styles.leadMainInfo}>
                          <Text style={styles.leadName}>{lead.name}</Text>
                          <Text style={styles.leadEmail}>{lead.email}</Text>
                          {lead.company_name && (
                            <Text style={styles.leadCompanyInfo}>at {lead.company_name}</Text>
                          )}
                          <Text style={styles.leadCompanyInfo}>
                            via {lead.affiliate_partnerships.companies.company_name}
                          </Text>
                          {lead.landing_page_slug && (
                            <Text style={styles.leadTemplate}>Page: {lead.landing_page_slug}</Text>
                          )}
                        </View>
                        <View
                          style={[
                            styles.leadStatusBadge,
                            { backgroundColor: getLeadStatusColor(lead.status) + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.leadStatusText,
                              { color: getLeadStatusColor(lead.status) },
                            ]}
                          >
                            {lead.status}
                          </Text>
                        </View>
                      </View>

                      {lead.contract_value && (
                        <View style={styles.leadValueRow}>
                          <DollarSign size={16} color="#10B981" />
                          <Text style={styles.leadValue}>
                            {formatCurrency(lead.contract_value)} contract value
                          </Text>
                        </View>
                      )}

                      {lead.affiliate_notes && (
                        <View style={styles.leadNotesBox}>
                          <Text style={styles.leadNotesLabel}>Your Notes:</Text>
                          <Text style={styles.leadNotes}>{lead.affiliate_notes}</Text>
                        </View>
                      )}

                      <Text style={styles.leadDate}>
                        Submitted {formatDate(lead.created_at)}
                      </Text>

                      {shouldShowRequestButton(lead) && (
                        <TouchableOpacity
                          style={styles.requestUpdateButton}
                          onPress={() => handleRequestUpdate(lead)}
                        >
                          <Bell size={16} color="#fff" />
                          <Text style={styles.requestUpdateButtonText}>
                            Request Status Update
                          </Text>
                        </TouchableOpacity>
                      )}

                      {hasUnresolvedRequest(lead) && (
                        <View style={styles.requestPendingBadge}>
                          <AlertCircle size={16} color="#F59E0B" />
                          <Text style={styles.requestPendingText}>
                            Update request pending
                          </Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>

              {customerReferralStats.totalCustomers > 0 && (
                <View style={styles.referralSection}>
                  <Text style={styles.referralSectionTitle}>
                    Customer Referral Network
                  </Text>
                  <Text style={styles.referralSectionSubtitle}>
                    Your customers are bringing in new business
                  </Text>

                  <View style={styles.referralStatsGrid}>
                    <View style={styles.referralStatCard}>
                      <Users size={20} color="#3B82F6" />
                      <Text style={styles.referralStatValue}>
                        {customerReferralStats.totalCustomers}
                      </Text>
                      <Text style={styles.referralStatLabel}>Total Customers</Text>
                    </View>

                    <View style={styles.referralStatCard}>
                      <TrendingUp size={20} color="#10B981" />
                      <Text style={styles.referralStatValue}>
                        {customerReferralStats.activeReferrers}
                      </Text>
                      <Text style={styles.referralStatLabel}>Active Referrers</Text>
                    </View>

                    <View style={styles.referralStatCard}>
                      <Target size={20} color="#F59E0B" />
                      <Text style={styles.referralStatValue}>
                        {customerReferralStats.totalReferrals}
                      </Text>
                      <Text style={styles.referralStatLabel}>Total Referrals</Text>
                    </View>

                    <View style={styles.referralStatCard}>
                      <Check size={20} color="#8B5CF6" />
                      <Text style={styles.referralStatValue}>
                        {customerReferralStats.convertedReferrals}
                      </Text>
                      <Text style={styles.referralStatLabel}>Converted</Text>
                    </View>
                  </View>

                  <View style={styles.referralEarningsCard}>
                    <DollarSign size={24} color="#10B981" />
                    <Text style={styles.referralEarningsLabel}>Customer Referral Earnings</Text>
                    <Text style={styles.referralEarningsValue}>
                      {formatCurrency(customerReferralStats.referralCommissions)}
                    </Text>
                    <Text style={styles.referralEarningsSubtext}>
                      Earned from customer-to-customer referrals
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.trackingTip}>
                <AlertCircle size={20} color="#3B82F6" />
                <Text style={styles.trackingTipText}>
                  Track your affiliate link performance and optimize your marketing strategy with
                  real-time data. Customer referrals multiply your impact!
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLeadsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLeadsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Leads</Text>
              <TouchableOpacity onPress={() => setShowLeadsModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <View style={styles.leadsSection}>
                <Text style={styles.leadsSectionTitle}>All Submissions ({leadSubmissions.length})</Text>
                {leadSubmissions.length === 0 ? (
                  <View style={styles.emptyLeadsState}>
                    <Text style={styles.emptyLeadsText}>No leads submitted yet</Text>
                    <Text style={styles.emptyLeadsSubtext}>
                      Leads will appear here when people fill out your landing pages
                    </Text>
                  </View>
                ) : (
                  leadSubmissions.map((lead) => (
                    <View key={lead.id} style={styles.leadCard}>
                      <View style={styles.leadHeader}>
                        <View style={styles.leadMainInfo}>
                          <Text style={styles.leadName}>{lead.name}</Text>
                          <Text style={styles.leadEmail}>{lead.email}</Text>
                          {lead.company_name && (
                            <Text style={styles.leadCompanyInfo}>at {lead.company_name}</Text>
                          )}
                          <Text style={styles.leadCompanyInfo}>
                            via {lead.affiliate_partnerships.companies.company_name}
                          </Text>
                          {lead.landing_page_slug && (
                            <Text style={styles.leadTemplate}>Page: {lead.landing_page_slug}</Text>
                          )}
                        </View>
                        <View
                          style={[
                            styles.leadStatusBadge,
                            { backgroundColor: getLeadStatusColor(lead.status) + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.leadStatusText,
                              { color: getLeadStatusColor(lead.status) },
                            ]}
                          >
                            {lead.status}
                          </Text>
                        </View>
                      </View>

                      {lead.contract_value && (
                        <View style={styles.leadValueRow}>
                          <DollarSign size={16} color="#10B981" />
                          <Text style={styles.leadValue}>
                            {formatCurrency(lead.contract_value)} contract value
                          </Text>
                        </View>
                      )}

                      {lead.affiliate_notes && (
                        <View style={styles.leadNotesBox}>
                          <Text style={styles.leadNotesLabel}>Your Notes:</Text>
                          <Text style={styles.leadNotes}>{lead.affiliate_notes}</Text>
                        </View>
                      )}

                      <Text style={styles.leadDate}>
                        Submitted {formatDate(lead.created_at)}
                      </Text>

                      {shouldShowRequestButton(lead) && (
                        <TouchableOpacity
                          style={styles.requestUpdateButton}
                          onPress={() => handleRequestUpdate(lead)}
                        >
                          <Bell size={16} color="#fff" />
                          <Text style={styles.requestUpdateButtonText}>
                            Request Status Update
                          </Text>
                        </TouchableOpacity>
                      )}

                      {hasUnresolvedRequest(lead) && (
                        <View style={styles.requestPendingBadge}>
                          <AlertCircle size={16} color="#F59E0B" />
                          <Text style={styles.requestPendingText}>
                            Update request pending
                          </Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDenyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDenyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.denyModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deny Commission</Text>
              <TouchableOpacity onPress={() => setShowDenyModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.denyModalBody}>
              <Text style={styles.denyModalDescription}>
                Please explain why this commission is being denied. This note will be visible to the affiliate.
              </Text>

              {selectedCommission && (
                <View style={styles.denyCommissionInfo}>
                  <Text style={styles.denyCommissionLabel}>Commission Details</Text>
                  <Text style={styles.denyCommissionValue}>
                    {selectedCommission.deals?.contact_submissions?.name || 'Customer'}
                  </Text>
                  <Text style={styles.denyCommissionAmount}>
                    {formatCurrency(selectedCommission.commission_amount)}
                  </Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Reason for Denial *</Text>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={6}
                placeholder="e.g., Customer cancelled order, Invalid lead, Outside service area..."
                placeholderTextColor="#64748B"
                value={denyNotes}
                onChangeText={setDenyNotes}
                textAlignVertical="top"
              />

              <View style={styles.denyModalActions}>
                <TouchableOpacity
                  style={styles.denyCancelButton}
                  onPress={() => setShowDenyModal(false)}
                >
                  <Text style={styles.denyCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.denyConfirmButton, !denyNotes.trim() && styles.denyConfirmButtonDisabled]}
                  onPress={handleDenySubmit}
                  disabled={!denyNotes.trim()}
                >
                  <Ban size={16} color="#fff" />
                  <Text style={styles.denyConfirmButtonText}>Deny Commission</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 60,
    gap: 12,
  },
  headerTitleContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    flexWrap: 'wrap',
  },
  pendingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3B82F620',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  pendingAlertText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  approveAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  approveAllText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  metricsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  metricsGrid: {
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
  },
  earningsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
  },
  metricIcon: {
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 34,
  },
  metricLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 2,
  },
  metricSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  metricBreakdown: {
    gap: 8,
    marginTop: 8,
  },
  breakdownText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  conversionBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  conversionBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterButton: {
    minWidth: '18%',
    paddingVertical: 8,
    paddingHorizontal: 10,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flex: 1,
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
  denyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
  },
  denyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  companyNotesBox: {
    backgroundColor: '#7C2D1220',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EF444420',
  },
  companyNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  companyNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  companyNotes: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  companyNotesDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
  },
  denyModalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  denyModalBody: {
    padding: 20,
  },
  denyModalDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 20,
  },
  denyCommissionInfo: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  denyCommissionLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  denyCommissionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  denyCommissionAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 120,
    marginBottom: 20,
  },
  denyModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  denyCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  denyCancelButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  denyConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  denyConfirmButtonDisabled: {
    backgroundColor: '#EF444460',
  },
  denyConfirmButtonText: {
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
  headerButtons: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  trackingButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    height: '85%',
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
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  trackingStatsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  trackingStatCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  trackingStatCardWide: {
    width: '100%',
  },
  trackingStatValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
  },
  trackingStatLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 4,
  },
  trackingStatSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  topTemplateCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  topTemplateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  topTemplateName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  topTemplateStats: {
    flexDirection: 'row',
    gap: 16,
  },
  topTemplateStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topTemplateStatText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  trackingTip: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#1E3A8A20',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3B82F620',
  },
  trackingTipText: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  leadsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  leadsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  leadCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leadMainInfo: {
    flex: 1,
    marginRight: 12,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  leadEmail: {
    flexWrap: 'wrap',
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  leadCompanyInfo: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  leadTemplate: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    flexWrap: 'wrap',
  },
  leadStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  leadStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  leadValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  leadValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    flexWrap: 'wrap',
    flex: 1,
  },
  leadNotesBox: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  leadNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 4,
  },
  leadNotes: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
    flexWrap: 'wrap',
  },
  leadDate: {
    fontSize: 12,
    color: '#64748B',
    flexWrap: 'wrap',
  },
  requestUpdateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  requestUpdateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  requestPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F59E0B20',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  requestPendingText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyLeadsState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyLeadsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  emptyLeadsSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  referralSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  referralSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  referralSectionSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  referralStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  referralStatCard: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  referralStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  referralStatLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  referralEarningsCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  referralEarningsLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    marginBottom: 4,
  },
  referralEarningsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  referralEarningsSubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
});

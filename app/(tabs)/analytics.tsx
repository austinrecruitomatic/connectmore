import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Eye, MousePointer, DollarSign, TrendingUp, Building2, Users, ArrowRight, Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type Lead = {
  id: string;
  lead_type: 'click' | 'signup' | 'conversion';
  created_at: string;
  lead_data: any;
  landing_page: {
    title: string;
    slug: string;
  } | null;
  contact_submissions: {
    name: string;
    status: string;
  } | null;
};

type Partnership = {
  id: string;
  company: {
    company_name: string;
    id: string;
  };
  status: string;
  leads: Lead[];
};

type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  status: string;
  created_at: string;
};

type CompanyStats = {
  totalSubmissions: number;
  newLeads: number;
  contacted: number;
  qualified: number;
  closed: number;
  recentSubmissions: ContactSubmission[];
};

type Commission = {
  id: string;
  commission_amount: number;
  affiliate_payout_amount: number;
  platform_fee_amount: number;
  status: 'pending' | 'approved' | 'paid';
  expected_payout_date: string;
  created_at: string;
  deals: {
    deal_value: number;
    contact_submissions: {
      name: string;
    } | null;
  };
};

type Stats = {
  totalLeads: number;
  totalClicks: number;
  totalSignups: number;
  totalConversions: number;
  partnerships: Partnership[];
  companyStats?: CompanyStats;
  commissions?: {
    total: number;
    pending: number;
    approved: number;
    paid: number;
    list: Commission[];
  };
};

export default function AnalyticsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const isCompany = profile?.user_type === 'company';
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    totalClicks: 0,
    totalSignups: 0,
    totalConversions: 0,
    partnerships: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);

    if (isCompany && profile?.id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (companyData) {
        const { data: partnerships } = await supabase
          .from('affiliate_partnerships')
          .select('id, company_id')
          .eq('company_id', companyData.id);

        const partnershipIds = partnerships?.map((p) => p.id) || [];

        if (partnershipIds.length > 0) {
          const { data: leads } = await supabase
            .from('leads')
            .select('*, landing_pages(title, slug)')
            .in('partnership_id', partnershipIds)
            .order('created_at', { ascending: false });

          const clicks = leads?.filter((l) => l.lead_type === 'click').length || 0;
          const signups = leads?.filter((l) => l.lead_type === 'signup').length || 0;
          const conversions = leads?.filter((l) => l.lead_type === 'conversion').length || 0;

          const { data: submissions } = await supabase
            .from('contact_submissions')
            .select('id, name, email, company_name, status, created_at')
            .in('partnership_id', partnershipIds)
            .order('created_at', { ascending: false })
            .limit(5);

          const newLeads = submissions?.filter((s) => s.status === 'new').length || 0;
          const contacted = submissions?.filter((s) => s.status === 'contacted').length || 0;
          const qualified = submissions?.filter((s) => s.status === 'qualified').length || 0;
          const closed = submissions?.filter((s) => s.status === 'closed').length || 0;

          setStats({
            totalLeads: leads?.length || 0,
            totalClicks: clicks,
            totalSignups: signups,
            totalConversions: conversions,
            partnerships: [],
            companyStats: {
              totalSubmissions: submissions?.length || 0,
              newLeads,
              contacted,
              qualified,
              closed,
              recentSubmissions: submissions || [],
            },
          });
        }
      }
    } else if (profile?.id) {
      const { data: partnerships } = await supabase
        .from('affiliate_partnerships')
        .select('id, status, company_id, companies(id, company_name)')
        .eq('affiliate_id', profile.id);

      if (partnerships && partnerships.length > 0) {
        const partnershipData: Partnership[] = [];
        let allClicks = 0;
        let allSignups = 0;
        let allConversions = 0;
        let allLeads = 0;

        for (const partnership of partnerships) {
          const { data: leads } = await supabase
            .from('leads')
            .select('id, lead_type, created_at, lead_data, landing_pages(title, slug), contact_submissions(name, status)')
            .eq('partnership_id', partnership.id)
            .order('created_at', { ascending: false });

          const clicks = leads?.filter((l) => l.lead_type === 'click').length || 0;
          const signups = leads?.filter((l) => l.lead_type === 'signup').length || 0;
          const conversions = leads?.filter((l) => l.lead_type === 'conversion' || (l.contact_submissions as any)?.status === 'closed').length || 0;

          allClicks += clicks;
          allSignups += signups;
          allConversions += conversions;
          allLeads += leads?.length || 0;

          partnershipData.push({
            id: partnership.id,
            company: {
              company_name: (partnership.companies as any)?.company_name || 'Unknown Company',
              id: partnership.company_id,
            },
            status: partnership.status,
            leads: leads?.map((lead) => ({
              id: lead.id,
              lead_type: lead.lead_type,
              created_at: lead.created_at,
              lead_data: lead.lead_data,
              landing_page: lead.landing_pages as any,
              contact_submissions: lead.contact_submissions as any,
            })) || [],
          });
        }

        const { data: commissions } = await supabase
          .from('commissions')
          .select(`
            *,
            deals!inner (
              deal_value,
              contact_submissions (name)
            )
          `)
          .eq('affiliate_id', profile.id)
          .order('created_at', { ascending: false });

        const pendingCommissions = commissions?.filter((c) => c.status === 'pending') || [];
        const approvedCommissions = commissions?.filter((c) => c.status === 'approved') || [];
        const paidCommissions = commissions?.filter((c) => c.status === 'paid') || [];

        const totalEarnings = paidCommissions.reduce((sum, c) => sum + c.affiliate_payout_amount, 0);
        const pendingEarnings = [...pendingCommissions, ...approvedCommissions].reduce(
          (sum, c) => sum + c.affiliate_payout_amount,
          0
        );

        setStats({
          totalLeads: allLeads,
          totalClicks: allClicks,
          totalSignups: allSignups,
          totalConversions: allConversions,
          partnerships: partnershipData,
          commissions: {
            total: totalEarnings,
            pending: pendingEarnings,
            approved: approvedCommissions.reduce((sum, c) => sum + c.affiliate_payout_amount, 0),
            paid: totalEarnings,
            list: commissions || [],
          },
        });
      }
    }

    setLoading(false);
  };

  const StatCard = ({
    icon,
    label,
    value,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getLeadColor = (leadType: string, status?: string) => {
    if (status === 'closed') {
      return '#10B981';
    }
    switch (leadType) {
      case 'conversion':
        return '#10B981';
      case 'signup':
        return '#F59E0B';
      case 'click':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAnalytics} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {profile?.full_name?.split(' ')[0] || 'Affiliate'}!</Text>
        <Text style={styles.headerSubtitle}>
          {isCompany ? 'Track leads from affiliates' : "Here's your performance"}
        </Text>
      </View>

      <View style={styles.totalLeadsCard}>
        <Text style={styles.totalLeadsLabel}>TOTAL LEADS</Text>
        <Text style={styles.totalLeadsValue}>{stats.totalLeads}</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metricBadge}>
            <Text style={styles.metricValue}>↑ {stats.totalClicks}</Text>
            <Text style={styles.metricLabel}>Clicks</Text>
          </View>
          <View style={styles.metricBadge}>
            <Text style={[styles.metricValue, { color: '#F59E0B' }]}>↑ {stats.totalSignups}</Text>
            <Text style={styles.metricLabel}>Signups</Text>
          </View>
        </View>
      </View>

      <View style={styles.quickStats}>
        <View style={styles.quickStatItem}>
          <Text style={styles.quickStatLabel}>INCOME</Text>
          <View style={styles.quickStatRow}>
            <Text style={styles.quickStatValue}>
              ${(stats.commissions?.paid || 0).toFixed(2)}
            </Text>
            <Text style={[styles.quickStatChange, { color: '#10B981' }]}>Paid</Text>
          </View>
          {!isCompany && stats.commissions && stats.commissions.pending > 0 && (
            <Text style={styles.pendingText}>
              +${stats.commissions.pending.toFixed(2)} pending
            </Text>
          )}
        </View>
        <View style={styles.quickStatItem}>
          <Text style={styles.quickStatLabel}>OUTCOME</Text>
          <View style={styles.quickStatRow}>
            <Text style={styles.quickStatValue}>{stats.totalConversions}</Text>
            <Text style={[styles.quickStatChange, { color: '#10B981' }]}>Conversions</Text>
          </View>
        </View>
      </View>

      {!isCompany && stats.commissions && stats.commissions.list.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Commissions</Text>
          </View>

          <View style={styles.commissionSummary}>
            <View style={styles.commissionSummaryItem}>
              <Text style={styles.commissionSummaryValue}>
                ${stats.commissions.paid.toFixed(2)}
              </Text>
              <Text style={styles.commissionSummaryLabel}>Paid Out</Text>
            </View>
            <View style={styles.commissionSummaryItem}>
              <Text style={[styles.commissionSummaryValue, { color: '#F59E0B' }]}>
                ${stats.commissions.approved.toFixed(2)}
              </Text>
              <Text style={styles.commissionSummaryLabel}>Approved</Text>
            </View>
            <View style={styles.commissionSummaryItem}>
              <Text style={[styles.commissionSummaryValue, { color: '#3B82F6' }]}>
                ${(stats.commissions.pending - stats.commissions.approved).toFixed(2)}
              </Text>
              <Text style={styles.commissionSummaryLabel}>Pending</Text>
            </View>
          </View>

          <View style={styles.commissionsList}>
            <Text style={styles.commissionsTitle}>Recent Commissions</Text>
            {stats.commissions.list.slice(0, 5).map((commission) => (
              <View key={commission.id} style={styles.commissionItem}>
                <View style={styles.commissionMain}>
                  <View style={styles.commissionHeader}>
                    <Text style={styles.commissionCustomer}>
                      {commission.deals?.contact_submissions?.name || 'Customer'}
                    </Text>
                    <Text style={styles.commissionAmount}>
                      ${commission.affiliate_payout_amount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.commissionDetails}>
                    <Text style={styles.commissionDealValue}>
                      Deal: ${commission.deals?.deal_value.toFixed(2)}
                    </Text>
                    <View
                      style={[
                        styles.commissionStatusBadge,
                        {
                          backgroundColor:
                            commission.status === 'paid'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : commission.status === 'approved'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(59, 130, 246, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.commissionStatusText,
                          {
                            color:
                              commission.status === 'paid'
                                ? '#10B981'
                                : commission.status === 'approved'
                                ? '#F59E0B'
                                : '#3B82F6',
                          },
                        ]}
                      >
                        {commission.status}
                      </Text>
                    </View>
                  </View>
                  {commission.status !== 'paid' && (
                    <Text style={styles.commissionDate}>
                      Expected: {new Date(commission.expected_payout_date).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {!isCompany && stats.partnerships.length > 0 && (
        <View style={[styles.section, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Pipeline by Partnership</Text>
          {stats.partnerships.map((partnership) => (
            <View key={partnership.id} style={styles.partnershipCard}>
              <View style={styles.partnershipHeader}>
                <View style={styles.companyInfo}>
                  <Building2 size={18} color="#60A5FA" />
                  <Text style={styles.companyName}>{partnership.company.company_name}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        partnership.status === 'approved'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : partnership.status === 'pending'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          partnership.status === 'approved'
                            ? '#10B981'
                            : partnership.status === 'pending'
                            ? '#F59E0B'
                            : '#EF4444',
                      },
                    ]}
                  >
                    {partnership.status.charAt(0).toUpperCase() + partnership.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.pipelineStats}>
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatValue}>
                    {partnership.leads.filter((l) => l.lead_type === 'click').length}
                  </Text>
                  <Text style={styles.miniStatLabel}>Clicks</Text>
                </View>
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatValue}>
                    {partnership.leads.filter((l) => l.lead_type === 'signup').length}
                  </Text>
                  <Text style={styles.miniStatLabel}>Signups</Text>
                </View>
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatValue}>
                    {partnership.leads.filter((l) => l.lead_type === 'conversion').length}
                  </Text>
                  <Text style={styles.miniStatLabel}>Conversions</Text>
                </View>
              </View>

              {partnership.leads.length > 0 ? (
                <View style={styles.leadsList}>
                  <Text style={styles.leadsTitle}>Recent Leads</Text>
                  {partnership.leads.slice(0, 5).map((lead) => (
                    <View key={lead.id} style={styles.leadItem}>
                      <View
                        style={[
                          styles.leadIndicator,
                          { backgroundColor: getLeadColor(lead.lead_type, lead.contact_submissions?.status) },
                        ]}
                      />
                      <View style={styles.leadContent}>
                        <View style={styles.leadHeader}>
                          <Text style={styles.leadType}>
                            {lead.lead_type.charAt(0).toUpperCase() + lead.lead_type.slice(1)}
                          </Text>
                          <Text style={styles.leadTime}>{formatDate(lead.created_at)}</Text>
                        </View>
                        {lead.contact_submissions && (
                          <View style={styles.leadDetails}>
                            <Text style={styles.leadName}>{lead.contact_submissions.name}</Text>
                            <View
                              style={[
                                styles.leadStatusBadge,
                                {
                                  backgroundColor:
                                    lead.contact_submissions.status === 'closed'
                                      ? 'rgba(139, 92, 246, 0.15)'
                                      : lead.contact_submissions.status === 'qualified'
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : lead.contact_submissions.status === 'contacted'
                                      ? 'rgba(245, 158, 11, 0.15)'
                                      : 'rgba(59, 130, 246, 0.15)',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.leadStatusText,
                                  {
                                    color:
                                      lead.contact_submissions.status === 'closed'
                                        ? '#8B5CF6'
                                        : lead.contact_submissions.status === 'qualified'
                                        ? '#10B981'
                                        : lead.contact_submissions.status === 'contacted'
                                        ? '#F59E0B'
                                        : '#3B82F6',
                                  },
                                ]}
                              >
                                {lead.contact_submissions.status}
                              </Text>
                            </View>
                          </View>
                        )}
                        {lead.landing_page && (
                          <Text style={styles.leadPage}>From: {lead.landing_page.title}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                  {partnership.leads.length > 5 && (
                    <Text style={styles.moreLeads}>+ {partnership.leads.length - 5} more leads</Text>
                  )}
                </View>
              ) : (
                <View style={styles.emptyLeads}>
                  <Text style={styles.emptyLeadsText}>No leads yet</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {!isCompany && stats.partnerships.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No partnerships yet</Text>
          <Text style={styles.emptySubtext}>Request partnerships with companies to start tracking leads</Text>
        </View>
      )}

      {isCompany && stats.companyStats && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Contact Submissions</Text>
            <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push('/(tabs)/leads')}>
              <Text style={styles.viewAllText}>View All</Text>
              <ArrowRight size={16} color="#60A5FA" />
            </TouchableOpacity>
          </View>

          <View style={styles.submissionStats}>
            <View style={styles.submissionStatCard}>
              <Text style={styles.submissionStatValue}>{stats.companyStats.newLeads}</Text>
              <Text style={styles.submissionStatLabel}>New</Text>
            </View>
            <View style={styles.submissionStatCard}>
              <Text style={styles.submissionStatValue}>{stats.companyStats.contacted}</Text>
              <Text style={styles.submissionStatLabel}>Contacted</Text>
            </View>
            <View style={styles.submissionStatCard}>
              <Text style={styles.submissionStatValue}>{stats.companyStats.qualified}</Text>
              <Text style={styles.submissionStatLabel}>Qualified</Text>
            </View>
            <View style={styles.submissionStatCard}>
              <Text style={[styles.submissionStatValue, { color: '#10B981' }]}>{stats.companyStats.closed}</Text>
              <Text style={styles.submissionStatLabel}>Closed</Text>
            </View>
          </View>

          {stats.companyStats.recentSubmissions.length > 0 ? (
            <View style={styles.recentSubmissions}>
              <Text style={styles.recentTitle}>Recent Leads</Text>
              {stats.companyStats.recentSubmissions.map((submission) => (
                <TouchableOpacity
                  key={submission.id}
                  style={styles.submissionItem}
                  onPress={() => router.push('/(tabs)/leads')}
                >
                  <View style={styles.submissionIcon}>
                    <Mail size={18} color="#60A5FA" />
                  </View>
                  <View style={styles.submissionContent}>
                    <Text style={styles.submissionName}>{submission.name}</Text>
                    <Text style={styles.submissionEmail}>{submission.email}</Text>
                    {submission.company_name && (
                      <Text style={styles.submissionCompany}>{submission.company_name}</Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.submissionStatusBadge,
                      {
                        backgroundColor:
                          submission.status === 'new'
                            ? 'rgba(59, 130, 246, 0.15)'
                            : submission.status === 'contacted'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : submission.status === 'qualified'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : submission.status === 'closed'
                            ? 'rgba(139, 92, 246, 0.15)'
                            : 'rgba(107, 114, 128, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.submissionStatusText,
                        {
                          color:
                            submission.status === 'new'
                              ? '#3B82F6'
                              : submission.status === 'contacted'
                              ? '#F59E0B'
                              : submission.status === 'qualified'
                              ? '#10B981'
                              : submission.status === 'closed'
                              ? '#8B5CF6'
                              : '#6B7280',
                        },
                      ]}
                    >
                      {submission.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptySubmissions}>
              <Users size={48} color="#334155" />
              <Text style={styles.emptySubmissionsText}>No contact submissions yet</Text>
              <Text style={styles.emptySubmissionsSubtext}>
                Leads from your landing pages will appear here
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
    marginTop: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '400',
  },
  totalLeadsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  totalLeadsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 8,
  },
  totalLeadsValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricBadge: {
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickStatItem: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 8,
  },
  quickStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickStatChange: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  partnershipCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  partnershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pipelineStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  miniStatLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  leadsList: {
    marginTop: 8,
  },
  leadsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  leadItem: {
    flexDirection: 'row',
    marginBottom: 10,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  leadIndicator: {
    width: 3,
    borderRadius: 2,
    marginRight: 12,
  },
  leadContent: {
    flex: 1,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  leadType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  leadTime: {
    fontSize: 11,
    color: '#64748B',
  },
  leadPage: {
    fontSize: 12,
    color: '#94A3B8',
  },
  leadDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  leadName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  leadStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  leadStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  moreLeads: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  emptyLeads: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyLeadsText: {
    fontSize: 13,
    color: '#64748B',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#60A5FA',
  },
  submissionStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  submissionStatCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  submissionStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  submissionStatLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  recentSubmissions: {
    marginTop: 8,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  submissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  submissionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  submissionContent: {
    flex: 1,
  },
  submissionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  submissionEmail: {
    fontSize: 13,
    color: '#60A5FA',
    marginBottom: 2,
  },
  submissionCompany: {
    fontSize: 12,
    color: '#94A3B8',
  },
  submissionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  submissionStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptySubmissions: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySubmissionsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubmissionsSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  pendingText: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 4,
    fontWeight: '600',
  },
  commissionSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  commissionSummaryItem: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  commissionSummaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  commissionSummaryLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  commissionsList: {
    marginTop: 8,
  },
  commissionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  commissionItem: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  commissionMain: {
    flex: 1,
  },
  commissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commissionCustomer: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  commissionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  commissionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commissionDealValue: {
    fontSize: 13,
    color: '#94A3B8',
  },
  commissionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  commissionStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  commissionDate: {
    fontSize: 12,
    color: '#64748B',
  },
});

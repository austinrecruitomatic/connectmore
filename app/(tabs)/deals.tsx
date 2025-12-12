import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  Plus,
  X,
  Check,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';

type Deal = {
  id: string;
  deal_value: number;
  contract_type: 'one_time' | 'recurring';
  billing_frequency: string | null;
  contract_length_months: number | null;
  status: 'active' | 'cancelled' | 'completed';
  contract_start_date: string;
  contract_end_date: string | null;
  notes: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
  contact_submissions: {
    name: string;
    email: string;
  } | null;
};

type PaymentPeriod = {
  id: string;
  deal_id: string;
  period_number: number;
  expected_payment_date: string;
  payment_confirmed: boolean;
  payment_confirmed_at: string | null;
  deals: {
    deal_value: number;
    partnership_id: string;
    affiliate_id: string;
    contact_submissions: {
      name: string;
    };
    profiles: {
      full_name: string;
    };
  };
};

type CompanySettings = {
  commission_rate: number;
  platform_fee_rate: number;
  payout_frequency_days: number;
  auto_approve_commissions: boolean;
};

export default function DealsScreen() {
  const { profile } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [qualifiedLeads, setQualifiedLeads] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentPeriod[]>([]);

  const [formData, setFormData] = useState({
    contact_submission_id: '',
    partnership_id: '',
    deal_value: '',
    contract_type: 'one_time' as 'one_time' | 'recurring',
    billing_frequency: 'monthly' as 'monthly' | 'quarterly' | 'annual',
    contract_length_months: '',
    notes: '',
  });

  useEffect(() => {
    loadDeals();
    loadCompanySettings();
    loadPendingPayments();
  }, []);

  const loadPendingPayments = async () => {
    if (profile?.user_type !== 'company') return;

    try {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!companyData) return;

      const { data, error } = await supabase
        .from('deal_payment_periods')
        .select(`
          *,
          deals (
            deal_value,
            partnership_id,
            affiliate_id,
            contact_submissions (
              name
            ),
            profiles (
              full_name
            )
          )
        `)
        .eq('payment_confirmed', false)
        .lte('expected_payment_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('expected_payment_date', { ascending: true });

      if (error) throw error;
      setPendingPayments(data || []);
    } catch (error) {
      console.error('Error loading pending payments:', error);
    }
  };

  const loadCompanySettings = async () => {
    if (!profile?.id) return;

    const { data: companyData } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!companyData) return;

    setCompanyId(companyData.id);

    let { data: settingsData } = await supabase
      .from('company_settings')
      .select('*')
      .eq('company_id', companyData.id)
      .maybeSingle();

    if (!settingsData) {
      const { data: newSettings } = await supabase
        .from('company_settings')
        .insert({ company_id: companyData.id })
        .select()
        .single();
      settingsData = newSettings;
    }

    setSettings(settingsData);
  };

  const loadDeals = async () => {
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

      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          profiles!deals_affiliate_id_fkey (full_name),
          contact_submissions (name, email)
        `)
        .eq('company_id', companyData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDeals(data || []);
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQualifiedLeads = async () => {
    if (!companyId) return;

    const { data: allQualifiedLeads } = await supabase
      .from('contact_submissions')
      .select(`
        *,
        affiliate_partnerships!inner (
          id,
          affiliate_id,
          profiles (full_name)
        )
      `)
      .eq('status', 'qualified')
      .eq('affiliate_partnerships.company_id', companyId);

    if (!allQualifiedLeads) {
      setQualifiedLeads([]);
      return;
    }

    const { data: existingDeals } = await supabase
      .from('deals')
      .select('contact_submission_id')
      .eq('company_id', companyId)
      .not('contact_submission_id', 'is', null);

    const usedSubmissionIds = new Set(existingDeals?.map(d => d.contact_submission_id) || []);

    const availableLeads = allQualifiedLeads.filter(lead => !usedSubmissionIds.has(lead.id));

    setQualifiedLeads(availableLeads || []);
  };

  const calculateCommission = (dealValue: number) => {
    if (!settings) return { commission: 0, platformFee: 0, affiliatePayout: 0 };

    const commission = dealValue * (settings.commission_rate / 100);
    const platformFee = commission * (settings.platform_fee_rate / 100);
    const affiliatePayout = commission - platformFee;

    return {
      commission: Number(commission.toFixed(2)),
      platformFee: Number(platformFee.toFixed(2)),
      affiliatePayout: Number(affiliatePayout.toFixed(2)),
    };
  };

  const handleCreateDeal = async () => {
    if (!formData.deal_value || !formData.contact_submission_id || !companyId) {
      Alert.alert('Required Fields', 'Please fill in all required fields');
      return;
    }

    const selectedLead = qualifiedLeads.find(l => l.id === formData.contact_submission_id);
    if (!selectedLead?.affiliate_partnerships) {
      Alert.alert('Error', 'Invalid lead selected');
      return;
    }

    try {
      const dealValue = parseFloat(formData.deal_value);
      const { commission, platformFee, affiliatePayout } = calculateCommission(dealValue);

      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .insert({
          contact_submission_id: formData.contact_submission_id,
          partnership_id: selectedLead.affiliate_partnerships.id,
          company_id: companyId,
          affiliate_id: selectedLead.affiliate_partnerships.affiliate_id,
          deal_value: dealValue,
          contract_type: formData.contract_type,
          billing_frequency: formData.contract_type === 'recurring' ? formData.billing_frequency : null,
          contract_length_months: formData.contract_length_months ? parseInt(formData.contract_length_months) : null,
          notes: formData.notes,
        })
        .select()
        .single();

      if (dealError) throw dealError;

      if (formData.contract_type === 'recurring' && formData.contract_length_months) {
        const periods = parseInt(formData.contract_length_months);
        const paymentPeriods = [];
        const startDate = new Date();

        for (let i = 1; i <= periods; i++) {
          const expectedDate = new Date(startDate);
          if (formData.billing_frequency === 'monthly') {
            expectedDate.setMonth(expectedDate.getMonth() + i);
          } else if (formData.billing_frequency === 'quarterly') {
            expectedDate.setMonth(expectedDate.getMonth() + (i * 3));
          } else if (formData.billing_frequency === 'annual') {
            expectedDate.setMonth(expectedDate.getMonth() + (i * 12));
          }

          paymentPeriods.push({
            deal_id: dealData.id,
            period_number: i,
            expected_payment_date: expectedDate.toISOString().split('T')[0],
            payment_confirmed: false,
          });
        }

        const { error: periodsError } = await supabase
          .from('deal_payment_periods')
          .insert(paymentPeriods);

        if (periodsError) throw periodsError;
      } else {
        const expectedPayoutDate = new Date();
        expectedPayoutDate.setDate(expectedPayoutDate.getDate() + (settings?.payout_frequency_days || 30));

        const { error: commissionError } = await supabase
          .from('commissions')
          .insert({
            deal_id: dealData.id,
            partnership_id: selectedLead.affiliate_partnerships.id,
            affiliate_id: selectedLead.affiliate_partnerships.affiliate_id,
            company_id: companyId,
            commission_amount: commission,
            platform_fee_amount: platformFee,
            affiliate_payout_amount: affiliatePayout,
            commission_type: 'initial',
            status: settings?.auto_approve_commissions ? 'approved' : 'pending',
            expected_payout_date: expectedPayoutDate.toISOString().split('T')[0],
          });

        if (commissionError) throw commissionError;
      }

      const { error: updateError } = await supabase
        .from('contact_submissions')
        .update({ status: 'closed' })
        .eq('id', formData.contact_submission_id);

      if (updateError) throw updateError;

      Alert.alert('Success', 'Deal created successfully!');
      setShowCreateModal(false);
      setFormData({
        contact_submission_id: '',
        partnership_id: '',
        deal_value: '',
        contract_type: 'one_time',
        billing_frequency: 'monthly',
        contract_length_months: '',
        notes: '',
      });
      loadDeals();
      loadPendingPayments();
    } catch (error: any) {
      console.error('Error creating deal:', error);
      Alert.alert('Error', error.message || 'Failed to create deal');
    }
  };

  const handleConfirmPayment = async (periodId: string, dealId: string, periodNumber: number, partnershipId: string, affiliateId: string, dealValue: number) => {
    try {
      if (!settings || !companyId) return;

      const commission = dealValue * (settings.commission_rate / 100);
      const platformFee = commission * (settings.platform_fee_rate / 100);
      const affiliatePayout = commission - platformFee;

      const expectedPayoutDate = new Date();
      expectedPayoutDate.setDate(expectedPayoutDate.getDate() + (settings.payout_frequency_days || 30));

      const { data: commissionData, error: commissionError } = await supabase
        .from('commissions')
        .insert({
          deal_id: dealId,
          partnership_id: partnershipId,
          affiliate_id: affiliateId,
          company_id: companyId,
          commission_amount: commission,
          platform_fee_amount: platformFee,
          affiliate_payout_amount: affiliatePayout,
          commission_type: 'recurring',
          status: settings.auto_approve_commissions ? 'approved' : 'pending',
          expected_payout_date: expectedPayoutDate.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (commissionError) throw commissionError;

      const { error: updateError } = await supabase
        .from('deal_payment_periods')
        .update({
          payment_confirmed: true,
          payment_confirmed_at: new Date().toISOString(),
          payment_confirmed_by: profile?.id,
          commission_id: commissionData.id,
        })
        .eq('id', periodId);

      if (updateError) throw updateError;

      Alert.alert('Success', `Payment ${periodNumber} confirmed and commission generated!`);
      loadPendingPayments();
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      Alert.alert('Error', error.message || 'Failed to confirm payment');
    }
  };

  const openCreateModal = async () => {
    await loadQualifiedLeads();
    setShowCreateModal(true);
  };

  const handleUpdateDealStatus = async (dealId: string, newStatus: Deal['status']) => {
    try {
      const { error } = await supabase
        .from('deals')
        .update({ status: newStatus })
        .eq('id', dealId);

      if (error) throw error;

      Alert.alert('Success', `Deal marked as ${newStatus}`);
      loadDeals();
    } catch (error: any) {
      console.error('Error updating deal:', error);
      Alert.alert('Error', error.message || 'Failed to update deal');
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      case 'completed':
        return '#3B82F6';
      default:
        return '#64748B';
    }
  };

  const totalActiveDeals = deals.filter(d => d.status === 'active').length;
  const totalRevenue = deals.reduce((sum, d) => sum + d.deal_value, 0);

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
          <Text style={styles.title}>Deals</Text>
          <Text style={styles.subtitle}>{totalActiveDeals} active deals</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <DollarSign size={24} color="#10B981" />
          <Text style={styles.statValue}>{formatCurrency(totalRevenue)}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
        <View style={styles.statCard}>
          <TrendingUp size={24} color="#3B82F6" />
          <Text style={styles.statValue}>{totalActiveDeals}</Text>
          <Text style={styles.statLabel}>Active Deals</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { loadDeals(); loadPendingPayments(); }} />}
      >
        {pendingPayments.length > 0 && (
          <View style={styles.paymentsSection}>
            <Text style={styles.sectionTitle}>Pending Payment Confirmations</Text>
            <Text style={styles.sectionSubtitle}>
              Confirm client payments to generate affiliate commissions
            </Text>
            {pendingPayments.map((payment) => (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentClient}>
                      {(payment.deals.contact_submissions as any)?.name || 'Client'}
                    </Text>
                    <Text style={styles.paymentAffiliate}>
                      via {(payment.deals.profiles as any)?.full_name || 'Affiliate'}
                    </Text>
                  </View>
                  <View style={styles.paymentBadge}>
                    <Text style={styles.paymentPeriod}>Period {payment.period_number}</Text>
                  </View>
                </View>
                <View style={styles.paymentDetails}>
                  <View style={styles.paymentDetailRow}>
                    <DollarSign size={16} color="#60A5FA" />
                    <Text style={styles.paymentAmount}>
                      {formatCurrency(Number(payment.deals.deal_value))}
                    </Text>
                  </View>
                  <View style={styles.paymentDetailRow}>
                    <Calendar size={16} color="#94A3B8" />
                    <Text style={styles.paymentDate}>
                      Due: {new Date(payment.expected_payment_date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => handleConfirmPayment(
                    payment.id,
                    payment.deal_id,
                    payment.period_number,
                    payment.deals.partnership_id,
                    payment.deals.affiliate_id,
                    Number(payment.deals.deal_value)
                  )}
                >
                  <CheckCircle size={18} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Confirm Payment Received</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {deals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No deals yet</Text>
            <Text style={styles.emptySubtext}>
              Create deals from qualified leads to start tracking commissions
            </Text>
          </View>
        ) : (
          deals.map((deal) => (
            <View key={deal.id} style={styles.dealCard}>
              <View style={styles.dealHeader}>
                <View style={styles.dealInfo}>
                  <Text style={styles.dealCustomer}>
                    {deal.contact_submissions?.name || 'Customer'}
                  </Text>
                  <Text style={styles.dealAffiliate}>
                    via {deal.profiles?.full_name || 'Affiliate'}
                  </Text>
                </View>
                <View
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(deal.status) + '20' }]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(deal.status) }]}>
                    {deal.status}
                  </Text>
                </View>
              </View>

              <View style={styles.dealDetails}>
                <View style={styles.detailRow}>
                  <DollarSign size={16} color="#94A3B8" />
                  <Text style={styles.detailText}>{formatCurrency(Number(deal.deal_value))}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Calendar size={16} color="#94A3B8" />
                  <Text style={styles.detailText}>
                    {deal.contract_type === 'recurring'
                      ? `${deal.billing_frequency || 'monthly'} recurring${deal.contract_length_months ? ` (${deal.contract_length_months}mo)` : ''}`
                      : 'One-time'}
                  </Text>
                </View>
              </View>

              {deal.notes && (
                <Text style={styles.dealNotes} numberOfLines={2}>
                  {deal.notes}
                </Text>
              )}

              <Text style={styles.dealDate}>Created {formatDate(deal.created_at)}</Text>

              {deal.status === 'active' && (
                <View style={styles.dealActions}>
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => handleUpdateDealStatus(deal.id, 'completed')}
                  >
                    <CheckCircle size={16} color="#10B981" />
                    <Text style={styles.completeButtonText}>Complete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleUpdateDealStatus(deal.id, 'cancelled')}
                  >
                    <XCircle size={16} color="#EF4444" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Deal</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Select Qualified Lead</Text>
              {qualifiedLeads.map((lead) => (
                <TouchableOpacity
                  key={lead.id}
                  style={[
                    styles.leadOption,
                    formData.contact_submission_id === lead.id && styles.leadOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, contact_submission_id: lead.id })}
                >
                  <View style={styles.leadInfo}>
                    <Text style={styles.leadName}>{lead.name}</Text>
                    <Text style={styles.leadEmail}>{lead.email}</Text>
                    <Text style={styles.leadAffiliate}>
                      via {lead.affiliate_partnerships?.profiles?.full_name}
                    </Text>
                  </View>
                  {formData.contact_submission_id === lead.id && (
                    <Check size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}

              {qualifiedLeads.length === 0 && (
                <Text style={styles.noLeadsText}>
                  No qualified leads available. Mark leads as qualified first.
                </Text>
              )}

              <Text style={styles.label}>Deal Value</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#64748B"
                keyboardType="decimal-pad"
                value={formData.deal_value}
                onChangeText={(value) => setFormData({ ...formData, deal_value: value })}
              />

              {formData.deal_value && settings && (
                <View style={styles.commissionPreview}>
                  <Text style={styles.previewTitle}>Commission Breakdown</Text>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Commission ({settings.commission_rate}%)</Text>
                    <Text style={styles.previewValue}>
                      {formatCurrency(calculateCommission(parseFloat(formData.deal_value || '0')).commission)}
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Platform Fee ({settings.platform_fee_rate}%)</Text>
                    <Text style={styles.previewValue}>
                      -{formatCurrency(calculateCommission(parseFloat(formData.deal_value || '0')).platformFee)}
                    </Text>
                  </View>
                  <View style={[styles.previewRow, styles.previewTotal]}>
                    <Text style={styles.previewTotalLabel}>Affiliate Payout</Text>
                    <Text style={styles.previewTotalValue}>
                      {formatCurrency(calculateCommission(parseFloat(formData.deal_value || '0')).affiliatePayout)}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.label}>Contract Type</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.contract_type === 'one_time' && styles.typeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, contract_type: 'one_time' })}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.contract_type === 'one_time' && styles.typeButtonTextActive,
                    ]}
                  >
                    One-time
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.contract_type === 'recurring' && styles.typeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, contract_type: 'recurring' })}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.contract_type === 'recurring' && styles.typeButtonTextActive,
                    ]}
                  >
                    Recurring
                  </Text>
                </TouchableOpacity>
              </View>

              {formData.contract_type === 'recurring' && (
                <>
                  <Text style={styles.label}>Billing Frequency</Text>
                  <View style={styles.typeButtons}>
                    {['monthly', 'quarterly', 'annual'].map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        style={[
                          styles.freqButton,
                          formData.billing_frequency === freq && styles.typeButtonActive,
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, billing_frequency: freq as any })
                        }
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            formData.billing_frequency === freq && styles.typeButtonTextActive,
                          ]}
                        >
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Contract Length (months)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 3, 6, 12 (leave empty for ongoing)"
                    placeholderTextColor="#64748B"
                    keyboardType="number-pad"
                    value={formData.contract_length_months}
                    onChangeText={(value) => setFormData({ ...formData, contract_length_months: value })}
                  />
                  <Text style={styles.helperText}>
                    Affiliates will earn commission for each billing period during the contract length
                  </Text>
                </>
              )}

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Add any additional details..."
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={4}
                value={formData.notes}
                onChangeText={(value) => setFormData({ ...formData, notes: value })}
              />

              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateDeal}
              >
                <Text style={styles.createButtonText}>Create Deal</Text>
              </TouchableOpacity>
            </ScrollView>
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dealCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dealInfo: {
    flex: 1,
  },
  dealCustomer: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  dealAffiliate: {
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
  dealDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  dealNotes: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
    lineHeight: 20,
  },
  dealDate: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  dealActions: {
    flexDirection: 'row',
    gap: 8,
  },
  completeButton: {
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
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  cancelButton: {
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
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 16,
  },
  leadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#334155',
  },
  leadOptionActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E293B',
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  leadEmail: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 2,
  },
  leadAffiliate: {
    fontSize: 12,
    color: '#64748B',
  },
  noLeadsText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    padding: 20,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
  },
  commissionPreview: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  previewValue: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  previewTotal: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    marginTop: 4,
  },
  previewTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  previewTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E293B',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  typeButtonTextActive: {
    color: '#3B82F6',
  },
  freqButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
  },
  textArea: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
    height: 100,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    fontStyle: 'italic',
  },
  paymentsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  paymentCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentClient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  paymentAffiliate: {
    fontSize: 13,
    color: '#94A3B8',
  },
  paymentBadge: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  paymentPeriod: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  paymentDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#60A5FA',
  },
  paymentDate: {
    fontSize: 13,
    color: '#94A3B8',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

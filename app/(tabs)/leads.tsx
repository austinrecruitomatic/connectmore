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
  Linking,
  Platform,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import {
  Mail,
  Phone,
  Building2,
  MessageSquare,
  X,
  ExternalLink,
  Filter,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Users as UsersIcon,
} from 'lucide-react-native';

type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  message: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'not_interested' | 'closed';
  notes: string | null;
  affiliate_notes: string | null;
  contract_value: number | null;
  contract_type: 'monthly' | 'total';
  contract_length_months: number | null;
  product_id: string | null;
  created_at: string;
  landing_page_slug: string;
  affiliate_partnerships: {
    affiliate_id?: string;
    company_id?: string;
    profiles?: {
      full_name: string;
    };
    companies?: {
      company_name: string;
    };
  };
};

export default function LeadsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [activeView, setActiveView] = useState<'leads' | 'deals'>('leads');
  const [leads, setLeads] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<ContactSubmission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [affiliateNotes, setAffiliateNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [contractValue, setContractValue] = useState('');
  const [contractType, setContractType] = useState<'monthly' | 'total'>('total');
  const [contractLength, setContractLength] = useState('');
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadLeads();
  }, [statusFilter]);

  const loadLeads = async () => {
    if (!profile) return;

    setLoading(true);

    try {
      if (profile.user_type === 'company') {
        // Load leads for companies
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (!companyData) {
          setLoading(false);
          return;
        }

        const { data: partnerships } = await supabase
          .from('affiliate_partnerships')
          .select('id')
          .eq('company_id', companyData.id);

        if (!partnerships || partnerships.length === 0) {
          setLeads([]);
          setLoading(false);
          return;
        }

        const partnershipIds = partnerships.map(p => p.id);

        let query = supabase
          .from('contact_submissions')
          .select(
            `
            *,
            affiliate_partnerships (
              affiliate_id,
              profiles (
                full_name
              )
            )
          `
          )
          .in('partnership_id', partnershipIds)
          .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;

        if (error) throw error;

        setLeads(data || []);
      } else if (profile.user_type === 'affiliate') {
        // Load leads for affiliates
        const { data: partnerships } = await supabase
          .from('affiliate_partnerships')
          .select('id')
          .eq('affiliate_id', profile.id);

        if (!partnerships || partnerships.length === 0) {
          setLeads([]);
          setLoading(false);
          return;
        }

        const partnershipIds = partnerships.map(p => p.id);

        let query = supabase
          .from('contact_submissions')
          .select(
            `
            *,
            affiliate_partnerships (
              company_id,
              companies (
                company_name
              )
            )
          `
          )
          .in('partnership_id', partnershipIds)
          .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;

        if (error) throw error;

        setLeads(data || []);
      }
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadClick = (lead: ContactSubmission) => {
    setSelectedLead(lead);
    setNotes(lead.notes || '');
    setAffiliateNotes(lead.affiliate_notes || '');
    setContractValue(lead.contract_value?.toString() || '');
    setContractType(lead.contract_type || 'total');
    setContractLength(lead.contract_length_months?.toString() || '');
    setSaveMessage(null);
    setShowDetailModal(true);
  };

  const handleUpdateStatus = async (newStatus: ContactSubmission['status']) => {
    if (!selectedLead) return;

    if (newStatus === 'closed' && !selectedLead.contract_value) {
      setSaveMessage({ type: 'error', text: 'Please set a contract value before closing' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    try {
      const updateData: any = { status: newStatus };

      if (newStatus === 'contacted' && selectedLead.status === 'new') {
        updateData.responded_at = new Date().toISOString();
        updateData.responded_by = profile?.id;
      }

      const { error } = await supabase
        .from('contact_submissions')
        .update(updateData)
        .eq('id', selectedLead.id);

      if (error) throw error;

      if (newStatus === 'closed') {
        await createDealFromLead(selectedLead);
      }

      setSelectedLead({ ...selectedLead, ...updateData });
      loadLeads();
      setSaveMessage({ type: 'success', text: newStatus === 'closed' ? 'Deal created successfully!' : 'Status updated successfully' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error updating status:', error);
      setSaveMessage({ type: 'error', text: 'Failed to update status' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const createDealFromLead = async (lead: ContactSubmission) => {
    const { data: companyData } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', profile?.id)
      .maybeSingle();

    if (!companyData) throw new Error('Company not found');

    const { data: partnershipData } = await supabase
      .from('affiliate_partnerships')
      .select('id, company_id, product_id, affiliate_id')
      .eq('affiliate_id', lead.affiliate_partnerships.affiliate_id)
      .eq('company_id', companyData.id)
      .maybeSingle();

    if (!partnershipData) throw new Error('Partnership not found');

    const { data: productData } = await supabase
      .from('products')
      .select('commission_rate')
      .eq('id', lead.product_id || partnershipData.product_id)
      .maybeSingle();

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

    const dealValue = lead.contract_value || 0;
    const commissionRate = productData?.commission_rate || settingsData.commission_rate || 10;
    const commission = dealValue * (commissionRate / 100);
    const platformFee = commission * ((settingsData.platform_fee_rate || 5) / 100);
    const affiliatePayout = commission - platformFee;

    const contractTypeMapping: { [key: string]: 'one_time' | 'recurring' } = {
      total: 'one_time',
      monthly: 'recurring',
    };

    const { data: dealData, error: dealError } = await supabase
      .from('deals')
      .insert({
        contact_submission_id: lead.id,
        partnership_id: partnershipData.id,
        company_id: companyData.id,
        affiliate_id: partnershipData.affiliate_id,
        product_id: lead.product_id || partnershipData.product_id,
        deal_value: dealValue,
        contract_type: contractTypeMapping[lead.contract_type] || 'one_time',
        billing_frequency: lead.contract_type === 'monthly' ? 'monthly' : null,
        contract_length_months: lead.contract_length_months,
        notes: lead.notes || '',
      })
      .select()
      .single();

    if (dealError) throw dealError;

    if (lead.contract_type === 'monthly' && lead.contract_length_months) {
      const periods = lead.contract_length_months;
      const paymentPeriods = [];
      const startDate = new Date();

      for (let i = 1; i <= periods; i++) {
        const expectedDate = new Date(startDate);
        expectedDate.setMonth(expectedDate.getMonth() + i);

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
      expectedPayoutDate.setDate(expectedPayoutDate.getDate() + (settingsData.payout_frequency_days || 30));

      const { error: commissionError } = await supabase
        .from('commissions')
        .insert({
          deal_id: dealData.id,
          partnership_id: partnershipData.id,
          affiliate_id: partnershipData.affiliate_id,
          company_id: companyData.id,
          commission_amount: commission,
          platform_fee_amount: platformFee,
          affiliate_payout_amount: affiliatePayout,
          commission_type: 'initial',
          status: settingsData.auto_approve_commissions ? 'approved' : 'pending',
          expected_payout_date: expectedPayoutDate.toISOString().split('T')[0],
        });

      if (commissionError) throw commissionError;
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedLead) return;

    setSavingNotes(true);

    try {
      const updateData: any = { notes };

      if (contractValue) {
        updateData.contract_value = parseFloat(contractValue);
        updateData.contract_type = contractType;
        updateData.contract_length_months = contractLength ? parseInt(contractLength) : null;
      } else {
        updateData.contract_value = null;
        updateData.contract_length_months = null;
      }

      const { error } = await supabase
        .from('contact_submissions')
        .update(updateData)
        .eq('id', selectedLead.id);

      if (error) throw error;

      setSelectedLead({ ...selectedLead, ...updateData });
      loadLeads();
      setSaveMessage({ type: 'success', text: 'Details saved successfully' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving details:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save details' });
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveAffiliateNotes = async () => {
    if (!selectedLead) return;

    setSavingNotes(true);

    try {
      const updateData: any = { affiliate_notes: affiliateNotes };

      const { error } = await supabase
        .from('contact_submissions')
        .update(updateData)
        .eq('id', selectedLead.id);

      if (error) throw error;

      setSelectedLead({ ...selectedLead, ...updateData });
      loadLeads();
      setSaveMessage({ type: 'success', text: 'Notes saved successfully' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving affiliate notes:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save notes' });
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleEmailClick = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handlePhoneClick = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return '#3B82F6';
      case 'contacted':
        return '#F59E0B';
      case 'qualified':
        return '#10B981';
      case 'closed':
        return '#8B5CF6';
      case 'not_interested':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const statusOptions: ContactSubmission['status'][] = [
    'new',
    'contacted',
    'qualified',
    'not_interested',
    'closed',
  ];

  const filterOptions = [
    { label: 'All Leads', value: 'all' },
    { label: 'New', value: 'new' },
    { label: 'Contacted', value: 'contacted' },
    { label: 'Qualified', value: 'qualified' },
    { label: 'Not Interested', value: 'not_interested' },
    { label: 'Closed', value: 'closed' },
  ];

  const getStatusCount = (status: string) => {
    if (status === 'all') return leads.length;
    return leads.filter((l) => l.status === status).length;
  };

  const isCompany = profile?.user_type === 'company';
  const isAffiliate = profile?.user_type === 'affiliate';

  const getUniquePages = () => {
    const pages = new Set(leads.map(l => l.landing_page_slug));
    return pages.size;
  };

  const getLeadsByPage = () => {
    const pageMap: { [key: string]: number } = {};
    leads.forEach(lead => {
      pageMap[lead.landing_page_slug] = (pageMap[lead.landing_page_slug] || 0) + 1;
    });
    return Object.entries(pageMap).sort((a, b) => b[1] - a[1]);
  };

  return (
    <View style={styles.container}>
      {/* Tab Switcher - only show for companies */}
      {isCompany && (
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tab, activeView === 'leads' && styles.activeTab]}
            onPress={() => setActiveView('leads')}
          >
            <UsersIcon size={18} color={activeView === 'leads' ? '#60A5FA' : '#64748B'} />
            <Text style={[styles.tabText, activeView === 'leads' && styles.activeTabText]}>
              Leads
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeView === 'deals' && styles.activeTab]}
            onPress={() => {
              setActiveView('deals');
              router.push('/(tabs)/deals');
            }}
          >
            <CheckCircle size={18} color={activeView === 'deals' ? '#60A5FA' : '#64748B'} />
            <Text style={[styles.tabText, activeView === 'deals' && styles.activeTabText]}>
              Deals
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{isAffiliate ? 'My Leads' : 'Leads'}</Text>
          <Text style={styles.subtitle}>{leads.length} total {isAffiliate ? 'leads submitted' : 'contact submissions'}</Text>
        </View>
        <View style={styles.headerButtons}>
          {isAffiliate && (
            <TouchableOpacity
              style={styles.networkButton}
              onPress={() => router.push('/my-network')}
            >
              <UsersIcon size={20} color="#60A5FA" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Filter size={20} color="#60A5FA" />
          </TouchableOpacity>
        </View>
      </View>

      {isAffiliate && leads.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <ExternalLink size={20} color="#60A5FA" />
              <Text style={styles.statValue}>{getUniquePages()}</Text>
              <Text style={styles.statLabel}>Active Pages</Text>
            </View>
            <View style={styles.statCard}>
              <UsersIcon size={20} color="#10B981" />
              <Text style={styles.statValue}>{leads.length}</Text>
              <Text style={styles.statLabel}>Total Leads</Text>
            </View>
            <View style={styles.statCard}>
              <CheckCircle size={20} color="#8B5CF6" />
              <Text style={styles.statValue}>{getStatusCount('closed')}</Text>
              <Text style={styles.statLabel}>Closed Deals</Text>
            </View>
          </View>
          {getLeadsByPage().length > 0 && (
            <View style={styles.topPagesCard}>
              <Text style={styles.topPagesTitle}>Top Performing Pages</Text>
              {getLeadsByPage().slice(0, 3).map(([slug, count]) => (
                <View key={slug} style={styles.pageRow}>
                  <Text style={styles.pageSlug} numberOfLines={1}>{slug}</Text>
                  <View style={styles.pageCount}>
                    <Text style={styles.pageCountText}>{count}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLeads} />}
      >
        {leads.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No leads yet</Text>
            <Text style={styles.emptySubtext}>
              Contact submissions from your landing pages will appear here
            </Text>
          </View>
        ) : (
          leads.map((lead) => (
            <TouchableOpacity
              key={lead.id}
              style={styles.leadCard}
              onPress={() => handleLeadClick(lead)}
            >
              <View style={styles.leadHeader}>
                <View style={styles.leadInfo}>
                  <Text style={styles.leadName}>{lead.name}</Text>
                  {lead.company_name && (
                    <View style={styles.companyBadge}>
                      <Building2 size={12} color="#64748B" />
                      <Text style={styles.companyBadgeText}>{lead.company_name}</Text>
                    </View>
                  )}
                </View>
                <View
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) + '20' }]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(lead.status) }]}>
                    {lead.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <Text style={styles.leadEmail}>{lead.email}</Text>
              {lead.phone && <Text style={styles.leadPhone}>{lead.phone}</Text>}

              {lead.message && (
                <Text style={styles.leadMessage} numberOfLines={2}>
                  {lead.message}
                </Text>
              )}

              <View style={styles.leadFooter}>
                <Text style={styles.leadDate}>{formatDate(lead.created_at)}</Text>
                <Text style={styles.leadSource}>
                  {isAffiliate
                    ? `for ${lead.affiliate_partnerships?.companies?.company_name || 'Company'}`
                    : `via ${lead.affiliate_partnerships?.profiles?.full_name || 'Affiliate'}`
                  }
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lead Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {selectedLead && (
              <ScrollView style={styles.detailContent}>
                {saveMessage && (
                  <View style={[
                    styles.saveMessage,
                    saveMessage.type === 'success' ? styles.saveMessageSuccess : styles.saveMessageError
                  ]}>
                    <Text style={styles.saveMessageText}>{saveMessage.text}</Text>
                  </View>
                )}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Contact Information</Text>
                  <View style={styles.contactCard}>
                    <Text style={styles.contactName}>{selectedLead.name}</Text>

                    <TouchableOpacity
                      style={styles.contactRow}
                      onPress={() => handleEmailClick(selectedLead.email)}
                    >
                      <Mail size={18} color="#60A5FA" />
                      <Text style={styles.contactLink}>{selectedLead.email}</Text>
                      <ExternalLink size={14} color="#60A5FA" />
                    </TouchableOpacity>

                    {selectedLead.phone && (
                      <TouchableOpacity
                        style={styles.contactRow}
                        onPress={() => handlePhoneClick(selectedLead.phone!)}
                      >
                        <Phone size={18} color="#60A5FA" />
                        <Text style={styles.contactLink}>{selectedLead.phone}</Text>
                        <ExternalLink size={14} color="#60A5FA" />
                      </TouchableOpacity>
                    )}

                    {selectedLead.company_name && (
                      <View style={styles.contactRow}>
                        <Building2 size={18} color="#64748B" />
                        <Text style={styles.contactText}>{selectedLead.company_name}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {selectedLead.message && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Message</Text>
                    <View style={styles.messageCard}>
                      <MessageSquare size={18} color="#64748B" />
                      <Text style={styles.messageText}>{selectedLead.message}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  {isCompany ? (
                    <View style={styles.statusGrid}>
                      {statusOptions.map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusOption,
                            selectedLead.status === status && styles.statusOptionActive,
                            { borderColor: getStatusColor(status) },
                          ]}
                          onPress={() => handleUpdateStatus(status)}
                        >
                          {selectedLead.status === status && (
                            <CheckCircle size={16} color={getStatusColor(status)} />
                          )}
                          <Text
                            style={[
                              styles.statusOptionText,
                              selectedLead.status === status && { color: getStatusColor(status) },
                            ]}
                          >
                            {status.replace('_', ' ')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View
                      style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedLead.status) + '20' }]}
                    >
                      <Text style={[styles.statusText, { color: getStatusColor(selectedLead.status) }]}>
                        {selectedLead.status.replace('_', ' ')}
                      </Text>
                    </View>
                  )}
                </View>

                {isCompany && (
                  <>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Contract Value</Text>
                      <View style={styles.contractCard}>
                        <View style={styles.contractInputRow}>
                          <DollarSign size={18} color="#60A5FA" />
                          <TextInput
                            style={styles.contractInput}
                            value={contractValue}
                            onChangeText={setContractValue}
                            placeholder="Enter value"
                            placeholderTextColor="#64748B"
                            keyboardType="decimal-pad"
                          />
                        </View>
                        <View style={styles.contractTypeRow}>
                          <TouchableOpacity
                            style={[
                              styles.contractTypeOption,
                              contractType === 'total' && styles.contractTypeOptionActive,
                            ]}
                            onPress={() => setContractType('total')}
                          >
                            <Text
                              style={[
                                styles.contractTypeText,
                                contractType === 'total' && styles.contractTypeTextActive,
                              ]}
                            >
                              Total
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.contractTypeOption,
                              contractType === 'monthly' && styles.contractTypeOptionActive,
                            ]}
                            onPress={() => setContractType('monthly')}
                          >
                            <Text
                              style={[
                                styles.contractTypeText,
                                contractType === 'monthly' && styles.contractTypeTextActive,
                              ]}
                            >
                              Monthly
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {contractType === 'monthly' && (
                          <View style={styles.contractLengthRow}>
                            <Text style={styles.contractLengthLabel}>Contract Length (months)</Text>
                            <TextInput
                              style={styles.contractLengthInput}
                              value={contractLength}
                              onChangeText={setContractLength}
                              placeholder="e.g., 3, 6, 12"
                              placeholderTextColor="#64748B"
                              keyboardType="number-pad"
                            />
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Internal Notes</Text>
                      <TextInput
                        style={styles.notesInput}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Add notes about this lead..."
                        placeholderTextColor="#64748B"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                      <TouchableOpacity
                        style={[styles.saveNotesButton, savingNotes && styles.saveNotesButtonDisabled]}
                        onPress={handleSaveNotes}
                        disabled={savingNotes}
                      >
                        <Text style={styles.saveNotesButtonText}>
                          {savingNotes ? 'Saving...' : 'Save Details'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {selectedLead.contract_value && isAffiliate && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Deal Information</Text>
                    <View style={styles.sourceCard}>
                      <Text style={styles.sourceText}>
                        Contract Value: ${selectedLead.contract_value}
                        {selectedLead.contract_type === 'monthly' && ' /month'}
                      </Text>
                      {selectedLead.contract_length_months && (
                        <Text style={styles.sourceText}>
                          Contract Length: {selectedLead.contract_length_months} months
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {isAffiliate && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>My Follow-up Notes</Text>
                    <Text style={styles.helperText}>Track your conversations with the company about this lead</Text>
                    <TextInput
                      style={styles.notesInput}
                      value={affiliateNotes}
                      onChangeText={setAffiliateNotes}
                      placeholder="Add notes about follow-ups, deal progress, conversations with the company..."
                      placeholderTextColor="#64748B"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                    <TouchableOpacity
                      style={[styles.saveNotesButton, savingNotes && styles.saveNotesButtonDisabled]}
                      onPress={handleSaveAffiliateNotes}
                      disabled={savingNotes}
                    >
                      <Text style={styles.saveNotesButtonText}>
                        {savingNotes ? 'Saving...' : 'Save Notes'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isCompany && selectedLead.affiliate_notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Affiliate Notes</Text>
                    <View style={styles.sourceCard}>
                      <Text style={styles.sourceText}>{selectedLead.affiliate_notes}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{isAffiliate ? 'Lead Information' : 'Lead Source'}</Text>
                  <View style={styles.sourceCard}>
                    {isCompany && (
                      <Text style={styles.sourceText}>
                        Referred by: {selectedLead.affiliate_partnerships?.profiles?.full_name || 'Affiliate'}
                      </Text>
                    )}
                    {isAffiliate && (
                      <Text style={styles.sourceText}>
                        Company: {selectedLead.affiliate_partnerships?.companies?.company_name || 'Company'}
                      </Text>
                    )}
                    <Text style={styles.sourceText}>
                      Page: {selectedLead.landing_page_slug}
                    </Text>
                    <Text style={styles.sourceDate}>
                      Submitted: {formatDate(selectedLead.created_at)}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showFilterModal} animationType="fade" transparent>
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter Leads</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterOption,
                  statusFilter === option.value && styles.filterOptionActive,
                ]}
                onPress={() => {
                  setStatusFilter(option.value);
                  setShowFilterModal(false);
                }}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    statusFilter === option.value && styles.filterOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={styles.filterCount}>
                  {option.value === 'all' ? leads.length : getStatusCount(option.value)}
                </Text>
              </TouchableOpacity>
            ))}
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
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#1E40AF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  topPagesCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topPagesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  pageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  pageSlug: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    marginRight: 12,
  },
  pageCount: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  pageCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  networkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  leadCard: {
    backgroundColor: '#1E293B',
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
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  companyBadgeText: {
    fontSize: 13,
    color: '#64748B',
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
  leadEmail: {
    fontSize: 14,
    color: '#60A5FA',
    marginBottom: 4,
  },
  leadPhone: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  leadMessage: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 12,
  },
  leadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  leadDate: {
    fontSize: 12,
    color: '#64748B',
  },
  leadSource: {
    fontSize: 12,
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
  detailContent: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  helperText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 18,
  },
  contactCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contactName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  contactLink: {
    flex: 1,
    fontSize: 15,
    color: '#60A5FA',
  },
  contactText: {
    flex: 1,
    fontSize: 15,
    color: '#94A3B8',
  },
  messageCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  messageText: {
    flex: 1,
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 22,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#0F172A',
  },
  statusOptionActive: {
    backgroundColor: '#1E293B',
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'capitalize',
  },
  notesInput: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
    height: 100,
    marginBottom: 12,
  },
  saveNotesButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveNotesButtonDisabled: {
    opacity: 0.6,
  },
  saveNotesButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  sourceCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sourceText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 6,
  },
  sourceDate: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterModalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  filterOptionActive: {
    backgroundColor: '#0F172A',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterCount: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  contractCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contractInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  contractInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    padding: 0,
  },
  contractTypeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  contractTypeOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  contractTypeOptionActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  contractTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  contractTypeTextActive: {
    color: '#FFFFFF',
  },
  contractLengthRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  contractLengthLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  contractLengthInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
  },
  saveMessage: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  saveMessageSuccess: {
    backgroundColor: '#10B98120',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  saveMessageError: {
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  saveMessageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { FileText, Search, Download, Eye, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import BackButton from '@/components/BackButton';

type AffiliateW9 = {
  id: string;
  full_name: string;
  email: string;
  w9_completed: boolean;
  w9_submitted_at: string | null;
  w9_legal_name: string | null;
  w9_business_name: string | null;
  tax_id_type: string | null;
  tax_id_last4: string | null;
  business_entity_type: string | null;
  w9_address_line1: string | null;
  w9_address_line2: string | null;
  w9_city: string | null;
  w9_state: string | null;
  w9_zip: string | null;
  w9_exempt_payee_code: string | null;
  w9_fatca_exemption: string | null;
  venmo_username: string | null;
  payment_method: string | null;
};

const BUSINESS_ENTITY_LABELS: Record<string, string> = {
  individual_sole_proprietor: 'Individual/Sole Proprietor',
  c_corporation: 'C Corporation',
  s_corporation: 'S Corporation',
  partnership: 'Partnership',
  trust_estate: 'Trust/Estate',
  llc_c: 'LLC (C Corp)',
  llc_s: 'LLC (S Corp)',
  llc_p: 'LLC (Partnership)',
  other: 'Other',
};

const TAX_ID_TYPE_LABELS: Record<string, string> = {
  ssn: 'SSN',
  ein: 'EIN',
  itin: 'ITIN',
};

export default function W9TaxFormsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState<AffiliateW9[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateW9 | null>(null);

  useEffect(() => {
    if (profile?.is_super_admin) {
      loadAffiliates();
    } else {
      router.back();
    }
  }, [profile]);

  const loadAffiliates = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'affiliate')
        .order('w9_submitted_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      setAffiliates(data || []);

      await supabase.rpc('log_w9_access', {
        p_profile_id: profile?.id,
        p_action: 'viewed',
      });
    } catch (error) {
      console.error('Error loading affiliates:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (affiliate: AffiliateW9) => {
    setSelectedAffiliate(affiliate);

    await supabase.rpc('log_w9_access', {
      p_profile_id: affiliate.id,
      p_action: 'viewed',
    });
  };

  const exportForTaxPrep = () => {
    const csvContent = affiliates
      .filter(a => a.w9_completed)
      .map(a => ({
        'Legal Name': a.w9_legal_name,
        'Business Name': a.w9_business_name || '',
        'Email': a.email,
        'Tax ID Type': TAX_ID_TYPE_LABELS[a.tax_id_type || ''] || '',
        'Tax ID Last 4': a.tax_id_last4 || '',
        'Entity Type': BUSINESS_ENTITY_LABELS[a.business_entity_type || ''] || '',
        'Address': `${a.w9_address_line1 || ''} ${a.w9_address_line2 || ''}`.trim(),
        'City': a.w9_city || '',
        'State': a.w9_state || '',
        'ZIP': a.w9_zip || '',
        'Venmo': a.venmo_username || '',
        'Payment Method': a.payment_method || '',
        'Submitted Date': a.w9_submitted_at ? new Date(a.w9_submitted_at).toLocaleDateString() : '',
      }))
      .map(obj => Object.values(obj).join(','))
      .join('\n');

    const header = 'Legal Name,Business Name,Email,Tax ID Type,Tax ID Last 4,Entity Type,Address,City,State,ZIP,Venmo,Payment Method,Submitted Date\n';
    const fullCsv = header + csvContent;

    console.log('CSV Export for Tax Preparation:');
    console.log(fullCsv);
    console.log('\nCopy the above CSV data to use in your tax software or accounting system.');
  };

  const filteredAffiliates = affiliates.filter(a =>
    a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.w9_legal_name && a.w9_legal_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const completedCount = affiliates.filter(a => a.w9_completed).length;
  const pendingCount = affiliates.length - completedCount;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (selectedAffiliate) {
    return (
      <ScrollView style={styles.container}>
        <BackButton />
        <View style={styles.detailsContainer}>
          <View style={styles.detailsHeader}>
            <FileText size={32} color="#60A5FA" />
            <Text style={styles.detailsTitle}>W-9 Tax Information</Text>
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.detailsSectionTitle}>Affiliate Information</Text>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Name:</Text>
              <Text style={styles.detailsValue}>{selectedAffiliate.full_name}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Email:</Text>
              <Text style={styles.detailsValue}>{selectedAffiliate.email}</Text>
            </View>
            {selectedAffiliate.venmo_username && (
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Venmo:</Text>
                <Text style={styles.detailsValue}>{selectedAffiliate.venmo_username}</Text>
              </View>
            )}
          </View>

          {selectedAffiliate.w9_completed ? (
            <>
              <View style={styles.detailsCard}>
                <Text style={styles.detailsSectionTitle}>Tax Information</Text>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Legal Name:</Text>
                  <Text style={styles.detailsValue}>{selectedAffiliate.w9_legal_name}</Text>
                </View>
                {selectedAffiliate.w9_business_name && (
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Business Name:</Text>
                    <Text style={styles.detailsValue}>{selectedAffiliate.w9_business_name}</Text>
                  </View>
                )}
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Entity Type:</Text>
                  <Text style={styles.detailsValue}>
                    {BUSINESS_ENTITY_LABELS[selectedAffiliate.business_entity_type || ''] || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Tax ID Type:</Text>
                  <Text style={styles.detailsValue}>
                    {TAX_ID_TYPE_LABELS[selectedAffiliate.tax_id_type || ''] || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Tax ID Last 4:</Text>
                  <Text style={styles.detailsValue}>***-**-{selectedAffiliate.tax_id_last4}</Text>
                </View>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Submitted:</Text>
                  <Text style={styles.detailsValue}>
                    {selectedAffiliate.w9_submitted_at
                      ? new Date(selectedAffiliate.w9_submitted_at).toLocaleDateString()
                      : 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsCard}>
                <Text style={styles.detailsSectionTitle}>Address</Text>
                <Text style={styles.detailsValue}>{selectedAffiliate.w9_address_line1}</Text>
                {selectedAffiliate.w9_address_line2 && (
                  <Text style={styles.detailsValue}>{selectedAffiliate.w9_address_line2}</Text>
                )}
                <Text style={styles.detailsValue}>
                  {selectedAffiliate.w9_city}, {selectedAffiliate.w9_state} {selectedAffiliate.w9_zip}
                </Text>
              </View>

              {(selectedAffiliate.w9_exempt_payee_code || selectedAffiliate.w9_fatca_exemption) && (
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsSectionTitle}>Exemptions</Text>
                  {selectedAffiliate.w9_exempt_payee_code && (
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Exempt Payee Code:</Text>
                      <Text style={styles.detailsValue}>{selectedAffiliate.w9_exempt_payee_code}</Text>
                    </View>
                  )}
                  {selectedAffiliate.w9_fatca_exemption && (
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>FATCA Exemption:</Text>
                      <Text style={styles.detailsValue}>{selectedAffiliate.w9_fatca_exemption}</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={styles.notCompletedCard}>
              <AlertCircle size={24} color="#F59E0B" />
              <Text style={styles.notCompletedText}>W-9 not yet completed by this affiliate</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.backToListButton}
            onPress={() => setSelectedAffiliate(null)}
          >
            <Text style={styles.backToListButtonText}>Back to List</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <BackButton />
      <View style={styles.content}>
        <View style={styles.header}>
          <FileText size={32} color="#60A5FA" />
          <Text style={styles.title}>W-9 Tax Forms</Text>
          <Text style={styles.subtitle}>Manage affiliate tax information for IRS reporting</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <CheckCircle size={24} color="#10B981" />
            <Text style={styles.statNumber}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <AlertCircle size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.exportButton} onPress={exportForTaxPrep}>
          <Download size={20} color="#FFFFFF" />
          <Text style={styles.exportButtonText}>Export for Tax Preparation</Text>
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Search size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.listContainer}>
          {filteredAffiliates.map((affiliate) => (
            <TouchableOpacity
              key={affiliate.id}
              style={styles.affiliateCard}
              onPress={() => viewDetails(affiliate)}
            >
              <View style={styles.affiliateInfo}>
                <Text style={styles.affiliateName}>{affiliate.full_name}</Text>
                <Text style={styles.affiliateEmail}>{affiliate.email}</Text>
                {affiliate.w9_legal_name && affiliate.w9_legal_name !== affiliate.full_name && (
                  <Text style={styles.affiliateLegalName}>Legal: {affiliate.w9_legal_name}</Text>
                )}
              </View>
              <View style={styles.affiliateStatus}>
                {affiliate.w9_completed ? (
                  <>
                    <CheckCircle size={20} color="#10B981" />
                    <Text style={styles.statusTextCompleted}>Completed</Text>
                  </>
                ) : (
                  <>
                    <AlertCircle size={20} color="#F59E0B" />
                    <Text style={styles.statusTextPending}>Pending</Text>
                  </>
                )}
                <Eye size={20} color="#60A5FA" style={{ marginLeft: 12 }} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
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
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 12,
  },
  affiliateCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  affiliateInfo: {
    flex: 1,
  },
  affiliateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  affiliateEmail: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  affiliateLegalName: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  affiliateStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTextCompleted: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  statusTextPending: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  detailsContainer: {
    padding: 24,
  },
  detailsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  detailsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  detailsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    width: 140,
  },
  detailsValue: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  notCompletedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  notCompletedText: {
    flex: 1,
    fontSize: 14,
    color: '#FCD34D',
  },
  backToListButton: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  backToListButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
});
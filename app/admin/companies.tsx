import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, TextInput, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Building2, Users, Package, DollarSign, ArrowLeft, Settings, X } from 'lucide-react-native';

interface Company {
  id: string;
  company_name: string;
  description: string;
  website: string;
  business_category: string;
  created_at: string;
  total_products: number;
  active_partnerships: number;
  total_revenue: number;
  avg_rating: number;
  platform_fee_rate?: number;
  platform_fee_paid_by?: 'company' | 'affiliate';
  logo_url?: string;
}

export default function AdminCompanies() {
  const { profile } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [platformFeeRate, setPlatformFeeRate] = useState('');
  const [platformFeePaidBy, setPlatformFeePaidBy] = useState<'company' | 'affiliate'>('affiliate');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.is_super_admin) {
      Alert.alert('Access Denied', 'Admin access required');
      router.back();
      return;
    }
    loadCompanies();
  }, [profile]);

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setPlatformFeeRate(company.platform_fee_rate?.toString() || '20');
    setPlatformFeePaidBy(company.platform_fee_paid_by || 'affiliate');
  };

  const closeEditModal = () => {
    setEditingCompany(null);
    setPlatformFeeRate('');
    setPlatformFeePaidBy('affiliate');
  };

  const savePlatformFee = async () => {
    if (!editingCompany) return;

    const fee = parseFloat(platformFeeRate);
    if (isNaN(fee) || fee < 0 || fee > 100) {
      Alert.alert('Invalid Input', 'Platform fee must be between 0 and 100');
      return;
    }

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('company_settings')
        .select('company_id')
        .eq('company_id', editingCompany.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('company_settings')
          .update({
            platform_fee_rate: fee,
            platform_fee_paid_by: platformFeePaidBy,
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', editingCompany.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert({
            company_id: editingCompany.id,
            platform_fee_rate: fee,
            platform_fee_paid_by: platformFeePaidBy,
          });

        if (error) throw error;
      }

      Alert.alert('Success', 'Platform fee settings updated');
      closeEditModal();
      loadCompanies();
    } catch (error) {
      console.error('Error updating platform fee:', error);
      Alert.alert('Error', 'Failed to update platform fee settings');
    } finally {
      setSaving(false);
    }
  };

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select('id, company_name, description, website, business_category, created_at, logo_url')
        .order('created_at', { ascending: false });

      console.log('Companies query result:', { data: companiesData, error });

      if (error) {
        console.error('Companies query error:', error);
        throw error;
      }

      if (!companiesData || companiesData.length === 0) {
        console.log('No companies found in database');
        setCompanies([]);
        return;
      }

      console.log(`Loading stats for ${companiesData.length} companies`);

      const companiesWithStats = await Promise.all(
        companiesData.map(async (company) => {
          try {
            const [productsRes, partnershipsRes, dealsRes, reviewsRes, settingsRes] = await Promise.all([
              supabase
                .from('products')
                .select('id', { count: 'exact', head: true })
                .eq('company_id', company.id),
              supabase
                .from('affiliate_partnerships')
                .select('id', { count: 'exact', head: true })
                .eq('company_id', company.id)
                .eq('status', 'approved'),
              supabase
                .from('deals')
                .select('deal_value')
                .eq('company_id', company.id),
              supabase
                .from('company_reviews')
                .select('rating')
                .eq('company_id', company.id),
              supabase
                .from('company_settings')
                .select('platform_fee_rate, platform_fee_paid_by')
                .eq('company_id', company.id)
                .maybeSingle(),
            ]);

            if (productsRes.error) console.error('Products query error:', productsRes.error);
            if (partnershipsRes.error) console.error('Partnerships query error:', partnershipsRes.error);
            if (dealsRes.error) console.error('Deals query error:', dealsRes.error);
            if (reviewsRes.error) console.error('Reviews query error:', reviewsRes.error);

            const totalRevenue = (dealsRes.data || []).reduce(
              (sum, deal) => sum + deal.deal_value,
              0
            );

            const avgRating =
              reviewsRes.data && reviewsRes.data.length > 0
                ? reviewsRes.data.reduce((sum, r) => sum + r.rating, 0) / reviewsRes.data.length
                : 0;

            return {
              ...company,
              total_products: productsRes.count || 0,
              active_partnerships: partnershipsRes.count || 0,
              total_revenue: totalRevenue,
              avg_rating: avgRating,
              platform_fee_rate: settingsRes.data?.platform_fee_rate || 20,
              platform_fee_paid_by: settingsRes.data?.platform_fee_paid_by || 'affiliate',
            };
          } catch (companyError) {
            console.error(`Error loading stats for company ${company.id}:`, companyError);
            return {
              ...company,
              total_products: 0,
              active_partnerships: 0,
              total_revenue: 0,
              avg_rating: 0,
            };
          }
        })
      );

      console.log('Companies with stats:', companiesWithStats);
      setCompanies(companiesWithStats);
    } catch (error) {
      console.error('Error loading companies:', error);
      Alert.alert('Error', `Failed to load companies: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#60A5FA" size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Company Management</Text>
          <Text style={styles.subtitle}>{companies.length} companies</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadCompanies} />}
      >
        {companies.map((company) => (
          <TouchableOpacity
            key={company.id}
            style={styles.companyCard}
            onPress={() =>
              router.push({
                pathname: '/company/[id]',
                params: { id: company.id },
              })
            }
          >
            <View style={styles.companyHeader}>
              {company.logo_url ? (
                <Image source={{ uri: company.logo_url }} style={styles.companyLogo} />
              ) : (
                <View style={styles.companyLogoPlaceholder}>
                  <Building2 size={24} color="#64748B" />
                </View>
              )}
              <View style={styles.companyInfo}>
                <View style={styles.companyNameRow}>
                  <Text style={styles.companyName}>{company.company_name}</Text>
                  <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      openEditModal(company);
                    }}
                  >
                    <Settings size={18} color="#60A5FA" />
                  </TouchableOpacity>
                </View>
                {company.business_category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{company.business_category}</Text>
                  </View>
                )}
                <Text style={styles.companyDescription} numberOfLines={2}>
                  {company.description || 'No description'}
                </Text>
                {company.website && (
                  <Text style={styles.website} numberOfLines={1}>
                    {company.website}
                  </Text>
                )}
                <View style={styles.platformFeeInfo}>
                  <Text style={styles.platformFeeText}>
                    Platform Fee: {company.platform_fee_rate}% (paid by {company.platform_fee_paid_by})
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={styles.statIcon}>
                  <Package size={16} color="#60A5FA" />
                </View>
                <Text style={styles.statValue}>{company.total_products}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>

              <View style={styles.statItem}>
                <View style={styles.statIcon}>
                  <Users size={16} color="#10B981" />
                </View>
                <Text style={styles.statValue}>{company.active_partnerships}</Text>
                <Text style={styles.statLabel}>Partnerships</Text>
              </View>

              <View style={styles.statItem}>
                <View style={styles.statIcon}>
                  <DollarSign size={16} color="#3B82F6" />
                </View>
                <Text style={styles.statValue}>${company.total_revenue.toFixed(0)}</Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>
            </View>

            {company.avg_rating > 0 && (
              <View style={styles.cardFooter}>
                <Text style={styles.ratingText}>
                  ⭐ {company.avg_rating.toFixed(1)} rating
                </Text>
              </View>
            )}

            <Text style={styles.joinedText}>
              Joined {new Date(company.created_at).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        ))}

        {companies.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Building2 color="#64748B" size={48} />
            <Text style={styles.emptyText}>No companies found</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!editingCompany} animationType="slide" transparent onRequestClose={closeEditModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Platform Fee</Text>
              <TouchableOpacity onPress={closeEditModal}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {editingCompany && (
              <>
                <Text style={styles.modalCompanyName}>{editingCompany.company_name}</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Platform Fee Rate (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={platformFeeRate}
                    onChangeText={setPlatformFeeRate}
                    keyboardType="decimal-pad"
                    placeholder="20.00"
                    placeholderTextColor="#64748B"
                  />
                  <Text style={styles.helpText}>Enter a value between 0 and 100</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Platform Fee Paid By</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        platformFeePaidBy === 'affiliate' && styles.radioOptionSelected,
                      ]}
                      onPress={() => setPlatformFeePaidBy('affiliate')}
                    >
                      <View style={styles.radioCircle}>
                        {platformFeePaidBy === 'affiliate' && <View style={styles.radioCircleInner} />}
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.radioLabel,
                            platformFeePaidBy === 'affiliate' && styles.radioLabelSelected,
                          ]}
                        >
                          Affiliate
                        </Text>
                        <Text style={styles.radioDescription}>
                          Affiliate receives commission minus platform fee
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        platformFeePaidBy === 'company' && styles.radioOptionSelected,
                      ]}
                      onPress={() => setPlatformFeePaidBy('company')}
                    >
                      <View style={styles.radioCircle}>
                        {platformFeePaidBy === 'company' && <View style={styles.radioCircleInner} />}
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.radioLabel,
                            platformFeePaidBy === 'company' && styles.radioLabelSelected,
                          ]}
                        >
                          Company
                        </Text>
                        <Text style={styles.radioDescription}>
                          Company pays commission plus platform fee
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={closeEditModal}
                    disabled={saving}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={savePlatformFee}
                    disabled={saving}
                  >
                    <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  content: {
    flex: 1,
    padding: 16,
  },
  companyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  companyLogo: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  companyLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyInfo: {
    flex: 1,
  },
  companyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  settingsButton: {
    padding: 8,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    borderRadius: 8,
  },
  categoryBadge: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '600',
  },
  companyDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 6,
    lineHeight: 20,
  },
  website: {
    fontSize: 13,
    color: '#60A5FA',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  joinedText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
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
  platformFeeInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  platformFeeText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCompanyName: {
    fontSize: 16,
    color: '#60A5FA',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  helpText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    gap: 12,
  },
  radioOptionSelected: {
    borderColor: '#60A5FA',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#60A5FA',
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  radioLabelSelected: {
    color: '#60A5FA',
  },
  radioDescription: {
    fontSize: 12,
    color: '#64748B',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#334155',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#60A5FA',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
});

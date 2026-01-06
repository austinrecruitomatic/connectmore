import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Users } from 'lucide-react-native';
import BackButton from '@/components/BackButton';

type Product = {
  id: string;
  name: string;
  access_type: 'public' | 'restricted';
};

type Affiliate = {
  id: string;
  full_name: string;
  email: string;
  hasAccess: boolean;
};

export default function ProductAccessScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessType, setAccessType] = useState<'public' | 'restricted'>('public');
  const [selectedAffiliates, setSelectedAffiliates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) {
      loadProductData();
    }
  }, [id]);

  const loadProductData = async () => {
    try {
      setLoading(true);

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, access_type')
        .eq('id', id)
        .single();

      if (productError) throw productError;
      if (!productData) {
        Alert.alert('Error', 'Product not found');
        router.back();
        return;
      }

      setProduct(productData);
      setAccessType(productData.access_type || 'public');

      const { data: affiliatesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('user_type', 'affiliate')
        .order('full_name');

      const { data: accessData } = await supabase
        .from('product_affiliate_access')
        .select('affiliate_id')
        .eq('product_id', id);

      const accessSet = new Set((accessData || []).map(a => a.affiliate_id));
      setSelectedAffiliates(accessSet);

      const affiliatesWithAccess = (affiliatesData || []).map(affiliate => ({
        ...affiliate,
        hasAccess: accessSet.has(affiliate.id),
      }));

      setAffiliates(affiliatesWithAccess);
    } catch (error) {
      console.error('Error loading product data:', error);
      Alert.alert('Error', 'Failed to load product data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!product) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({ access_type: accessType })
        .eq('id', product.id);

      if (updateError) throw updateError;

      await supabase
        .from('product_affiliate_access')
        .delete()
        .eq('product_id', product.id);

      if (accessType === 'restricted' && selectedAffiliates.size > 0) {
        const accessRecords = Array.from(selectedAffiliates).map(affiliateId => ({
          product_id: product.id,
          affiliate_id: affiliateId,
          granted_by: profile?.id,
        }));

        const { error: accessError } = await supabase
          .from('product_affiliate_access')
          .insert(accessRecords);

        if (accessError) throw accessError;
      }

      Alert.alert('Success', 'Access settings updated successfully!');
      router.back();
    } catch (error) {
      console.error('Error saving access settings:', error);
      Alert.alert('Error', 'Failed to save access settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleAffiliate = (affiliateId: string) => {
    const newSet = new Set(selectedAffiliates);
    if (newSet.has(affiliateId)) {
      newSet.delete(affiliateId);
    } else {
      newSet.add(affiliateId);
    }
    setSelectedAffiliates(newSet);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Product not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton style={styles.backButton} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Manage Access</Text>
          <Text style={styles.headerSubtitle}>{product.name}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={20} color="#60A5FA" />
            <Text style={styles.sectionTitle}>Access Type</Text>
          </View>
          <Text style={styles.helperText}>
            Choose who can promote this product
          </Text>

          <View style={styles.accessTypeOptions}>
            <TouchableOpacity
              style={[
                styles.accessTypeOption,
                accessType === 'public' && styles.accessTypeOptionActive,
              ]}
              onPress={() => setAccessType('public')}
            >
              <View style={styles.radioCircle}>
                {accessType === 'public' && <View style={styles.radioCircleInner} />}
              </View>
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionTitle,
                  accessType === 'public' && styles.optionTitleActive,
                ]}>
                  Public
                </Text>
                <Text style={styles.optionDescription}>
                  All affiliates can promote this product
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.accessTypeOption,
                accessType === 'restricted' && styles.accessTypeOptionActive,
              ]}
              onPress={() => setAccessType('restricted')}
            >
              <View style={styles.radioCircle}>
                {accessType === 'restricted' && <View style={styles.radioCircleInner} />}
              </View>
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionTitle,
                  accessType === 'restricted' && styles.optionTitleActive,
                ]}>
                  Restricted
                </Text>
                <Text style={styles.optionDescription}>
                  Only selected affiliates can promote
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {accessType === 'restricted' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Affiliates</Text>
            <Text style={styles.helperText}>
              Choose which affiliates can promote this product
            </Text>

            <View style={styles.affiliateList}>
              {affiliates.map(affiliate => (
                <TouchableOpacity
                  key={affiliate.id}
                  style={[
                    styles.affiliateItem,
                    selectedAffiliates.has(affiliate.id) && styles.affiliateItemSelected,
                  ]}
                  onPress={() => toggleAffiliate(affiliate.id)}
                >
                  <View style={[
                    styles.checkbox,
                    selectedAffiliates.has(affiliate.id) && styles.checkboxActive,
                  ]}>
                    {selectedAffiliates.has(affiliate.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <View style={styles.affiliateInfo}>
                    <Text style={styles.affiliateName}>{affiliate.full_name}</Text>
                    <Text style={styles.affiliateEmail}>{affiliate.email}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {affiliates.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No affiliates found</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
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
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 20,
  },
  accessTypeOptions: {
    gap: 12,
  },
  accessTypeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    gap: 12,
  },
  accessTypeOptionActive: {
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
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  optionTitleActive: {
    color: '#60A5FA',
  },
  optionDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  affiliateList: {
    gap: 8,
  },
  affiliateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  affiliateItemSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  checkboxActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  affiliateInfo: {
    flex: 1,
    marginLeft: 12,
  },
  affiliateName: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  affiliateEmail: {
    fontSize: 13,
    color: '#94A3B8',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
});

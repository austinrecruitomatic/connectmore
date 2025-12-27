import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  Modal,
  ScrollView,
  TextInput,
  Clipboard,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useNavigation } from 'expo-router';
import { Check, X, Copy, ExternalLink, List, Plus, Search, Gift, ChevronDown, ChevronUp, Package } from 'lucide-react-native';

type Partnership = {
  id: string;
  affiliate_id: string;
  company_id: string;
  status: string;
  affiliate_code: string;
  created_at: string;
  approved_at: string | null;
  companies: {
    company_name: string;
    description: string;
  };
  profiles: {
    full_name: string;
    email: string;
  };
  companyProducts?: CompanyProduct[];
};

type CompanyProduct = {
  id: string;
  name: string;
  description: string;
  sale_type: 'lead_generation' | 'direct_sale';
  commission_rate: number;
  commission_type: string;
};

type Affiliate = {
  id: string;
  full_name: string;
  email: string;
};

type Product = {
  id: string;
  name: string;
  commission_rate: number;
};

export default function PartnershipsScreen() {
  const { profile } = useAuth();
  const isCompany = profile?.user_type === 'company';
  const isAffiliate = profile?.user_type === 'affiliate';
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedAffiliate, setSelectedAffiliate] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [expandedPartnership, setExpandedPartnership] = useState<string | null>(null);
  const [productsByPartnership, setProductsByPartnership] = useState<Map<string, CompanyProduct[]>>(new Map());
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    if (isAffiliate) {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/customer-portal-generator')}
            style={{ paddingRight: 16 }}
          >
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#3B82F6',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
            }}>
              <Gift size={18} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>Customers</Text>
            </View>
          </TouchableOpacity>
        ),
      });
    }
  }, [isAffiliate, navigation, router]);

  useEffect(() => {
    loadPartnerships();
  }, []);

  const loadPartnerships = async () => {
    setLoading(true);

    if (isCompany && profile?.id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (companyData) {
        setCompanyId(companyData.id);
        const { data } = await supabase
          .from('affiliate_partnerships')
          .select('*, companies(*), profiles(*)')
          .eq('company_id', companyData.id)
          .order('created_at', { ascending: false });

        setPartnerships(data || []);
      }
    } else if (profile?.id) {
      const { data } = await supabase
        .from('affiliate_partnerships')
        .select('*, companies(*), profiles(*)')
        .eq('affiliate_id', profile.id)
        .order('created_at', { ascending: false });

      setPartnerships(data || []);
    }

    setLoading(false);
  };

  const handleApprove = async (partnershipId: string) => {
    const { error } = await supabase
      .from('affiliate_partnerships')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', partnershipId);

    if (!error) {
      loadPartnerships();
      Alert.alert('Success', 'Partnership approved!');
    }
  };

  const handleReject = async (partnershipId: string) => {
    const { error } = await supabase
      .from('affiliate_partnerships')
      .update({ status: 'rejected' })
      .eq('id', partnershipId);

    if (!error) {
      loadPartnerships();
      Alert.alert('Success', 'Partnership rejected');
    }
  };

  const loadAffiliates = async () => {
    const { data: affiliatesData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('user_type', 'affiliate');

    setAffiliates(affiliatesData || []);
  };

  const loadProducts = async () => {
    if (!companyId) return;

    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, commission_rate')
      .eq('company_id', companyId)
      .eq('is_active', true);

    setProducts(productsData || []);
  };

  const handleAddPartnership = async () => {
    if (!selectedAffiliate || !companyId || !selectedProduct) {
      Alert.alert('Required Fields', 'Please select both an affiliate and a product');
      return;
    }

    setSaving(true);

    try {
      const affiliateCode = `${selectedAffiliate.slice(0, 8)}-${companyId.slice(0, 8)}-${selectedProduct.slice(0, 6)}`;

      const { error } = await supabase.from('affiliate_partnerships').insert({
        affiliate_id: selectedAffiliate,
        company_id: companyId,
        product_id: selectedProduct,
        affiliate_code: affiliateCode,
        status: 'approved',
        approved_at: new Date().toISOString(),
      });

      if (error) {
        if (error.message.includes('duplicate')) {
          Alert.alert('Error', 'This partnership already exists');
        } else {
          Alert.alert('Error', 'Failed to add partnership: ' + error.message);
        }
        setSaving(false);
        return;
      }

      Alert.alert('Success', 'Partnership added successfully!');
      setShowAddModal(false);
      setSelectedAffiliate(null);
      setSelectedProduct(null);
      setSearchQuery('');
      await loadPartnerships();
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = async () => {
    await loadAffiliates();
    await loadProducts();
    setShowAddModal(true);
  };

  const toggleProductList = async (partnershipId: string, companyId: string) => {
    if (expandedPartnership === partnershipId) {
      setExpandedPartnership(null);
    } else {
      setExpandedPartnership(partnershipId);

      if (!productsByPartnership.has(partnershipId)) {
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, description, sale_type, commission_rate, commission_type')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('name');

        if (productsData) {
          setProductsByPartnership(new Map(productsByPartnership.set(partnershipId, productsData)));
        }
      }
    }
  };

  const handleCopyProductLink = (productId: string, affiliateCode: string) => {
    const productShareUrl = `https://connect-more.io/product/${productId}/share?ref=${affiliateCode}`;
    Clipboard.setString(productShareUrl);
    Alert.alert('Product Link Copied!', 'Your shareable product link has been copied to clipboard.');
  };

  const handleViewProductPage = (productId: string, affiliateCode: string) => {
    router.push(`/product/${productId}/share?ref=${affiliateCode}`);
  };

  const handleCopyLink = (affiliateCode: string) => {
    const landingPageUrl = `https://connect-more.io/lp/${affiliateCode}`;
    Clipboard.setString(landingPageUrl);
    Alert.alert('Link Copied!', 'Your shareable landing page link has been copied to clipboard.');
  };

  const handleViewLandingPage = (affiliateCode: string) => {
    router.push(`/lp/${affiliateCode}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#4caf50';
      case 'rejected':
        return '#f44336';
      default:
        return '#ff9800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Pending';
    }
  };

  const renderPartnership = ({ item }: { item: Partnership }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.productName}>{item.companies?.company_name || 'Unknown Company'}</Text>
          {isCompany && (
            <Text style={styles.affiliateName}>
              {item.profiles?.full_name || 'Unknown Affiliate'}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.codeText}>Code: {item.affiliate_code}</Text>
      </View>

      {isCompany && item.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item.id)}
          >
            <Check size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
          >
            <X size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isCompany && item.status === 'approved' && (
        <>
          <View style={styles.linkActions}>
            <TouchableOpacity
              style={styles.viewPageButton}
              onPress={() => handleViewLandingPage(item.affiliate_code)}
            >
              <ExternalLink size={18} color="#3B82F6" />
              <Text style={styles.viewPageButtonText}>View Page</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.copyLinkButton}
              onPress={() => handleCopyLink(item.affiliate_code)}
            >
              <Copy size={18} color="#fff" />
              <Text style={styles.copyLinkButtonText}>Copy Link</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => toggleProductList(item.id, item.company_id)}
          >
            <Package size={18} color="#60A5FA" />
            <Text style={styles.expandButtonText}>
              {expandedPartnership === item.id ? 'Hide Products' : 'Show Products'}
            </Text>
            {expandedPartnership === item.id ? (
              <ChevronUp size={18} color="#60A5FA" />
            ) : (
              <ChevronDown size={18} color="#60A5FA" />
            )}
          </TouchableOpacity>

          {expandedPartnership === item.id && (
            <View style={styles.productsContainer}>
              {productsByPartnership.get(item.id)?.length === 0 && (
                <Text style={styles.noProductsText}>No products available</Text>
              )}
              {productsByPartnership.get(item.id)?.map((product) => (
                <View key={product.id} style={styles.productItem}>
                  <View style={styles.productItemHeader}>
                    <Text style={styles.productItemName}>{product.name}</Text>
                    <View
                      style={[
                        styles.saleTypePill,
                        product.sale_type === 'direct_sale'
                          ? styles.saleTypePillDirect
                          : styles.saleTypePillLead,
                      ]}
                    >
                      <Text style={styles.saleTypePillText}>
                        {product.sale_type === 'direct_sale' ? 'Sale' : 'Lead'}
                      </Text>
                    </View>
                  </View>
                  {product.description && (
                    <Text style={styles.productItemDescription} numberOfLines={2}>
                      {product.description}
                    </Text>
                  )}
                  <Text style={styles.productItemCommission}>
                    {product.commission_type === 'percentage'
                      ? `${product.commission_rate}% Commission`
                      : `$${product.commission_rate} per sale`}
                  </Text>
                  <View style={styles.productActions}>
                    <TouchableOpacity
                      style={styles.productViewButton}
                      onPress={() => handleViewProductPage(product.id, item.affiliate_code)}
                    >
                      <ExternalLink size={16} color="#3B82F6" />
                      <Text style={styles.productViewButtonText}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.productCopyButton}
                      onPress={() => handleCopyProductLink(product.id, item.affiliate_code)}
                    >
                      <Copy size={16} color="#FFF" />
                      <Text style={styles.productCopyButtonText}>Copy Link</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );

  const filteredAffiliates = affiliates.filter(
    (aff) =>
      aff.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      aff.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={partnerships}
        renderItem={renderPartnership}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPartnerships} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {isCompany ? 'No partnership requests' : 'No partnerships yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isCompany
                ? 'Affiliates will appear here when they request to promote your products'
                : 'Request partnerships with products to start promoting'}
            </Text>
          </View>
        }
      />

      {isCompany ? (
        <TouchableOpacity style={styles.fab} onPress={openAddModal}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/landing-page/my-pages')}
        >
          <List size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Partnership</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Select Product</Text>
              {products.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>No active products found. Create a product first.</Text>
                </View>
              ) : (
                products.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.selectionItem,
                      selectedProduct === product.id && styles.selectionItemActive,
                    ]}
                    onPress={() => setSelectedProduct(product.id)}
                  >
                    <View style={styles.selectionItemContent}>
                      <Text style={styles.selectionItemTitle}>{product.name}</Text>
                      <Text style={styles.selectionItemSubtitle}>
                        Commission: {product.commission_rate}%
                      </Text>
                    </View>
                    {selectedProduct === product.id && (
                      <Check size={20} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                ))
              )}

              <Text style={[styles.label, { marginTop: 24 }]}>Select Affiliate</Text>
              <View style={styles.searchContainer}>
                <Search size={20} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search affiliates..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#64748B"
                />
              </View>

              {filteredAffiliates.map((affiliate) => (
                <TouchableOpacity
                  key={affiliate.id}
                  style={[
                    styles.selectionItem,
                    selectedAffiliate === affiliate.id && styles.selectionItemActive,
                  ]}
                  onPress={() => setSelectedAffiliate(affiliate.id)}
                >
                  <View style={styles.selectionItemContent}>
                    <Text style={styles.selectionItemTitle}>{affiliate.full_name}</Text>
                    <Text style={styles.selectionItemSubtitle}>{affiliate.email}</Text>
                  </View>
                  {selectedAffiliate === affiliate.id && (
                    <Check size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.addButton, saving && styles.addButtonDisabled]}
                onPress={handleAddPartnership}
                disabled={saving}
              >
                <Text style={styles.addButtonText}>
                  {saving ? 'Adding Partnership...' : 'Add Partnership'}
                </Text>
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
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  affiliateName: {
    fontSize: 14,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 12,
  },
  commissionText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  codeText: {
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  linkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewPageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3B82F6',
    gap: 6,
  },
  viewPageButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  copyLinkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    gap: 6,
  },
  copyLinkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  emptySection: {
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptySectionText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#334155',
  },
  selectionItemActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E293B',
  },
  selectionItemContent: {
    flex: 1,
  },
  selectionItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  selectionItemSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#60A5FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  expandButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#60A5FA',
  },
  productsContainer: {
    marginTop: 12,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  noProductsText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    padding: 20,
  },
  productItem: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  productItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  saleTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  saleTypePillDirect: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  saleTypePillLead: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  saleTypePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productItemDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
    lineHeight: 18,
  },
  productItemCommission: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 12,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  productViewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
    padding: 10,
  },
  productViewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  productCopyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    padding: 10,
  },
  productCopyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

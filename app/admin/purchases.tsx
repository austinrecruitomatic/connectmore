import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { ShoppingCart, ArrowLeft, DollarSign, Tag, ExternalLink } from 'lucide-react-native';

interface Purchase {
  id: string;
  product_id: string;
  affiliate_id: string;
  company_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  purchase_amount: number;
  commission_amount: number;
  platform_fee: number;
  quantity: number;
  status: string;
  discount_applied: boolean;
  discount_amount: number;
  product_url: string | null;
  purchased_at: string;
  product: {
    name: string;
    product_price: number;
    currency: string;
  };
  affiliate: {
    full_name: string;
    email: string;
  };
  company: {
    company_name: string;
  };
}

export default function AdminPurchases() {
  const { profile } = useAuth();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  useEffect(() => {
    if (!profile?.is_super_admin) {
      Alert.alert('Access Denied', 'Admin access required');
      router.back();
      return;
    }
    loadPurchases();
  }, [profile]);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_purchases')
        .select(`
          *,
          product:products (name, product_price, currency),
          affiliate:profiles!product_purchases_affiliate_id_fkey (full_name, email),
          company:companies (company_name)
        `)
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error loading purchases:', error);
      Alert.alert('Error', 'Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'refunded': return '#EF4444';
      case 'cancelled': return '#64748B';
      default: return '#64748B';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#60A5FA" size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Product Purchases</Text>
          <Text style={styles.subtitle}>{purchases.length} purchases</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadPurchases} tintColor="#3B82F6" />
        }
      >
        {purchases.map((purchase) => (
          <TouchableOpacity
            key={purchase.id}
            style={styles.purchaseCard}
            onPress={() => setSelectedPurchase(purchase)}
          >
            <View style={styles.purchaseHeader}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{purchase.product.name}</Text>
                <Text style={styles.customerName}>{purchase.customer_name}</Text>
                <Text style={styles.customerEmail}>{purchase.customer_email}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(purchase.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(purchase.status) }]}>
                  {purchase.status}
                </Text>
              </View>
            </View>

            <View style={styles.purchaseDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Affiliate</Text>
                <Text style={styles.detailValue}>{purchase.affiliate.full_name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Company</Text>
                <Text style={styles.detailValue}>{purchase.company.company_name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Purchase Amount</Text>
                <Text style={styles.detailValue}>
                  {purchase.product.currency} ${purchase.purchase_amount.toFixed(2)}
                </Text>
              </View>
              {purchase.discount_applied && purchase.discount_amount > 0 && (
                <View style={styles.detailRow}>
                  <View style={styles.discountBadge}>
                    <Tag size={14} color="#10B981" />
                    <Text style={styles.discountText}>Discount Applied</Text>
                  </View>
                  <Text style={[styles.detailValue, styles.discountValue]}>
                    -${purchase.discount_amount.toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Commission</Text>
                <Text style={styles.detailValue}>${purchase.commission_amount.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>{purchase.quantity}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {purchases.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <ShoppingCart color="#64748B" size={48} />
            <Text style={styles.emptyText}>No purchases found</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={selectedPurchase !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedPurchase(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Purchase Details</Text>

            {selectedPurchase && (
              <ScrollView>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Product Information</Text>
                  <Text style={styles.modalLabel}>Product Name</Text>
                  <Text style={styles.modalValue}>{selectedPurchase.product.name}</Text>

                  <Text style={styles.modalLabel}>Unit Price</Text>
                  <Text style={styles.modalValue}>
                    {selectedPurchase.product.currency} ${selectedPurchase.product.product_price.toFixed(2)}
                  </Text>

                  <Text style={styles.modalLabel}>Quantity</Text>
                  <Text style={styles.modalValue}>{selectedPurchase.quantity}</Text>

                  {selectedPurchase.product_url && (
                    <>
                      <Text style={styles.modalLabel}>Product URL</Text>
                      <View style={styles.urlContainer}>
                        <ExternalLink size={16} color="#60A5FA" />
                        <Text style={styles.urlText} numberOfLines={1}>
                          {selectedPurchase.product_url}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Customer Information</Text>
                  <Text style={styles.modalLabel}>Name</Text>
                  <Text style={styles.modalValue}>{selectedPurchase.customer_name}</Text>

                  <Text style={styles.modalLabel}>Email</Text>
                  <Text style={styles.modalValue}>{selectedPurchase.customer_email}</Text>

                  {selectedPurchase.customer_phone && (
                    <>
                      <Text style={styles.modalLabel}>Phone</Text>
                      <Text style={styles.modalValue}>{selectedPurchase.customer_phone}</Text>
                    </>
                  )}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Financial Details</Text>
                  <View style={styles.financialRow}>
                    <Text style={styles.modalLabel}>Purchase Amount</Text>
                    <Text style={styles.modalValue}>
                      ${selectedPurchase.purchase_amount.toFixed(2)}
                    </Text>
                  </View>

                  {selectedPurchase.discount_applied && selectedPurchase.discount_amount > 0 && (
                    <View style={styles.financialRow}>
                      <View style={styles.discountBadge}>
                        <Tag size={14} color="#10B981" />
                        <Text style={styles.discountText}>Affiliate Discount</Text>
                      </View>
                      <Text style={[styles.modalValue, styles.discountValue]}>
                        -${selectedPurchase.discount_amount.toFixed(2)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.financialRow}>
                    <Text style={styles.modalLabel}>Commission</Text>
                    <Text style={styles.modalValue}>
                      ${selectedPurchase.commission_amount.toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.financialRow}>
                    <Text style={styles.modalLabel}>Platform Fee</Text>
                    <Text style={styles.modalValue}>
                      ${selectedPurchase.platform_fee.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Affiliate & Company</Text>
                  <Text style={styles.modalLabel}>Affiliate</Text>
                  <Text style={styles.modalValue}>{selectedPurchase.affiliate.full_name}</Text>
                  <Text style={styles.modalSubvalue}>{selectedPurchase.affiliate.email}</Text>

                  <Text style={styles.modalLabel}>Company</Text>
                  <Text style={styles.modalValue}>{selectedPurchase.company.company_name}</Text>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedPurchase(null)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
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
  purchaseCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 13,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  purchaseDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  discountText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  discountValue: {
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
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
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#60A5FA',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 12,
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  modalSubvalue: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  urlText: {
    fontSize: 14,
    color: '#60A5FA',
    flex: 1,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  closeButton: {
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Share,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Link,
  Copy,
  DollarSign,
  Plus,
  ExternalLink,
  Check,
  Edit,
  Trash2,
} from 'lucide-react-native';

type PaymentLink = {
  id: string;
  product_id: string;
  amount: number;
  description: string;
  is_active: boolean;
  created_at: string;
  products: {
    name: string;
    commission_rate: number;
    commission_type: string;
  };
};

type Product = {
  id: string;
  name: string;
  commission_rate: number;
  commission_type: string;
};

export default function PaymentLinksScreen() {
  const { profile } = useAuth();
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    product_id: '',
    amount: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (profile?.user_type !== 'company') return;

    setLoading(true);

    try {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!companyData) return;

      setCompanyId(companyData.id);

      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, commission_rate, commission_type')
        .eq('company_id', companyData.id)
        .eq('is_active', true);

      setProducts(productsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCommission = (amount: number, product: Product | null) => {
    if (!product) return { commission: 0, companyGets: amount };

    const commission =
      product.commission_type === 'percentage'
        ? amount * (product.commission_rate / 100)
        : product.commission_rate;

    return {
      commission,
      companyGets: amount - commission,
    };
  };

  const generatePaymentLink = (productId: string, amount: string) => {
    const baseUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://yourapp.com';
    return `${baseUrl}/pay/${productId}?amount=${amount}`;
  };

  const copyToClipboard = async (link: string) => {
    try {
      await Share.share({
        message: link,
      });
      setCopiedLink(link);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      console.error('Error sharing link:', error);
    }
  };

  const selectedProduct = products.find((p) => p.id === formData.product_id);
  const amount = parseFloat(formData.amount) || 0;
  const { commission, companyGets } = calculateCommission(amount, selectedProduct || null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Links</Text>
        <Text style={styles.subtitle}>
          Generate payment links for customers to purchase your products
        </Text>
      </View>

      {profile?.user_type === 'company' && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.createButtonText}>Create Payment Link</Text>
        </TouchableOpacity>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How It Works</Text>
        <Text style={styles.infoText}>
          1. Select a product and enter the sale amount
        </Text>
        <Text style={styles.infoText}>
          2. Share the payment link with your customer
        </Text>
        <Text style={styles.infoText}>
          3. Customer pays through Stripe
        </Text>
        <Text style={styles.infoText}>
          4. Deal is automatically created and commission calculated
        </Text>
        <Text style={styles.infoText}>
          5. You'll be notified when commission payment is due
        </Text>
      </View>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Generate Payment Link</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Product</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {products.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={[
                        styles.productChip,
                        formData.product_id === product.id && styles.productChipSelected,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, product_id: product.id })
                      }
                    >
                      <Text
                        style={[
                          styles.productChipText,
                          formData.product_id === product.id &&
                            styles.productChipTextSelected,
                        ]}
                      >
                        {product.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Sale Amount</Text>
              <View style={styles.inputContainer}>
                <DollarSign size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  value={formData.amount}
                  onChangeText={(text) =>
                    setFormData({ ...formData, amount: text })
                  }
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {selectedProduct && amount > 0 && (
              <View style={styles.commissionPreview}>
                <Text style={styles.commissionLabel}>Commission Breakdown:</Text>
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionText}>Sale Amount:</Text>
                  <Text style={styles.commissionValue}>${amount.toFixed(2)}</Text>
                </View>
                <View style={styles.commissionRow}>
                  <Text style={styles.commissionText}>
                    Affiliate Commission ({selectedProduct.commission_rate}
                    {selectedProduct.commission_type === 'percentage' ? '%' : ' fixed'}):
                  </Text>
                  <Text style={styles.commissionValue}>
                    ${commission.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.commissionRow, styles.commissionTotal]}>
                  <Text style={styles.commissionTotalText}>You Receive:</Text>
                  <Text style={styles.commissionTotalValue}>
                    ${companyGets.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.commissionNote}>
                  <Text style={styles.commissionNoteText}>
                    You'll need to pay ${commission.toFixed(2)} commission to the
                    platform after receiving payment
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                placeholder="Add payment details..."
                multiline
                numberOfLines={3}
              />
            </View>

            {formData.product_id && amount > 0 && (
              <View style={styles.linkPreview}>
                <Text style={styles.linkPreviewLabel}>Payment Link:</Text>
                <Text style={styles.linkPreviewText} numberOfLines={1}>
                  {generatePaymentLink(formData.product_id, formData.amount)}
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() =>
                    copyToClipboard(
                      generatePaymentLink(formData.product_id, formData.amount)
                    )
                  }
                >
                  {copiedLink === generatePaymentLink(formData.product_id, formData.amount) ? (
                    <Check size={20} color="#10b981" />
                  ) : (
                    <Copy size={20} color="#0066cc" />
                  )}
                  <Text style={styles.copyButtonText}>
                    {copiedLink === generatePaymentLink(formData.product_id, formData.amount)
                      ? 'Copied!'
                      : 'Share Link'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  setFormData({ product_id: '', amount: '', description: '' });
                }}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066cc',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0066cc',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
  },
  productChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  productChipSelected: {
    backgroundColor: '#0066cc',
  },
  productChipText: {
    fontSize: 14,
    color: '#333',
  },
  productChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  commissionPreview: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  commissionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commissionText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  commissionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commissionTotal: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 8,
    marginTop: 8,
  },
  commissionTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  commissionTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  commissionNote: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  commissionNoteText: {
    fontSize: 12,
    color: '#856404',
  },
  linkPreview: {
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  linkPreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0066cc',
  },
  linkPreviewText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#0066cc',
  },
  copyButtonText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});

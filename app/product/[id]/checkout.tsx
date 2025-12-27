import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, ShoppingCart, CreditCard } from 'lucide-react-native';

type Product = {
  id: string;
  name: string;
  description: string;
  product_price: number;
  currency: string;
  company_id: string;
  sale_type: string;
  commission_rate: number;
  commission_type: string;
  inventory_tracking: boolean;
  inventory_quantity: number;
  external_checkout_url?: string;
  image_url?: string;
  product_url?: string;
  affiliate_discount_enabled?: boolean;
  affiliate_discount_type?: string;
  affiliate_discount_value?: number;
};

type Partnership = {
  id: string;
  affiliate_id: string;
  company_id: string;
};

export default function ProductCheckout() {
  const { id, partnershipId } = useLocalSearchParams();
  const { profile } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    loadProductAndPartnership();
  }, [id, partnershipId]);

  const loadProductAndPartnership = async () => {
    try {
      setLoading(true);

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('sale_type', 'direct_sale')
        .single();

      if (productError) throw productError;
      setProduct(productData);

      if (partnershipId) {
        const { data: partnershipData, error: partnershipError } = await supabase
          .from('affiliate_partnerships')
          .select('*')
          .eq('id', partnershipId)
          .single();

        if (partnershipError) throw partnershipError;
        setPartnership(partnershipData);
      }
    } catch (error) {
      console.error('Error loading checkout:', error);
      Alert.alert('Error', 'Failed to load product information');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!product || !partnership) return;

    if (!customerName || !customerEmail) {
      Alert.alert('Required Fields', 'Please enter your name and email');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity');
      return;
    }

    if (product.inventory_tracking && qty > product.inventory_quantity) {
      Alert.alert('Insufficient Inventory', `Only ${product.inventory_quantity} units available`);
      return;
    }

    if (product.external_checkout_url) {
      Alert.alert(
        'External Checkout',
        'This product uses an external checkout system. You will be redirected.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              Alert.alert('Info', 'External checkout integration coming soon');
            },
          },
        ]
      );
      return;
    }

    setProcessing(true);

    try {
      const subtotal = product.product_price * qty;
      let discountAmount = 0;
      let discountApplied = false;

      if (product.affiliate_discount_enabled && product.affiliate_discount_value) {
        discountApplied = true;
        if (product.affiliate_discount_type === 'percentage') {
          discountAmount = (subtotal * product.affiliate_discount_value) / 100;
        } else {
          discountAmount = product.affiliate_discount_value * qty;
        }
      }

      const purchaseAmount = subtotal - discountAmount;
      let commissionAmount = 0;

      if (product.commission_type === 'percentage') {
        commissionAmount = (purchaseAmount * product.commission_rate) / 100;
      } else {
        commissionAmount = product.commission_rate * qty;
      }

      const { data: settings } = await supabase
        .from('company_settings')
        .select('platform_fee_rate, platform_fee_paid_by')
        .eq('company_id', product.company_id)
        .maybeSingle();

      const platformFeeRate = settings?.platform_fee_rate || 20;
      const platformFee = (commissionAmount * platformFeeRate) / 100;

      const { error } = await supabase.from('product_purchases').insert({
        product_id: product.id,
        affiliate_id: partnership.affiliate_id,
        company_id: product.company_id,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        purchase_amount: purchaseAmount,
        commission_amount: commissionAmount,
        platform_fee: platformFee,
        quantity: qty,
        status: 'completed',
        payment_method: 'platform',
        product_url: product.product_url || null,
        discount_applied: discountApplied,
        discount_amount: discountAmount,
        purchased_at: new Date().toISOString(),
      });

      if (error) throw error;

      if (product.inventory_tracking) {
        const { error: invError } = await supabase
          .from('products')
          .update({ inventory_quantity: product.inventory_quantity - qty })
          .eq('id', product.id);

        if (invError) console.error('Failed to update inventory:', invError);
      }

      Alert.alert('Success', 'Purchase completed successfully!');
      router.back();
    } catch (error) {
      console.error('Error processing purchase:', error);
      Alert.alert('Error', 'Failed to process purchase');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  const qty = parseInt(quantity || '1');
  const subtotal = product.product_price * qty;

  let discountAmount = 0;
  if (product.affiliate_discount_enabled && product.affiliate_discount_value) {
    if (product.affiliate_discount_type === 'percentage') {
      discountAmount = (subtotal * product.affiliate_discount_value) / 100;
    } else {
      discountAmount = product.affiliate_discount_value * qty;
    }
  }

  const totalAmount = subtotal - discountAmount;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.productSection}>
          <ShoppingCart size={32} color="#60A5FA" />
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productDescription}>{product.description}</Text>
          <Text style={styles.productPrice}>
            {product.currency} ${product.product_price.toFixed(2)}
          </Text>
          {product.inventory_tracking && (
            <Text style={styles.inventoryText}>
              {product.inventory_quantity} units available
            </Text>
          )}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Customer Information</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="John Doe"
            placeholderTextColor="#64748B"
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={customerEmail}
            onChangeText={setCustomerEmail}
            placeholder="john@example.com"
            placeholderTextColor="#64748B"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone Number (Optional)</Text>
          <TextInput
            style={styles.input}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="+1 (555) 123-4567"
            placeholderTextColor="#64748B"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="1"
            placeholderTextColor="#64748B"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {product.currency} ${subtotal.toFixed(2)}
            </Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>
                Affiliate Discount
                {product.affiliate_discount_type === 'percentage'
                  ? ` (${product.affiliate_discount_value}%)`
                  : ''}
              </Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -{product.currency} ${discountAmount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.summaryRowTotal}>
            <Text style={styles.summaryLabelTotal}>Total</Text>
            <Text style={styles.summaryValueTotal}>
              {product.currency} ${totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.purchaseButton, processing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={processing}
        >
          <CreditCard size={20} color="#FFFFFF" />
          <Text style={styles.purchaseButtonText}>
            {processing ? 'Processing...' : 'Complete Purchase'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  productSection: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  productDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 16,
  },
  inventoryText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  formSection: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 12,
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
  summarySection: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#94A3B8',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  discountLabel: {
    color: '#10B981',
  },
  discountValue: {
    color: '#10B981',
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  summaryLabelTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryValueTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  purchaseButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 20,
  },
});

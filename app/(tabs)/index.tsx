import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Plus, X, Trash2, Pencil, Layout } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type Product = {
  id: string;
  company_id: string;
  name: string;
  description: string;
  image_url: string;
  commission_rate: number;
  commission_type: string;
  is_active: boolean;
  product_url?: string;
  lp_headline?: string;
  lp_description?: string;
  lp_cta_text?: string;
  lp_cta_type?: string;
  lp_hero_image?: string;
  affiliate_discount_enabled?: boolean;
  affiliate_discount_type?: 'percentage' | 'fixed_amount';
  affiliate_discount_value?: number;
  sale_type?: 'lead_generation' | 'direct_sale';
  product_price?: number;
  currency?: string;
  inventory_tracking?: boolean;
  inventory_quantity?: number;
  external_checkout_url?: string;
};

type Company = {
  id: string;
  company_name: string;
  logo_url: string;
  description: string;
};

export default function HomeScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const isCompany = profile?.user_type === 'company';
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [partnerships, setPartnerships] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    image_url: '',
    commission_rate: '',
    commission_type: 'percentage',
    product_url: '',
    lp_headline: '',
    lp_description: '',
    lp_cta_text: 'Get Started',
    lp_cta_type: 'signup',
    lp_hero_image: '',
    affiliate_discount_enabled: false,
    affiliate_discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    affiliate_discount_value: '',
    sale_type: 'lead_generation' as 'lead_generation' | 'direct_sale',
    product_price: '',
    currency: 'USD',
    inventory_tracking: false,
    inventory_quantity: '',
    external_checkout_url: '',
    access_type: 'public' as 'public' | 'restricted',
  });

  const [affiliates, setAffiliates] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [selectedAffiliates, setSelectedAffiliates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (profile) {
      loadProducts();
      if (isCompany) {
        loadCompanyId();
        loadAffiliates();
      }
    }
  }, [profile, isCompany]);

  const loadAffiliates = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('user_type', 'affiliate')
      .order('full_name');

    if (data) {
      setAffiliates(data);
    }
  };

  const loadCompanyId = async () => {
    if (!profile?.id) return;

    const { data } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (data) {
      setCompanyId(data.id);
    }
  };

  const loadProducts = async () => {
    setLoading(true);

    if (isCompany && profile?.id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (companyData) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('company_id', companyData.id)
          .order('created_at', { ascending: false });

        setProducts(data || []);
      }
    } else {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      setCompanies(data || []);

      if (profile?.id) {
        const { data: partnershipData } = await supabase
          .from('affiliate_partnerships')
          .select('company_id')
          .eq('affiliate_id', profile.id);

        if (partnershipData) {
          setPartnerships(new Set(partnershipData.map((p) => p.company_id)));
        }
      }
    }

    setLoading(false);
  };

  const resetForm = () => {
    setNewProduct({
      name: '',
      description: '',
      image_url: '',
      commission_rate: '',
      commission_type: 'percentage',
      product_url: '',
      lp_headline: '',
      lp_description: '',
      lp_cta_text: 'Get Started',
      lp_cta_type: 'signup',
      lp_hero_image: '',
      affiliate_discount_enabled: false,
      affiliate_discount_type: 'percentage',
      affiliate_discount_value: '',
      sale_type: 'lead_generation',
      product_price: '',
      currency: 'USD',
      inventory_tracking: false,
      inventory_quantity: '',
      external_checkout_url: '',
      access_type: 'public',
    });
    setSelectedAffiliates(new Set());
    setEditingProductId(null);
  };

  const handleEditProduct = async (product: Product) => {
    setNewProduct({
      name: product.name,
      description: product.description || '',
      image_url: product.image_url || '',
      commission_rate: product.commission_rate.toString(),
      commission_type: product.commission_type,
      product_url: product.product_url || '',
      lp_headline: product.lp_headline || '',
      lp_description: product.lp_description || '',
      lp_cta_text: product.lp_cta_text || 'Get Started',
      lp_cta_type: product.lp_cta_type || 'signup',
      lp_hero_image: product.lp_hero_image || '',
      affiliate_discount_enabled: product.affiliate_discount_enabled || false,
      affiliate_discount_type: product.affiliate_discount_type || 'percentage',
      affiliate_discount_value: product.affiliate_discount_value?.toString() || '',
      sale_type: product.sale_type || 'lead_generation',
      product_price: product.product_price?.toString() || '',
      currency: product.currency || 'USD',
      inventory_tracking: product.inventory_tracking || false,
      inventory_quantity: product.inventory_quantity?.toString() || '',
      external_checkout_url: product.external_checkout_url || '',
      access_type: (product as any).access_type || 'public',
    });

    const { data: accessData } = await supabase
      .from('product_affiliate_access')
      .select('affiliate_id')
      .eq('product_id', product.id);

    if (accessData) {
      setSelectedAffiliates(new Set(accessData.map(a => a.affiliate_id)));
    }

    setEditingProductId(product.id);
    setShowAddModal(true);
  };

  const handleAddProduct = async () => {
    if (!newProduct.name) {
      Alert.alert('Required Field', 'Please enter a product name');
      return;
    }

    if (!companyId) {
      Alert.alert('Error', 'Company not found. Please try logging out and back in.');
      return;
    }

    setSaving(true);

    try {
      const productData = {
        company_id: companyId,
        name: newProduct.name,
        description: newProduct.description,
        image_url: newProduct.image_url,
        commission_rate: parseFloat(newProduct.commission_rate) || 0,
        commission_type: newProduct.commission_type,
        is_active: true,
        product_url: newProduct.product_url,
        lp_headline: newProduct.lp_headline,
        lp_description: newProduct.lp_description,
        lp_cta_text: newProduct.lp_cta_text,
        lp_cta_type: newProduct.lp_cta_type,
        lp_hero_image: newProduct.lp_hero_image,
        affiliate_discount_enabled: newProduct.affiliate_discount_enabled,
        affiliate_discount_type: newProduct.affiliate_discount_enabled ? newProduct.affiliate_discount_type : null,
        affiliate_discount_value: newProduct.affiliate_discount_enabled && newProduct.affiliate_discount_value
          ? parseFloat(newProduct.affiliate_discount_value)
          : null,
        sale_type: newProduct.sale_type,
        product_price: newProduct.product_price ? parseFloat(newProduct.product_price) : null,
        currency: newProduct.currency,
        inventory_tracking: newProduct.inventory_tracking,
        inventory_quantity: newProduct.inventory_tracking && newProduct.inventory_quantity
          ? parseInt(newProduct.inventory_quantity)
          : null,
        external_checkout_url: newProduct.external_checkout_url || null,
        access_type: newProduct.access_type,
      };

      let error;
      let productId = editingProductId;

      if (editingProductId) {
        const result = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProductId);
        error = result.error;
      } else {
        const result = await supabase.from('products').insert(productData).select('id').single();
        error = result.error;
        if (!error && result.data) {
          productId = result.data.id;
        }
      }

      if (error) {
        console.error('Database error:', error);
        Alert.alert('Error', `Failed to ${editingProductId ? 'update' : 'add'} product: ` + error.message);
        setSaving(false);
        return;
      }

      if (productId && newProduct.access_type === 'restricted') {
        await supabase
          .from('product_affiliate_access')
          .delete()
          .eq('product_id', productId);

        if (selectedAffiliates.size > 0) {
          const accessRecords = Array.from(selectedAffiliates).map(affiliateId => ({
            product_id: productId,
            affiliate_id: affiliateId,
            granted_by: profile?.id,
          }));

          const { error: accessError } = await supabase
            .from('product_affiliate_access')
            .insert(accessRecords);

          if (accessError) {
            console.error('Access error:', accessError);
            Alert.alert('Warning', 'Product saved but failed to set affiliate access');
          }
        }
      } else if (productId && newProduct.access_type === 'public') {
        await supabase
          .from('product_affiliate_access')
          .delete()
          .eq('product_id', productId);
      }

      Alert.alert('Success', `Product ${editingProductId ? 'updated' : 'added'} successfully!`);
      setShowAddModal(false);
      resetForm();
      await loadProducts();
    } catch (err) {
      console.error('Unexpected error:', err);
      Alert.alert('Error', 'An unexpected error occurred: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPartnership = async (companyId: string) => {
    if (!profile?.id) return;

    const affiliateCode = `${profile.id.slice(0, 8)}-${companyId.slice(0, 8)}`;

    const { error } = await supabase.from('affiliate_partnerships').insert({
      affiliate_id: profile.id,
      company_id: companyId,
      affiliate_code: affiliateCode,
      status: 'pending',
    });

    if (!error) {
      Alert.alert('Success', 'Partnership request sent!');
      setPartnerships(new Set([...partnerships, companyId]));
    } else if (error.message.includes('duplicate')) {
      Alert.alert('Already Requested', 'You already have a partnership with this company');
    } else {
      Alert.alert('Error', 'Failed to request partnership: ' + error.message);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (Platform.OS === 'web') {
      const confirmed = confirm('Are you sure you want to delete this product?');
      if (!confirmed) return;
    } else {
      Alert.alert(
        'Delete Product',
        'Are you sure you want to delete this product?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await performDelete(productId);
            },
          },
        ]
      );
      return;
    }

    await performDelete(productId);
  };

  const performDelete = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      Alert.alert('Success', 'Product deleted successfully!');
      await loadProducts();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete product');
      console.error(error);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.imageWrapper}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        {isCompany && (
          <>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditProduct(item)}
            >
              <Pencil size={16} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteProduct(item.id)}
            >
              <X size={18} color="#fff" strokeWidth={3} />
            </TouchableOpacity>
          </>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description || 'No description'}
        </Text>
        <View style={styles.commissionBadge}>
          <Text style={styles.commissionText}>
            {item.commission_type === 'percentage'
              ? `${item.commission_rate}% Commission`
              : `$${item.commission_rate} per sale`}
          </Text>
        </View>
        {isCompany && (
          <View style={styles.productActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                router.push({
                  pathname: '/product/[id]/templates',
                  params: { id: item.id },
                })
              }
            >
              <Layout size={16} color="#60A5FA" />
              <Text style={styles.actionButtonText}>Templates</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                router.push({
                  pathname: '/product/[id]/access',
                  params: { id: item.id },
                })
              }
            >
              <Text style={styles.actionButtonText}>Access</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderCompany = ({ item }: { item: Company }) => {
    const hasPartnership = partnerships.has(item.id);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => Alert.alert('View Company', `You clicked on ${item.company_name}`)}
      >
        <View style={styles.imageWrapper}>
          {item.logo_url ? (
            <Image source={{ uri: item.logo_url }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage]}>
              <Text style={styles.placeholderText}>No Logo</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.company_name}</Text>
          <Text style={styles.productDescription} numberOfLines={3}>
            {item.description || 'No description'}
          </Text>
          {!hasPartnership ? (
            <TouchableOpacity
              style={styles.applyButton}
              onPress={(e) => {
                e.stopPropagation();
                handleRequestPartnership(item.id);
              }}
            >
              <Text style={styles.applyButtonText}>Request Partnership</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.partnershipBadge}>
              <Text style={styles.partnershipBadgeText}>Partnership Active</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isCompany) {
    return (
      <View style={styles.container}>
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProducts} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.emptySubtitle}>
                Create your first product to start working with affiliates
              </Text>
            </View>
          }
        />

        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>

        <Modal visible={showAddModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingProductId ? 'Edit Product' : 'Add New Product'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  <X size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm}>
                <Text style={styles.label}>Product Name</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.name}
                  onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
                  placeholder="My Awesome Product"
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newProduct.description}
                  onChangeText={(text) => setNewProduct({ ...newProduct, description: text })}
                  placeholder="Tell affiliates about this product"
                  multiline
                />

                <Text style={styles.label}>Product URL</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.product_url}
                  onChangeText={(text) => setNewProduct({ ...newProduct, product_url: text })}
                  placeholder="https://yoursite.com/product"
                />

                <Text style={styles.label}>Image URL</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.image_url}
                  onChangeText={(text) => setNewProduct({ ...newProduct, image_url: text })}
                  placeholder="https://example.com/image.jpg"
                />

                <Text style={styles.label}>Commission Rate</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.commission_rate}
                  onChangeText={(text) => setNewProduct({ ...newProduct, commission_rate: text })}
                  placeholder="10"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Commission Type</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newProduct.commission_type === 'percentage' && styles.typeButtonActive,
                    ]}
                    onPress={() => setNewProduct({ ...newProduct, commission_type: 'percentage' })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        newProduct.commission_type === 'percentage' && styles.typeButtonTextActive,
                      ]}
                    >
                      Percentage
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newProduct.commission_type === 'fixed' && styles.typeButtonActive,
                    ]}
                    onPress={() => setNewProduct({ ...newProduct, commission_type: 'fixed' })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        newProduct.commission_type === 'fixed' && styles.typeButtonTextActive,
                      ]}
                    >
                      Fixed Amount
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeader}>Sale Type & Pricing</Text>
                <Text style={styles.helperText}>
                  Choose how this product will be sold - as a lead generation tool or direct sale
                </Text>

                <Text style={styles.label}>Sale Type</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newProduct.sale_type === 'lead_generation' && styles.typeButtonActive,
                    ]}
                    onPress={() => setNewProduct({ ...newProduct, sale_type: 'lead_generation' })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        newProduct.sale_type === 'lead_generation' && styles.typeButtonTextActive,
                      ]}
                    >
                      Lead Generation
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newProduct.sale_type === 'direct_sale' && styles.typeButtonActive,
                    ]}
                    onPress={() => setNewProduct({ ...newProduct, sale_type: 'direct_sale' })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        newProduct.sale_type === 'direct_sale' && styles.typeButtonTextActive,
                      ]}
                    >
                      Direct Sale
                    </Text>
                  </TouchableOpacity>
                </View>

                {newProduct.sale_type === 'direct_sale' && (
                  <>
                    <Text style={styles.label}>Product Price</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.currencySymbol}>$</Text>
                      <TextInput
                        style={[styles.input, styles.priceInput]}
                        value={newProduct.product_price}
                        onChangeText={(text) => setNewProduct({ ...newProduct, product_price: text })}
                        placeholder="99.00"
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <Text style={styles.label}>Currency</Text>
                    <TextInput
                      style={styles.input}
                      value={newProduct.currency}
                      onChangeText={(text) => setNewProduct({ ...newProduct, currency: text.toUpperCase() })}
                      placeholder="USD"
                      maxLength={3}
                    />

                    <Text style={styles.label}>External Checkout URL (Optional)</Text>
                    <Text style={styles.helperText}>
                      If you have your own checkout system, enter the URL here
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={newProduct.external_checkout_url}
                      onChangeText={(text) => setNewProduct({ ...newProduct, external_checkout_url: text })}
                      placeholder="https://yoursite.com/checkout"
                    />

                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setNewProduct({ ...newProduct, inventory_tracking: !newProduct.inventory_tracking })}
                    >
                      <View style={[styles.checkbox, newProduct.inventory_tracking && styles.checkboxActive]}>
                        {newProduct.inventory_tracking && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.checkboxLabel}>Enable inventory tracking</Text>
                    </TouchableOpacity>

                    {newProduct.inventory_tracking && (
                      <>
                        <Text style={styles.label}>Inventory Quantity</Text>
                        <TextInput
                          style={styles.input}
                          value={newProduct.inventory_quantity}
                          onChangeText={(text) => setNewProduct({ ...newProduct, inventory_quantity: text })}
                          placeholder="100"
                          keyboardType="numeric"
                        />
                      </>
                    )}
                  </>
                )}

                <Text style={styles.sectionHeader}>Affiliate Link Discount</Text>
                <Text style={styles.helperText}>
                  Offer customers a special discount when they come through affiliate links
                </Text>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setNewProduct({ ...newProduct, affiliate_discount_enabled: !newProduct.affiliate_discount_enabled })}
                >
                  <View style={[styles.checkbox, newProduct.affiliate_discount_enabled && styles.checkboxActive]}>
                    {newProduct.affiliate_discount_enabled && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Enable affiliate discount</Text>
                </TouchableOpacity>

                {newProduct.affiliate_discount_enabled && (
                  <>
                    <Text style={styles.label}>Discount Type</Text>
                    <View style={styles.typeSelector}>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          newProduct.affiliate_discount_type === 'percentage' && styles.typeButtonActive,
                        ]}
                        onPress={() => setNewProduct({ ...newProduct, affiliate_discount_type: 'percentage' })}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            newProduct.affiliate_discount_type === 'percentage' && styles.typeButtonTextActive,
                          ]}
                        >
                          Percentage
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          newProduct.affiliate_discount_type === 'fixed_amount' && styles.typeButtonActive,
                        ]}
                        onPress={() => setNewProduct({ ...newProduct, affiliate_discount_type: 'fixed_amount' })}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            newProduct.affiliate_discount_type === 'fixed_amount' && styles.typeButtonTextActive,
                          ]}
                        >
                          Fixed Amount
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>
                      Discount Value ({newProduct.affiliate_discount_type === 'percentage' ? '%' : '$'})
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={newProduct.affiliate_discount_value}
                      onChangeText={(text) => setNewProduct({ ...newProduct, affiliate_discount_value: text })}
                      placeholder={newProduct.affiliate_discount_type === 'percentage' ? '10' : '50'}
                      keyboardType="numeric"
                    />
                  </>
                )}

                <Text style={styles.sectionHeader}>Landing Page Template</Text>

                <Text style={styles.label}>Landing Page Headline</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.lp_headline}
                  onChangeText={(text) => setNewProduct({ ...newProduct, lp_headline: text })}
                  placeholder="Get started with our amazing product"
                />

                <Text style={styles.label}>Landing Page Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newProduct.lp_description}
                  onChangeText={(text) => setNewProduct({ ...newProduct, lp_description: text })}
                  placeholder="Describe the key benefits and features"
                  multiline
                />

                <Text style={styles.label}>Hero Image URL</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.lp_hero_image}
                  onChangeText={(text) => setNewProduct({ ...newProduct, lp_hero_image: text })}
                  placeholder="https://example.com/hero-image.jpg"
                />

                <Text style={styles.label}>CTA Button Text</Text>
                <TextInput
                  style={styles.input}
                  value={newProduct.lp_cta_text}
                  onChangeText={(text) => setNewProduct({ ...newProduct, lp_cta_text: text })}
                  placeholder="Get Started"
                />

                <Text style={styles.label}>CTA Type</Text>
                <View style={styles.ctaTypeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.ctaTypeButton,
                      newProduct.lp_cta_type === 'signup' && styles.ctaTypeButtonActive,
                    ]}
                    onPress={() => setNewProduct({ ...newProduct, lp_cta_type: 'signup' })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        newProduct.lp_cta_type === 'signup' && styles.typeButtonTextActive,
                      ]}
                    >
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.ctaTypeButton,
                      newProduct.lp_cta_type === 'learn_more' && styles.ctaTypeButtonActive,
                    ]}
                    onPress={() => setNewProduct({ ...newProduct, lp_cta_type: 'learn_more' })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        newProduct.lp_cta_type === 'learn_more' && styles.typeButtonTextActive,
                      ]}
                    >
                      Learn More
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.ctaTypeButton,
                      newProduct.lp_cta_type === 'schedule_demo' && styles.ctaTypeButtonActive,
                    ]}
                    onPress={() => setNewProduct({ ...newProduct, lp_cta_type: 'schedule_demo' })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        newProduct.lp_cta_type === 'schedule_demo' && styles.typeButtonTextActive,
                      ]}
                    >
                      Schedule Demo
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeader}>Affiliate Access Control</Text>
                <Text style={styles.helperText}>
                  Choose who can promote this product
                </Text>

                <Text style={styles.label}>Access Type</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newProduct.access_type === 'public' && styles.typeButtonActive,
                    ]}
                    onPress={() => setNewProduct({ ...newProduct, access_type: 'public' })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        newProduct.access_type === 'public' && styles.typeButtonTextActive,
                      ]}
                    >
                      Public
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newProduct.access_type === 'restricted' && styles.typeButtonActive,
                    ]}
                    onPress={() => setNewProduct({ ...newProduct, access_type: 'restricted' })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        newProduct.access_type === 'restricted' && styles.typeButtonTextActive,
                      ]}
                    >
                      Restricted
                    </Text>
                  </TouchableOpacity>
                </View>

                {newProduct.access_type === 'restricted' && (
                  <>
                    <Text style={styles.label}>Select Affiliates</Text>
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
                          onPress={() => {
                            const newSet = new Set(selectedAffiliates);
                            if (newSet.has(affiliate.id)) {
                              newSet.delete(affiliate.id);
                            } else {
                              newSet.add(affiliate.id);
                            }
                            setSelectedAffiliates(newSet);
                          }}
                        >
                          <View style={[styles.checkbox, selectedAffiliates.has(affiliate.id) && styles.checkboxActive]}>
                            {selectedAffiliates.has(affiliate.id) && <Text style={styles.checkmark}>✓</Text>}
                          </View>
                          <View style={styles.affiliateInfo}>
                            <Text style={styles.affiliateName}>{affiliate.full_name}</Text>
                            <Text style={styles.affiliateEmail}>{affiliate.email}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                      {affiliates.length === 0 && (
                        <Text style={styles.emptyText}>No affiliates found</Text>
                      )}
                    </View>
                  </>
                )}

                <TouchableOpacity
                  style={[styles.addButton, saving && styles.addButtonDisabled]}
                  onPress={handleAddProduct}
                  disabled={saving}
                >
                  <Text style={styles.addButtonText}>
                    {saving
                      ? editingProductId
                        ? 'Updating Product...'
                        : 'Adding Product...'
                      : editingProductId
                      ? 'Update Product'
                      : 'Add Product'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={companies}
        renderItem={renderCompany}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProducts} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No companies available</Text>
            <Text style={styles.emptySubtitle}>
              Check back later for new companies to partner with
            </Text>
          </View>
        }
      />
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
  productCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  editButton: {
    position: 'absolute',
    top: 12,
    right: 52,
    zIndex: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  imageWrapper: {
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#0F172A',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#64748B',
    fontSize: 16,
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
    lineHeight: 20,
  },
  commissionBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  commissionText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  templatesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
    marginTop: 8,
  },
  templatesButtonText: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '600',
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  actionButtonText: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  partnershipBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  partnershipBadgeText: {
    color: '#10B981',
    fontSize: 16,
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
  modalForm: {
    padding: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  typeButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E293B',
  },
  ctaTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  ctaTypeButton: {
    flexBasis: '30%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  ctaTypeButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E293B',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  typeButtonTextActive: {
    color: '#60A5FA',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
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
  helperText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#334155',
    marginRight: 12,
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
  checkboxLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    marginBottom: 0,
  },
  affiliateList: {
    marginBottom: 20,
    maxHeight: 300,
  },
  affiliateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  affiliateItemSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});

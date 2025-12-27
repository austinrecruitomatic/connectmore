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
import * as ImagePicker from 'expo-image-picker';
import { Plus, X, Trash2, Pencil, Layout, Star, TrendingUp, Users, DollarSign, Target, Upload } from 'lucide-react-native';
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
  average_rating: number;
  total_reviews: number;
  business_category: string;
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
  const [uploading, setUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [productImageFile, setProductImageFile] = useState<string | null>(null);
  const [heroImageFile, setHeroImageFile] = useState<string | null>(null);

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
    form_id: '',
  });

  const [affiliates, setAffiliates] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [selectedAffiliates, setSelectedAffiliates] = useState<Set<string>>(new Set());
  const [customForms, setCustomForms] = useState<Array<{ id: string; name: string }>>([]);

  const [affiliateStats, setAffiliateStats] = useState({
    totalLeads: 0,
    totalDeals: 0,
    conversionRate: 0,
    totalCommissions: 0,
    activePartnerships: 0,
  });

  useEffect(() => {
    if (profile) {
      loadProducts();
      if (isCompany) {
        loadCompanyId();
        loadAffiliates();
        loadCustomForms();
      } else {
        loadAffiliateStats();
      }
    }
  }, [profile, isCompany]);

  const loadCustomForms = async () => {
    if (!profile?.id) return;

    const { data } = await supabase
      .from('custom_forms')
      .select('id, name')
      .eq('company_id', profile.id)
      .eq('is_active', true)
      .order('name');

    if (data) {
      setCustomForms(data);
    }
  };

  const loadAffiliateStats = async () => {
    if (!profile?.id) return;

    try {
      const [leadsRes, dealsRes, commissionsRes, partnershipsRes] = await Promise.all([
        supabase
          .from('contact_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('affiliate_id', profile.id),
        supabase
          .from('deals')
          .select('id', { count: 'exact', head: true })
          .eq('affiliate_id', profile.id),
        supabase
          .from('commissions')
          .select('affiliate_payout_amount')
          .eq('affiliate_id', profile.id)
          .in('status', ['approved', 'paid']),
        supabase
          .from('affiliate_partnerships')
          .select('id', { count: 'exact', head: true })
          .eq('affiliate_id', profile.id)
          .eq('status', 'approved'),
      ]);

      const totalLeads = leadsRes.count || 0;
      const totalDeals = dealsRes.count || 0;
      const conversionRate = totalLeads > 0 ? (totalDeals / totalLeads) * 100 : 0;
      const totalCommissions = commissionsRes.data?.reduce((sum, c) => sum + (parseFloat(c.affiliate_payout_amount as any) || 0), 0) || 0;
      const activePartnerships = partnershipsRes.count || 0;

      setAffiliateStats({
        totalLeads,
        totalDeals,
        conversionRate,
        totalCommissions,
        activePartnerships,
      });
    } catch (error) {
      console.error('Error loading affiliate stats:', error);
    }
  };

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
        .order('average_rating', { ascending: false })
        .order('total_reviews', { ascending: false });

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
      form_id: '',
    });
    setProductImageFile(null);
    setHeroImageFile(null);
    setSelectedAffiliates(new Set());
    setEditingProductId(null);
  };

  const pickProductImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProductImageFile(result.assets[0].uri);
      setNewProduct({ ...newProduct, image_url: '' });
    }
  };

  const uploadProductImage = async (): Promise<string | null> => {
    if (!productImageFile) return newProduct.image_url || null;

    try {
      setUploading(true);

      const response = await fetch(productImageFile);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const fileExt = productImageFile.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${companyId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const removeProductImage = () => {
    setProductImageFile(null);
    setNewProduct({ ...newProduct, image_url: '' });
  };

  const pickHeroImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setHeroImageFile(result.assets[0].uri);
      setNewProduct({ ...newProduct, lp_hero_image: '' });
    }
  };

  const uploadHeroImage = async (): Promise<string | null> => {
    if (!heroImageFile) return newProduct.lp_hero_image || null;

    try {
      setUploading(true);

      const response = await fetch(heroImageFile);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const fileExt = heroImageFile.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${companyId}/hero/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading hero image:', error);
      Alert.alert('Error', 'Failed to upload hero image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const removeHeroImage = () => {
    setHeroImageFile(null);
    setNewProduct({ ...newProduct, lp_hero_image: '' });
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
      form_id: (product as any).form_id || '',
    });

    const { data: accessData } = await supabase
      .from('product_affiliate_access')
      .select('affiliate_id')
      .eq('product_id', product.id);

    if (accessData) {
      setSelectedAffiliates(new Set(accessData.map(a => a.affiliate_id)));
    }

    setProductImageFile(null);
    setHeroImageFile(null);
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
      let finalImageUrl = newProduct.image_url;
      let finalHeroImageUrl = newProduct.lp_hero_image;

      if (productImageFile) {
        const uploadedUrl = await uploadProductImage();
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      }

      if (heroImageFile) {
        const uploadedHeroUrl = await uploadHeroImage();
        if (uploadedHeroUrl) {
          finalHeroImageUrl = uploadedHeroUrl;
        }
      }

      const productData = {
        company_id: companyId,
        name: newProduct.name,
        description: newProduct.description,
        image_url: finalImageUrl,
        commission_rate: parseFloat(newProduct.commission_rate) || 0,
        commission_type: newProduct.commission_type,
        is_active: true,
        product_url: newProduct.product_url,
        lp_headline: newProduct.lp_headline,
        lp_description: newProduct.lp_description,
        lp_cta_text: newProduct.lp_cta_text,
        lp_cta_type: newProduct.lp_cta_type,
        lp_hero_image: finalHeroImageUrl,
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
        form_id: newProduct.form_id || null,
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
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{item.name}</Text>
          <View
            style={[
              styles.saleTypeBadge,
              item.sale_type === 'direct_sale'
                ? styles.saleTypeBadgeDirectSale
                : styles.saleTypeBadgeLeadGen,
            ]}
          >
            <Text style={styles.saleTypeText}>
              {item.sale_type === 'direct_sale' ? 'Direct Sale' : 'Lead Gen'}
            </Text>
          </View>
        </View>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description || 'No description'}
        </Text>
        {item.sale_type === 'direct_sale' && item.external_checkout_url ? (
          <Text style={styles.checkoutUrlText} numberOfLines={1}>
            Checkout: {item.external_checkout_url}
          </Text>
        ) : null}
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

  const renderCompany = (item: Company) => {
    const hasPartnership = partnerships.has(item.id);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.companyCard}
        onPress={() => router.push({ pathname: '/company/[id]', params: { id: item.id } })}
      >
        <View style={styles.companyImageWrapper}>
          {item.logo_url ? (
            <Image source={{ uri: item.logo_url }} style={styles.companyImage} />
          ) : (
            <View style={[styles.companyImage, styles.placeholderImage]}>
              <Text style={styles.placeholderText}>No Logo</Text>
            </View>
          )}
        </View>
        <View style={styles.companyInfo}>
          <Text style={styles.companyCardName} numberOfLines={1}>{item.company_name}</Text>

          <View style={styles.ratingRow}>
            <Star size={16} color="#F59E0B" fill={item.average_rating > 0 ? '#F59E0B' : 'transparent'} />
            <Text style={styles.ratingText}>
              {item.average_rating > 0 ? item.average_rating.toFixed(1) : 'No reviews'}
            </Text>
            {item.total_reviews > 0 && (
              <Text style={styles.reviewCount}>({item.total_reviews})</Text>
            )}
          </View>

          <Text style={styles.companyCardDescription} numberOfLines={2}>
            {item.description || 'No description'}
          </Text>

          {!hasPartnership ? (
            <TouchableOpacity
              style={styles.companyCardButton}
              onPress={(e) => {
                e.stopPropagation();
                handleRequestPartnership(item.id);
              }}
            >
              <Text style={styles.companyCardButtonText}>Request Partnership</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.companyCardBadge}>
              <Text style={styles.companyCardBadgeText}>Partner</Text>
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

                <Text style={styles.label}>Product Image</Text>

                {productImageFile || newProduct.image_url ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: productImageFile || newProduct.image_url }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity style={styles.removeImageButton} onPress={removeProductImage}>
                      <X size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={pickProductImage}
                  disabled={uploading}
                >
                  <Upload size={20} color="#60A5FA" />
                  <Text style={styles.uploadButtonText}>
                    {productImageFile || newProduct.image_url ? 'Change Image' : 'Upload Image'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.helperText}>Recommended: Square ratio (e.g., 800x800px)</Text>

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

                <Text style={styles.sectionHeader}>Custom Form (Optional)</Text>
                <Text style={styles.helperText}>
                  Attach a custom form to capture additional information from leads or customers
                </Text>

                <Text style={styles.label}>Select Form</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      !newProduct.form_id && styles.typeButtonActive,
                    ]}
                    onPress={() => setNewProduct({ ...newProduct, form_id: '' })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        !newProduct.form_id && styles.typeButtonTextActive,
                      ]}
                    >
                      No Form
                    </Text>
                  </TouchableOpacity>
                  {customForms.map((form) => (
                    <TouchableOpacity
                      key={form.id}
                      style={[
                        styles.typeButton,
                        newProduct.form_id === form.id && styles.typeButtonActive,
                      ]}
                      onPress={() => setNewProduct({ ...newProduct, form_id: form.id })}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          newProduct.form_id === form.id && styles.typeButtonTextActive,
                        ]}
                      >
                        {form.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {customForms.length === 0 && (
                  <Text style={styles.helperText}>
                    No forms available. Create a form in the Forms tab first.
                  </Text>
                )}

                <Text style={styles.sectionHeader}>Sale Type & Pricing</Text>

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

                {newProduct.sale_type === 'lead_generation' ? (
                  <Text style={styles.helperText}>
                    Affiliates will send customers to a landing page with a contact form. You'll receive leads and can follow up directly.
                  </Text>
                ) : (
                  <Text style={styles.helperText}>
                    Affiliates will send customers directly to your checkout page. Perfect for event tickets, products, or services with online purchase.
                  </Text>
                )}

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

                    <Text style={styles.label}>Checkout URL</Text>
                    <Text style={styles.helperText}>
                      Affiliates will send customers directly to this URL. We'll automatically add their tracking code (e.g., ?ref=ABC123)
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={newProduct.external_checkout_url}
                      onChangeText={(text) => setNewProduct({ ...newProduct, external_checkout_url: text })}
                      placeholder="https://yoursite.com/checkout/event-ticket"
                      autoCapitalize="none"
                      keyboardType="url"
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

                <Text style={styles.label}>Hero Image</Text>

                {heroImageFile || newProduct.lp_hero_image ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: heroImageFile || newProduct.lp_hero_image }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity style={styles.removeImageButton} onPress={removeHeroImage}>
                      <X size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={pickHeroImage}
                  disabled={uploading}
                >
                  <Upload size={20} color="#60A5FA" />
                  <Text style={styles.uploadButtonText}>
                    {heroImageFile || newProduct.lp_hero_image ? 'Change Image' : 'Upload Image'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.helperText}>Recommended: 16:9 ratio (e.g., 1200x675px)</Text>

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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProducts} />}
    >
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Your Performance</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrapper}>
              <Target size={20} color="#60A5FA" />
            </View>
            <Text style={styles.statValue}>{affiliateStats.totalLeads}</Text>
            <Text style={styles.statLabel}>Total Leads</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconWrapper}>
              <TrendingUp size={20} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{affiliateStats.totalDeals}</Text>
            <Text style={styles.statLabel}>Conversions</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconWrapper}>
              <Users size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{affiliateStats.activePartnerships}</Text>
            <Text style={styles.statLabel}>Active Partners</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconWrapper}>
              <DollarSign size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.statValue}>${affiliateStats.totalCommissions.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
        </View>

        {affiliateStats.totalLeads > 0 && (
          <View style={styles.conversionBanner}>
            <Text style={styles.conversionLabel}>Conversion Rate</Text>
            <Text style={styles.conversionValue}>{affiliateStats.conversionRate.toFixed(1)}%</Text>
          </View>
        )}
      </View>

      <View style={styles.topRatedSection}>
        <Text style={styles.sectionTitle}>Top Rated Companies</Text>
        {companies.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No companies available</Text>
            <Text style={styles.emptySubtitle}>
              Check back later for new companies to partner with
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {companies.map((company) => renderCompany(company))}
          </ScrollView>
        )}
      </View>
    </ScrollView>
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
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  saleTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  saleTypeBadgeDirectSale: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  saleTypeBadgeLeadGen: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  saleTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checkoutUrlText: {
    fontSize: 12,
    color: '#60A5FA',
    marginBottom: 8,
    fontStyle: 'italic',
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
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#60A5FA',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#60A5FA',
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
  statsSection: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  topRatedSection: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  conversionBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  conversionValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
  },
  horizontalScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  companyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    width: 280,
    overflow: 'hidden',
  },
  companyImageWrapper: {
    width: '100%',
    height: 140,
    backgroundColor: '#0F172A',
  },
  companyImage: {
    width: '100%',
    height: '100%',
  },
  companyInfo: {
    padding: 16,
  },
  companyCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  reviewCount: {
    fontSize: 13,
    color: '#94A3B8',
  },
  companyCardDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
    lineHeight: 18,
    height: 36,
  },
  companyCardButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  companyCardButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  companyCardBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  companyCardBadgeText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
});

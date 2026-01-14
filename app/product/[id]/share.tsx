import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, MessageSquare, ExternalLink, X, ArrowLeft } from 'lucide-react-native';
import BackButton from '@/components/BackButton';
import CustomFormRenderer from '@/components/CustomFormRenderer';

type Product = {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  product_price?: number;
  currency?: string;
  company_id: string;
  sale_type: 'lead_generation' | 'direct_sale';
  commission_rate: number;
  commission_type: string;
  external_checkout_url?: string;
  affiliate_discount_enabled?: boolean;
  affiliate_discount_type?: string;
  affiliate_discount_value?: number;
  lp_headline?: string;
  lp_description?: string;
  lp_cta_text?: string;
  lp_hero_image?: string;
  form_id?: string;
};

type Company = {
  company_name: string;
  logo_url?: string;
};

type Partnership = {
  id: string;
  affiliate_id: string;
  company_id: string;
  affiliate_code: string;
};

export default function ProductShare() {
  const { id } = useLocalSearchParams();
  const params = useLocalSearchParams();
  const affiliateRef = params.ref as string || params.affiliate as string;
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    message: '',
    customer_referral_code: '',
  });

  useEffect(() => {
    loadProductData();
  }, [id, affiliateRef]);

  const loadProductData = async () => {
    try {
      setLoading(true);
      console.log('Loading product data...', { id, affiliateRef });

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle();

      if (productError || !productData) {
        console.error('Product not found:', productError);
        throw new Error('Product not found');
      }

      console.log('[ProductShare] Product loaded:', productData.name, 'form_id:', productData.form_id);
      setProduct(productData);

      const { data: companyData } = await supabase
        .from('companies')
        .select('company_name, logo_url')
        .eq('id', productData.company_id)
        .maybeSingle();

      if (companyData) {
        console.log('Company loaded:', companyData.company_name);
        setCompany(companyData);
      }

      if (affiliateRef) {
        console.log('Looking up partnership with ref:', affiliateRef);
        // Check if affiliateRef is a valid UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUuid = uuidRegex.test(affiliateRef);

        let query = supabase
          .from('affiliate_partnerships')
          .select('id, affiliate_id, company_id, affiliate_code')
          .eq('company_id', productData.company_id)
          .eq('status', 'approved');

        // If it's a UUID, check both affiliate_id and affiliate_code
        // If not, only check affiliate_code
        if (isUuid) {
          query = query.or(`affiliate_code.eq.${affiliateRef},affiliate_id.eq.${affiliateRef}`);
        } else {
          query = query.eq('affiliate_code', affiliateRef);
        }

        const { data: partnershipData, error: partnershipError } = await query.maybeSingle();

        if (partnershipError) {
          console.error('Partnership query error:', partnershipError);
        }

        if (partnershipData) {
          console.log('Partnership found:', partnershipData.id);
          setPartnership(partnershipData);

          await supabase.from('leads').insert({
            partnership_id: partnershipData.id,
            lead_type: 'view',
            lead_data: {
              source: 'product_share_link',
              product_id: productData.id,
            },
          });
        } else {
          console.warn('No partnership found for affiliate ref:', affiliateRef);
        }
      } else {
        console.log('No affiliate ref provided');
      }
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Failed to load product information');
    } finally {
      setLoading(false);
    }
  };

  const handleCTAClick = async () => {
    console.log('CTA clicked', { product: !!product, partnership: !!partnership });

    if (!product) {
      console.error('No product found');
      Alert.alert('Error', 'Product information not available');
      return;
    }

    if (!partnership) {
      console.error('No partnership found');
      Alert.alert('Invalid Link', 'This product link requires a valid affiliate referral code. Please contact the person who shared this link with you.');
      return;
    }

    setShowContactForm(true);
  };

  const handleSubmitContact = async (customFormResponses: Record<string, any>) => {
    if (!product || !partnership) return;

    let fullName = '';
    let email = '';
    let phone = '';
    let companyName = null;
    let message = null;
    let customerReferralCode = null;

    if (product.form_id) {
      const firstName = customFormResponses['First Name'] || '';
      const lastName = customFormResponses['Last Name'] || '';
      email = customFormResponses['Email Address'] || '';
      phone = customFormResponses['Phone Number'] || '';
      fullName = `${firstName} ${lastName}`.trim();
    } else {
      fullName = customFormResponses.name || '';
      email = customFormResponses.email || '';
      phone = customFormResponses.phone || '';
      companyName = customFormResponses.company_name || null;
      message = customFormResponses.message || null;
      customerReferralCode = customFormResponses.customer_referral_code || null;
    }

    setSubmitting(true);

    try {
      const { data: submission, error: submissionError } = await supabase
        .from('contact_submissions')
        .insert({
          partnership_id: partnership.id,
          product_id: product.id,
          landing_page_slug: `product-${product.id}`,
          name: fullName,
          email: email,
          phone: phone || null,
          company_name: companyName,
          message: message,
          customer_referral_code: customerReferralCode,
        })
        .select()
        .single();

      if (submissionError) throw submissionError;

      if (product.form_id) {
        await supabase.from('form_submissions').insert({
          form_id: product.form_id,
          product_id: product.id,
          contact_submission_id: submission.id,
          responses: customFormResponses,
        });
      }

      await supabase.from('leads').insert({
        partnership_id: partnership.id,
        lead_type: 'signup',
        lead_data: {
          source: 'product_share_form',
          product_id: product.id,
          contact_name: fullName,
          contact_email: email,
        },
        contact_submission_id: submission.id,
      });

      setSubmitted(true);

      if (product.sale_type === 'direct_sale' && product.external_checkout_url) {
        const separator = product.external_checkout_url.includes('?') ? '&' : '?';
        const trackingUrl = `${product.external_checkout_url}${separator}ref=${partnership.affiliate_code}`;

        setTimeout(() => {
          setShowContactForm(false);
          setSubmitted(false);

          if (Platform.OS === 'web') {
            window.open(trackingUrl, '_blank');
          }
        }, 2000);
      } else {
        setTimeout(() => {
          setShowContactForm(false);
          setSubmitted(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', 'Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!partnership) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid referral link</Text>
          <Text style={styles.errorSubtext}>This link may have expired or is not valid</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const headline = product.lp_headline || product.name;
  const description = product.lp_description || product.description;
  const ctaText = product.lp_cta_text || (product.sale_type === 'direct_sale' ? 'Buy Now' : 'Get Started');
  const heroImage = product.lp_hero_image || product.image_url;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton style={styles.headerBackButton} />
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {company?.logo_url && (
          <View style={styles.logoContainer}>
            <Image source={{ uri: company.logo_url }} style={styles.logo} resizeMode="contain" />
          </View>
        )}

        {heroImage && (
          <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />
        )}

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{headline}</Text>

          {description && (
            <Text style={styles.productDescription}>{description}</Text>
          )}

          {product.sale_type === 'direct_sale' && product.product_price && (
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Price:</Text>
              <Text style={styles.price}>
                {product.currency || 'USD'} ${product.product_price.toFixed(2)}
              </Text>
            </View>
          )}

          {product.affiliate_discount_enabled && product.affiliate_discount_value && product.affiliate_discount_value > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                EXCLUSIVE OFFER: {product.affiliate_discount_type === 'percentage'
                  ? `${product.affiliate_discount_value}% OFF`
                  : `$${product.affiliate_discount_value} OFF`}
              </Text>
              <Text style={styles.discountSubtext}>Special discount through this link</Text>
            </View>
          )}

          <TouchableOpacity style={styles.ctaButton} onPress={handleCTAClick}>
            {product.sale_type === 'direct_sale' ? (
              <ShoppingBag size={20} color="#FFFFFF" />
            ) : (
              <MessageSquare size={20} color="#FFFFFF" />
            )}
            <Text style={styles.ctaButtonText}>{ctaText}</Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            {product.sale_type === 'direct_sale'
              ? 'Secure checkout powered by our platform'
              : 'Get more information and connect with our team'}
          </Text>
        </View>

        {company && (
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.bottomBackButton}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#007AFF" />
              <Text style={styles.bottomBackText}>Go Back</Text>
            </TouchableOpacity>
            <Text style={styles.poweredBy}>Powered by {company.company_name}</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showContactForm} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {submitted ? 'Thank You!' : 'Get in Touch'}
              </Text>
              <BackButton color="#94A3B8" onPress={() => setShowContactForm(false)} />
            </View>

            {submitted ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>
                  We've received your information and will contact you soon!
                </Text>
              </View>
            ) : product.form_id ? (
              <>
                {console.log('[ProductShare] Rendering CustomFormRenderer with formId:', product.form_id)}
                <CustomFormRenderer
                  formId={product.form_id}
                  onSubmit={handleSubmitContact}
                  submitButtonText={submitting ? 'Submitting...' : 'Submit'}
                />
              </>
            ) : (
              <ScrollView style={styles.formContainer}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Your full name"
                  placeholderTextColor="#64748B"
                />

                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="your.email@example.com"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="(Optional) Your phone number"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                />

                <Text style={styles.label}>Company</Text>
                <TextInput
                  style={styles.input}
                  value={formData.company_name}
                  onChangeText={(text) => setFormData({ ...formData, company_name: text })}
                  placeholder="(Optional) Your company name"
                  placeholderTextColor="#64748B"
                />

                <Text style={styles.label}>Message</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.message}
                  onChangeText={(text) => setFormData({ ...formData, message: text })}
                  placeholder="(Optional) Tell us about your needs"
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <Text style={styles.label}>Customer Referral Code</Text>
                <TextInput
                  style={styles.input}
                  value={formData.customer_referral_code}
                  onChangeText={(text) => setFormData({ ...formData, customer_referral_code: text.toUpperCase() })}
                  placeholder="(Optional) Have a referral code from a friend?"
                  placeholderTextColor="#64748B"
                  autoCapitalize="characters"
                />
                <Text style={styles.formHelperText}>
                  Enter a customer referral code to help your friend earn rewards!
                </Text>

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={() => handleSubmitContact(formData)}
                  disabled={submitting}
                >
                  <Text style={styles.submitButtonText}>
                    {submitting ? 'Submitting...' : 'Submit'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
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
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#1E293B',
  },
  logo: {
    width: 120,
    height: 60,
  },
  heroImage: {
    width: '100%',
    height: 240,
  },
  productInfo: {
    padding: 24,
  },
  productName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    lineHeight: 36,
  },
  productDescription: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 24,
    marginBottom: 24,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 16,
    color: '#94A3B8',
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: '#10B981',
  },
  discountBadge: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  discountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  discountSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E0F2FE',
  },
  ctaButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },
  bottomBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bottomBackText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  poweredBy: {
    fontSize: 14,
    color: '#64748B',
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
  formContainer: {
    padding: 20,
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
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  formHelperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  successContainer: {
    padding: 40,
    alignItems: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#10B981',
    textAlign: 'center',
    lineHeight: 24,
  },
});

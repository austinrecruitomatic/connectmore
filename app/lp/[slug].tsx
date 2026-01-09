import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, X, ExternalLink } from 'lucide-react-native';

interface LandingPageData {
  partnershipId: string;
  productId: string;
  productName: string;
  companyName: string;
  companyLogo: string;
  headline: string;
  description: string;
  ctaText: string;
  ctaType: string;
  heroImage: string;
  productUrl: string;
  affiliateCode: string;
  primaryColor?: string;
  themeStyle?: string;
  discountEnabled?: boolean;
  discountType?: 'percentage' | 'fixed_amount';
  discountValue?: number;
  saleType?: 'lead_generation' | 'direct_sale';
  externalCheckoutUrl?: string;
}

export default function LandingPageView() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<LandingPageData | null>(null);
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
    fetchLandingPage();
  }, [slug]);

  const fetchLandingPage = async () => {
    try {
      setLoading(true);

      const slugParam = slug as string;

      const { data: customPage } = await supabase
        .from('landing_pages')
        .select(`
          *,
          affiliate_partnerships (
            id,
            affiliate_code,
            company_id,
            product_id,
            companies (
              id,
              company_name,
              logo_url
            )
          ),
          landing_page_templates (
            primary_color,
            theme_style
          )
        `)
        .eq('slug', slugParam)
        .eq('is_published', true)
        .maybeSingle();

      if (customPage) {
        const partnership = customPage.affiliate_partnerships as any;
        const company = partnership?.companies;
        const content = customPage.content as any;
        const template = (customPage as any).landing_page_templates;

        const productId = partnership?.product_id || null;

        let products = null;
        if (productId) {
          const { data } = await supabase
            .from('products')
            .select('id, product_url, name, affiliate_discount_enabled, affiliate_discount_type, affiliate_discount_value')
            .eq('id', productId)
            .maybeSingle();
          products = data;
        }

        const productUrl = content?.buttonUrl || products?.product_url || '';

        const pageInfo: LandingPageData = {
          partnershipId: customPage.partnership_id || '',
          productId: products?.id || productId,
          productName: products?.name || content?.productName || 'Product',
          companyName: company?.company_name || 'Company',
          companyLogo: company?.logo_url || '',
          headline: content?.headline || '',
          description: content?.description || '',
          ctaText: content?.buttonText || 'Get Started',
          ctaType: 'signup',
          heroImage: '',
          productUrl,
          affiliateCode: content?.affiliateCode || '',
          primaryColor: template?.primary_color || '#007AFF',
          themeStyle: template?.theme_style || 'modern',
          discountEnabled: products?.affiliate_discount_enabled || false,
          discountType: products?.affiliate_discount_type || 'percentage',
          discountValue: products?.affiliate_discount_value || 0,
        };

        setPageData(pageInfo);

        await supabase.from('leads').insert({
          partnership_id: pageInfo.partnershipId,
          lead_type: 'view',
          lead_data: { source: 'custom_landing_page' },
        });

        return;
      }

      const { data: partnership, error: partnershipError } = await supabase
        .from('affiliate_partnerships')
        .select(`
          id,
          affiliate_code,
          company_id,
          product_id,
          companies (
            id,
            company_name,
            logo_url,
            description
          )
        `)
        .eq('affiliate_code', slugParam)
        .maybeSingle();

      if (partnershipError || !partnership) throw new Error('Partnership not found');

      const company = Array.isArray(partnership.companies)
        ? partnership.companies[0]
        : partnership.companies;

      let products = null;
      if (partnership.product_id) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('id', partnership.product_id)
          .maybeSingle();
        products = data;
      }

      const product = products || {};

      const pageInfo: LandingPageData = {
        partnershipId: partnership.id,
        productId: partnership.product_id || product?.id || '',
        productName: product?.name || company?.company_name || 'Product',
        companyName: company?.company_name || 'Company',
        companyLogo: company?.logo_url || '',
        headline: product?.lp_headline || `Get Started with ${company?.company_name || 'us'}`,
        description: product?.lp_description || product?.description || company?.description || '',
        ctaText: product?.lp_cta_text || 'Get Started',
        ctaType: product?.lp_cta_type || 'signup',
        heroImage: product?.lp_hero_image || '',
        productUrl: product?.product_url || '',
        affiliateCode: partnership.affiliate_code,
        discountEnabled: product?.affiliate_discount_enabled || false,
        discountType: product?.affiliate_discount_type || 'percentage',
        discountValue: product?.affiliate_discount_value || 0,
        saleType: product?.sale_type || 'lead_generation',
        externalCheckoutUrl: product?.external_checkout_url || '',
      };

      setPageData(pageInfo);

      await supabase.from('leads').insert({
        partnership_id: partnership.id,
        lead_type: 'view',
        lead_data: { source: 'landing_page' },
      });
    } catch (error) {
      console.error('Error loading landing page:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCTAClick = async () => {
    if (!pageData) return;

    if (pageData.saleType === 'direct_sale' && pageData.externalCheckoutUrl) {
      const separator = pageData.externalCheckoutUrl.includes('?') ? '&' : '?';
      const trackingUrl = `${pageData.externalCheckoutUrl}${separator}ref=${pageData.affiliateCode}`;

      await supabase.from('leads').insert({
        partnership_id: pageData.partnershipId,
        lead_type: 'click',
        lead_data: { destination: trackingUrl, type: 'checkout' },
      });

      if (Platform.OS === 'web') {
        window.open(trackingUrl, '_blank');
      } else {
        console.log('Opening checkout:', trackingUrl);
      }
    } else {
      setShowContactForm(true);
    }
  };

  const handleVisitWebsite = async () => {
    if (!pageData) return;

    const separator = pageData.productUrl.includes('?') ? '&' : '?';
    const trackingUrl = `${pageData.productUrl}${separator}ref=${pageData.affiliateCode}`;

    await supabase.from('leads').insert({
      partnership_id: pageData.partnershipId,
      lead_type: 'click',
      lead_data: { destination: trackingUrl },
    });

    console.log('Opening:', trackingUrl);
  };

  const handleSubmitContact = async () => {
    if (!pageData) return;

    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Please enter your name and email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    setSubmitting(true);

    try {
      const { data: submission, error: submissionError } = await supabase
        .from('contact_submissions')
        .insert({
          partnership_id: pageData.partnershipId,
          product_id: pageData.productId || null,
          landing_page_slug: pageData.affiliateCode,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          company_name: formData.company_name || null,
          message: formData.message || null,
          customer_referral_code: formData.customer_referral_code || null,
        })
        .select()
        .single();

      if (submissionError) throw submissionError;

      await supabase.from('leads').insert({
        partnership_id: pageData.partnershipId,
        lead_type: 'signup',
        lead_data: {
          source: 'contact_form',
          contact_name: formData.name,
          contact_email: formData.email,
        },
        contact_submission_id: submission.id,
      });

      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company_name: '',
        message: '',
        customer_referral_code: '',
      });

      setTimeout(() => {
        setShowContactForm(false);
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting contact form:', error);
      alert('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!pageData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Landing page not found</Text>
      </View>
    );
  }

  const primaryColor = pageData.primaryColor || '#007AFF';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {pageData.companyLogo ? (
        <View style={styles.logoContainer}>
          <Image source={{ uri: pageData.companyLogo }} style={styles.logo} resizeMode="contain" />
        </View>
      ) : null}

      <View style={styles.content}>
        {pageData.heroImage ? (
          <Image source={{ uri: pageData.heroImage }} style={styles.heroImage} resizeMode="cover" />
        ) : null}

        <Text style={styles.headline}>{pageData.headline}</Text>

        {pageData.discountEnabled && pageData.discountValue && pageData.discountValue > 0 ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              SPECIAL OFFER: {pageData.discountType === 'percentage'
                ? `${pageData.discountValue}% OFF`
                : `$${pageData.discountValue} OFF`}
            </Text>
            <Text style={styles.discountSubtext}>Exclusive discount through this link</Text>
          </View>
        ) : null}

        {pageData.description ? (
          <Text style={styles.description}>{pageData.description}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: primaryColor }]}
          onPress={handleCTAClick}
        >
          <Text style={styles.ctaButtonText}>{pageData.ctaText}</Text>
          {pageData.saleType === 'direct_sale' && (
            <ExternalLink size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          )}
        </TouchableOpacity>

        {pageData.saleType === 'direct_sale' && pageData.externalCheckoutUrl ? (
          <Text style={styles.ctaHelperText}>
            Click to proceed to secure checkout
          </Text>
        ) : (
          <Text style={styles.ctaHelperText}>
            Click to get more information
          </Text>
        )}

        {pageData.productUrl ? (
          <TouchableOpacity
            style={[styles.visitButton, { borderColor: primaryColor }]}
            onPress={handleVisitWebsite}
          >
            <View style={styles.visitButtonContent}>
              <ExternalLink size={18} color={primaryColor} />
              <Text style={[styles.visitButtonText, { color: primaryColor }]}>Visit Website</Text>
            </View>
          </TouchableOpacity>
        ) : null}

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
          <Text style={styles.poweredBy}>Powered by {pageData.companyName}</Text>
        </View>
      </View>

      <Modal visible={showContactForm} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {submitted ? 'Thanks for your interest!' : 'Get in Touch'}
              </Text>
              <TouchableOpacity onPress={() => setShowContactForm(false)}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {submitted ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>
                  We've received your message and will get back to you soon!
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.formContainer}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Your full name"
                  placeholderTextColor="#999"
                />

                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="your.email@example.com"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="(Optional) Your phone number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />

                <Text style={styles.label}>Company</Text>
                <TextInput
                  style={styles.input}
                  value={formData.company_name}
                  onChangeText={(text) => setFormData({ ...formData, company_name: text })}
                  placeholder="(Optional) Your company name"
                  placeholderTextColor="#999"
                />

                <Text style={styles.label}>Message</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.message}
                  onChangeText={(text) => setFormData({ ...formData, message: text })}
                  placeholder="(Optional) Tell us about your needs"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <Text style={styles.label}>Referral Code</Text>
                <TextInput
                  style={styles.input}
                  value={formData.customer_referral_code}
                  onChangeText={(text) => setFormData({ ...formData, customer_referral_code: text.toUpperCase() })}
                  placeholder="(Optional) Enter a customer referral code"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                />
                <Text style={styles.helperText}>
                  Have a referral code from a friend? Enter it here to help them earn rewards!
                </Text>

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmitContact}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 16,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  logo: {
    width: 120,
    height: 60,
  },
  content: {
    padding: 24,
  },
  heroImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginBottom: 32,
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 38,
  },
  description: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 32,
  },
  discountBadge: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginVertical: 20,
    marginHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  discountText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 6,
  },
  discountSubtext: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E0F2FE',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ctaButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  ctaHelperText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  footer: {
    marginTop: 48,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  bottomBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    gap: 8,
  },
  bottomBackText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  poweredBy: {
    fontSize: 14,
    color: '#999',
  },
  visitButton: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  visitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  visitButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
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
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#007AFF',
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
    color: '#fff',
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

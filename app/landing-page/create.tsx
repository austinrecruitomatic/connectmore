import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Sparkles } from 'lucide-react-native';

type Template = {
  id: string;
  name: string;
  headline: string;
  description: string;
  cta_text: string;
  theme_style: string;
  primary_color: string;
  usage_count: number;
};

export default function CreateLandingPageScreen() {
  const { partnershipId, affiliateCode } = useLocalSearchParams();
  const { profile } = useAuth();
  const router = useRouter();

  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);

  useEffect(() => {
    fetchProductInfo();
  }, [partnershipId]);

  const fetchProductInfo = async () => {
    if (!partnershipId) return;

    try {
      setFetchingProduct(true);

      const { data: partnership, error: partnershipError } = await supabase
        .from('affiliate_partnerships')
        .select('company_id')
        .eq('id', partnershipId)
        .maybeSingle();

      if (partnershipError) throw partnershipError;

      if (!partnership) {
        Alert.alert('Error', 'Partnership not found');
        router.back();
        return;
      }

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, product_url, name')
        .eq('company_id', partnership.company_id)
        .maybeSingle();

      if (productsError) throw productsError;

      if (products?.product_url) {
        const separator = products.product_url.includes('?') ? '&' : '?';
        const fullUrl = `${products.product_url}${separator}ref=${affiliateCode}`;
        setProductUrl(fullUrl);
      }

      if (products?.id) {
        const { data: templatesData, error: templatesError } = await supabase
          .from('landing_page_templates')
          .select('id, name, headline, description, cta_text, theme_style, primary_color, usage_count')
          .eq('product_id', products.id)
          .eq('is_active', true)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (!templatesError && templatesData) {
          setTemplates(templatesData);
          if (templatesData.length > 0) {
            handleSelectTemplate(templatesData[0]);
          } else {
            if (products.name && !headline) {
              setHeadline(`Get Started with ${products.name}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching product info:', error);
    } finally {
      setFetchingProduct(false);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setHeadline(template.headline);
    setDescription(template.description);
    setShowTemplates(false);
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  };

  const handleCreatePage = async () => {
    if (!headline || !productUrl) {
      Alert.alert('Error', 'Please fill in headline and product URL');
      return;
    }

    if (!profile?.id || !partnershipId) {
      Alert.alert('Error', 'Invalid session');
      return;
    }

    setLoading(true);

    const title = headline;
    const slug = generateSlug(headline) + '-' + Date.now().toString().slice(-6);
    const buttonText = 'Get Started';

    const content = {
      headline,
      description,
      buttonText,
      buttonUrl: productUrl,
      affiliateCode,
      theme: 'default',
    };

    const { data, error} = await supabase
      .from('landing_pages')
      .insert({
        affiliate_id: profile.id,
        partnership_id: partnershipId as string,
        title,
        slug,
        content,
        is_published: true,
        template_id: selectedTemplate?.id || null,
      })
      .select()
      .single();

    if (!error && selectedTemplate) {
      await supabase
        .from('landing_page_templates')
        .update({ usage_count: selectedTemplate.usage_count + 1 })
        .eq('id', selectedTemplate.id);
    }

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Landing page created!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Landing Page</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {fetchingProduct ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading product info...</Text>
          </View>
        ) : (
          <>
            {templates.length > 0 && (
              <View style={styles.templatesSection}>
                <TouchableOpacity
                  style={styles.templatesHeader}
                  onPress={() => setShowTemplates(!showTemplates)}
                >
                  <View style={styles.templatesHeaderLeft}>
                    <Sparkles size={20} color="#F59E0B" />
                    <Text style={styles.templatesTitle}>
                      {selectedTemplate ? 'Template: ' + selectedTemplate.name : 'Choose a Template'}
                    </Text>
                  </View>
                  <Text style={styles.templatesToggle}>{showTemplates ? '−' : '+'}</Text>
                </TouchableOpacity>

                {showTemplates && (
                  <View style={styles.templatesGrid}>
                    {templates.map((template) => (
                      <TouchableOpacity
                        key={template.id}
                        style={[
                          styles.templateCard,
                          selectedTemplate?.id === template.id && styles.templateCardSelected,
                          { borderColor: template.primary_color },
                        ]}
                        onPress={() => handleSelectTemplate(template)}
                      >
                        <View
                          style={[styles.templateColorBar, { backgroundColor: template.primary_color }]}
                        />
                        <Text style={styles.templateName}>{template.name}</Text>
                        <Text style={styles.templateTheme}>{template.theme_style}</Text>
                        <Text style={styles.templateHeadlinePreview} numberOfLines={2}>
                          {template.headline}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.section}>
            <Text style={styles.label}>
              Headline <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={headline}
              onChangeText={setHeadline}
              placeholder="Build your recruiting business with Recuitomatic"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Tell visitors why this product is amazing..."
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>
              Product URL <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={productUrl}
              onChangeText={setProductUrl}
              placeholder="https://example.com/buy?ref=YOUR_CODE"
              autoCapitalize="none"
              keyboardType="url"
            />
            <Text style={styles.hint}>
              {productUrl ? 'Auto-populated with your tracking code' : `Your affiliate code: ${affiliateCode}`}
            </Text>
          </View>
          </>
        )}

        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={styles.previewCard}>
            {headline ? (
              <Text style={styles.previewHeadline}>{headline}</Text>
            ) : (
              <Text style={styles.previewPlaceholder}>Your headline will appear here</Text>
            )}
            {description ? (
              <Text style={styles.previewDescription}>{description}</Text>
            ) : null}
            <View style={styles.previewButton}>
              <Text style={styles.previewButtonText}>Get Started</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.buttonDisabled]}
          onPress={handleCreatePage}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creating...' : 'Create Landing Page'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    padding: 40,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    marginTop: 4,
  },
  required: {
    color: '#ff3b30',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  preview: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  previewCard: {
    backgroundColor: '#f9f9f9',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewHeadline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  previewPlaceholder: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ccc',
    marginBottom: 12,
    textAlign: 'center',
  },
  previewDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  previewButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  templatesSection: {
    backgroundColor: '#fff',
    marginTop: 16,
  },
  templatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  templatesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templatesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  templatesToggle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#666',
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  templateCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  templateCardSelected: {
    borderWidth: 3,
    backgroundColor: '#fff',
  },
  templateColorBar: {
    height: 4,
    width: '100%',
  },
  templateName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    padding: 12,
    paddingBottom: 4,
  },
  templateTheme: {
    fontSize: 12,
    color: '#666',
    paddingHorizontal: 12,
    paddingBottom: 4,
    textTransform: 'capitalize',
  },
  templateHeadlinePreview: {
    fontSize: 13,
    color: '#999',
    paddingHorizontal: 12,
    paddingBottom: 12,
    lineHeight: 18,
  },
});

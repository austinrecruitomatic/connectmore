import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Plus, Edit, Trash2, Star, Eye } from 'lucide-react-native';

type LandingPageTemplate = {
  id: string;
  name: string;
  headline: string;
  description: string;
  cta_text: string;
  hero_image_url: string | null;
  theme_style: 'modern' | 'minimal' | 'bold' | 'elegant';
  primary_color: string;
  secondary_color: string | null;
  is_default: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
};

export default function ProductTemplatesScreen() {
  const { id: productId } = useLocalSearchParams();
  const { profile } = useAuth();
  const router = useRouter();

  const [templates, setTemplates] = useState<LandingPageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [productName, setProductName] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    loadProductAndTemplates();
  }, [productId]);

  const loadProductAndTemplates = async () => {
    if (!productId || !profile?.id) return;

    try {
      setLoading(true);

      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!companyData) {
        Alert.alert('Error', 'Company not found');
        router.back();
        return;
      }

      setCompanyId(companyData.id);

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name, company_id')
        .eq('id', productId)
        .eq('company_id', companyData.id)
        .maybeSingle();

      if (productError || !product) {
        Alert.alert('Error', 'Product not found or access denied');
        router.back();
        return;
      }

      setProductName(product.name);

      const { data: templatesData, error: templatesError } = await supabase
        .from('landing_page_templates')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;

      setTemplates(templatesData || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      Alert.alert('Error', 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    router.push({
      pathname: '/product/[id]/template-edit',
      params: { id: productId as string, companyId: companyId as string },
    });
  };

  const handleEditTemplate = (templateId: string) => {
    router.push({
      pathname: '/product/[id]/template-edit',
      params: {
        id: productId as string,
        templateId,
        companyId: companyId as string,
      },
    });
  };

  const handleToggleDefault = async (templateId: string, currentDefault: boolean) => {
    if (currentDefault) {
      Alert.alert('Info', 'This template is already set as default');
      return;
    }

    try {
      const { error } = await supabase
        .from('landing_page_templates')
        .update({ is_default: true })
        .eq('id', templateId);

      if (error) throw error;

      Alert.alert('Success', 'Default template updated');
      loadProductAndTemplates();
    } catch (error) {
      console.error('Error updating default:', error);
      Alert.alert('Error', 'Failed to update default template');
    }
  };

  const handleToggleActive = async (templateId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('landing_page_templates')
        .update({ is_active: !currentActive })
        .eq('id', templateId);

      if (error) throw error;

      setTemplates((prev) =>
        prev.map((t) => (t.id === templateId ? { ...t, is_active: !currentActive } : t))
      );
    } catch (error) {
      console.error('Error toggling active:', error);
      Alert.alert('Error', 'Failed to update template');
    }
  };

  const handleDeleteTemplate = (templateId: string, templateName: string) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${templateName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('landing_page_templates')
                .delete()
                .eq('id', templateId);

              if (error) throw error;

              Alert.alert('Success', 'Template deleted');
              loadProductAndTemplates();
            } catch (error) {
              console.error('Error deleting template:', error);
              Alert.alert('Error', 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  const getThemeStyleLabel = (style: string) => {
    return style.charAt(0).toUpperCase() + style.slice(1);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Loading templates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Landing Page Templates</Text>
          <Text style={styles.headerSubtitle}>{productName}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateTemplate}>
          <Plus size={24} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {templates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Templates Yet</Text>
            <Text style={styles.emptyText}>
              Create landing page templates for your affiliates to use
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleCreateTemplate}>
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Create First Template</Text>
            </TouchableOpacity>
          </View>
        ) : (
          templates.map((template) => (
            <View key={template.id} style={styles.templateCard}>
              <View style={styles.templateHeader}>
                <View style={styles.templateTitleRow}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  {template.is_default && (
                    <View style={styles.defaultBadge}>
                      <Star size={12} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                  {!template.is_active && (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveBadgeText}>Inactive</Text>
                    </View>
                  )}
                </View>
                <View style={styles.templateActions}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleEditTemplate(template.id)}
                  >
                    <Edit size={18} color="#60A5FA" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleDeleteTemplate(template.id, template.name)}
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.templatePreview}>
                <View
                  style={[
                    styles.colorPreview,
                    { backgroundColor: template.primary_color },
                  ]}
                />
                <View style={styles.templateMeta}>
                  <Text style={styles.templateStyle}>
                    {getThemeStyleLabel(template.theme_style)}
                  </Text>
                  <View style={styles.usageRow}>
                    <Eye size={14} color="#64748B" />
                    <Text style={styles.usageText}>{template.usage_count} uses</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.templateHeadline} numberOfLines={2}>
                {template.headline}
              </Text>
              {template.description && (
                <Text style={styles.templateDescription} numberOfLines={3}>
                  {template.description}
                </Text>
              )}

              <View style={styles.templateFooter}>
                <TouchableOpacity
                  style={[
                    styles.activeToggle,
                    template.is_active && styles.activeToggleOn,
                  ]}
                  onPress={() => handleToggleActive(template.id, template.is_active)}
                >
                  <Text
                    style={[
                      styles.activeToggleText,
                      template.is_active && styles.activeToggleTextOn,
                    ]}
                  >
                    {template.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </TouchableOpacity>
                {!template.is_default && (
                  <TouchableOpacity
                    style={styles.setDefaultButton}
                    onPress={() => handleToggleDefault(template.id, template.is_default)}
                  >
                    <Star size={14} color="#F59E0B" />
                    <Text style={styles.setDefaultText}>Set as Default</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
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
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  templateCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  templateTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  inactiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
  },
  inactiveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  templatePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  colorPreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  templateMeta: {
    flex: 1,
  },
  templateStyle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  usageText: {
    fontSize: 12,
    color: '#64748B',
  },
  templateHeadline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 22,
  },
  templateDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 12,
  },
  templateFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  activeToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  activeToggleOn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  activeToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeToggleTextOn: {
    color: '#10B981',
  },
  setDefaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  setDefaultText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
});

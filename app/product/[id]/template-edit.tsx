import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Check } from 'lucide-react-native';

const THEME_STYLES = [
  { value: 'modern', label: 'Modern', description: 'Clean with bold typography' },
  { value: 'minimal', label: 'Minimal', description: 'Simple and elegant' },
  { value: 'bold', label: 'Bold', description: 'Eye-catching and vibrant' },
  { value: 'elegant', label: 'Elegant', description: 'Sophisticated and refined' },
] as const;

const COLOR_PRESETS = [
  '#007AFF',
  '#34C759',
  '#FF3B30',
  '#FF9500',
  '#AF52DE',
  '#5AC8FA',
  '#FF2D55',
  '#0A84FF',
];

export default function TemplateEditScreen() {
  const { id: productId, templateId, companyId } = useLocalSearchParams();
  const router = useRouter();
  const isEdit = !!templateId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [ctaText, setCtaText] = useState('Get Started');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [themeStyle, setThemeStyle] = useState<'modern' | 'minimal' | 'bold' | 'elegant'>(
    'modern'
  );
  const [primaryColor, setPrimaryColor] = useState('#007AFF');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isEdit) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    if (!templateId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('landing_page_templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();

      if (error || !data) {
        Alert.alert('Error', 'Template not found');
        router.back();
        return;
      }

      setName(data.name);
      setHeadline(data.headline);
      setDescription(data.description || '');
      setCtaText(data.cta_text);
      setHeroImageUrl(data.hero_image_url || '');
      setThemeStyle(data.theme_style);
      setPrimaryColor(data.primary_color);
      setSecondaryColor(data.secondary_color || '');
      setIsDefault(data.is_default);
      setIsActive(data.is_active);
    } catch (error) {
      console.error('Error loading template:', error);
      Alert.alert('Error', 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    if (!headline.trim()) {
      Alert.alert('Error', 'Please enter a headline');
      return;
    }

    setSaving(true);

    try {
      const templateData = {
        product_id: productId,
        company_id: companyId,
        name,
        headline,
        description,
        cta_text: ctaText,
        hero_image_url: heroImageUrl || null,
        theme_style: themeStyle,
        primary_color: primaryColor,
        secondary_color: secondaryColor || null,
        is_default: isDefault,
        is_active: isActive,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('landing_page_templates')
          .update(templateData)
          .eq('id', templateId);

        if (error) throw error;

        Alert.alert('Success', 'Template updated successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const { error } = await supabase.from('landing_page_templates').insert(templateData);

        if (error) throw error;

        Alert.alert('Success', 'Template created successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit' : 'Create'} Template</Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Check size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <Text style={styles.label}>
            Template Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Bold Modern, Minimal Clean"
            placeholderTextColor="#64748B"
          />

          <Text style={styles.label}>
            Headline <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={headline}
            onChangeText={setHeadline}
            placeholder="Grab attention with a compelling headline"
            placeholderTextColor="#64748B"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your product or service..."
            placeholderTextColor="#64748B"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Call-to-Action Text</Text>
          <TextInput
            style={styles.input}
            value={ctaText}
            onChangeText={setCtaText}
            placeholder="Get Started"
            placeholderTextColor="#64748B"
          />

          <Text style={styles.label}>Hero Image URL</Text>
          <TextInput
            style={styles.input}
            value={heroImageUrl}
            onChangeText={setHeroImageUrl}
            placeholder="https://example.com/image.jpg (optional)"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme Style</Text>
          <View style={styles.themeGrid}>
            {THEME_STYLES.map((theme) => (
              <TouchableOpacity
                key={theme.value}
                style={[
                  styles.themeOption,
                  themeStyle === theme.value && styles.themeOptionSelected,
                ]}
                onPress={() => setThemeStyle(theme.value)}
              >
                <Text
                  style={[
                    styles.themeLabel,
                    themeStyle === theme.value && styles.themeLabelSelected,
                  ]}
                >
                  {theme.label}
                </Text>
                <Text
                  style={[
                    styles.themeDescription,
                    themeStyle === theme.value && styles.themeDescriptionSelected,
                  ]}
                >
                  {theme.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Brand Colors</Text>

          <Text style={styles.label}>Primary Color</Text>
          <View style={styles.colorRow}>
            <View style={[styles.colorSwatch, { backgroundColor: primaryColor }]} />
            <TextInput
              style={[styles.input, styles.colorInput]}
              value={primaryColor}
              onChangeText={setPrimaryColor}
              placeholder="#007AFF"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.colorPresets}>
            {COLOR_PRESETS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[styles.colorPresetSwatch, { backgroundColor: color }]}
                onPress={() => setPrimaryColor(color)}
              />
            ))}
          </View>

          <Text style={styles.label}>Secondary Color (Optional)</Text>
          <View style={styles.colorRow}>
            {secondaryColor ? (
              <View style={[styles.colorSwatch, { backgroundColor: secondaryColor }]} />
            ) : (
              <View style={[styles.colorSwatch, styles.colorSwatchEmpty]} />
            )}
            <TextInput
              style={[styles.input, styles.colorInput]}
              value={secondaryColor}
              onChangeText={setSecondaryColor}
              placeholder="#000000"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIsDefault(!isDefault)}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Set as Default Template</Text>
              <Text style={styles.toggleDescription}>
                Affiliates will see this template first
              </Text>
            </View>
            <View style={[styles.toggle, isDefault && styles.toggleOn]}>
              {isDefault && <Check size={18} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIsActive(!isActive)}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Active</Text>
              <Text style={styles.toggleDescription}>
                {isActive
                  ? 'Affiliates can use this template'
                  : 'Hidden from affiliates'}
              </Text>
            </View>
            <View style={[styles.toggle, isActive && styles.toggleOn]}>
              {isActive && <Check size={18} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={[styles.previewCard, { borderColor: primaryColor }]}>
            {heroImageUrl ? (
              <View style={styles.previewImagePlaceholder}>
                <Text style={styles.previewImageText}>Hero Image</Text>
              </View>
            ) : null}
            <Text style={styles.previewHeadline}>{headline || 'Your headline here'}</Text>
            {description ? (
              <Text style={styles.previewDescription}>{description}</Text>
            ) : null}
            <View style={[styles.previewButton, { backgroundColor: primaryColor }]}>
              <Text style={styles.previewButtonText}>{ctaText}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
    marginTop: 12,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#FFFFFF',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  themeGrid: {
    gap: 12,
  },
  themeOption: {
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
  },
  themeOptionSelected: {
    borderColor: '#60A5FA',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  themeLabelSelected: {
    color: '#60A5FA',
  },
  themeDescription: {
    fontSize: 13,
    color: '#94A3B8',
  },
  themeDescriptionSelected: {
    color: '#60A5FA',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  colorSwatchEmpty: {
    backgroundColor: '#1E293B',
  },
  colorInput: {
    flex: 1,
  },
  colorPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  colorPresetSwatch: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#94A3B8',
  },
  toggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  preview: {
    padding: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 3,
  },
  previewImagePlaceholder: {
    height: 120,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  previewImageText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  previewHeadline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  previewDescription: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  previewButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

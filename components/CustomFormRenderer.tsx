import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface FormField {
  id: string;
  field_type: string;
  label: string;
  placeholder: string;
  help_text: string;
  required: boolean;
  options: string[];
  field_order: number;
}

interface CustomFormRendererProps {
  formId: string;
  onSubmit: (responses: Record<string, any>) => void;
  submitButtonText?: string;
  readonly?: boolean;
  initialValues?: Record<string, any>;
}

export default function CustomFormRenderer({
  formId,
  onSubmit,
  submitButtonText = 'Submit',
  readonly = false,
  initialValues = {},
}: CustomFormRendererProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFields();
  }, [formId]);

  const loadFields = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('field_order');

      if (error) throw error;
      setFields(data || []);
    } catch (error: any) {
      console.error('Error loading form fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || value === '' || (Array.isArray(value) && value.length === 0))) {
      return `${field.label} is required`;
    }

    if (field.field_type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    if (field.field_type === 'phone' && value) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(value)) {
        return 'Please enter a valid phone number';
      }
    }

    if (field.field_type === 'url' && value) {
      try {
        new URL(value);
      } catch {
        return 'Please enter a valid URL';
      }
    }

    return null;
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const error = validateField(field, responses[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const formattedResponses: Record<string, any> = {};
    fields.forEach((field) => {
      formattedResponses[field.label] = responses[field.id] || null;
    });

    onSubmit(formattedResponses);
  };

  const updateResponse = (fieldId: string, value: any) => {
    setResponses({ ...responses, [fieldId]: value });
    if (errors[fieldId]) {
      setErrors({ ...errors, [fieldId]: '' });
    }
  };

  const renderField = (field: FormField) => {
    const value = responses[field.id] || '';
    const error = errors[field.id];

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder={field.placeholder}
              placeholderTextColor="#64748B"
              value={value}
              onChangeText={(text) => updateResponse(field.id, text)}
              editable={!readonly}
              keyboardType={
                field.field_type === 'email' ? 'email-address' :
                field.field_type === 'phone' ? 'phone-pad' :
                field.field_type === 'url' ? 'url' : 'default'
              }
              autoCapitalize={field.field_type === 'email' || field.field_type === 'url' ? 'none' : 'sentences'}
            />
            {field.help_text ? (
              <Text style={styles.helpText}>{field.help_text}</Text>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        );

      case 'textarea':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, error && styles.inputError]}
              placeholder={field.placeholder}
              placeholderTextColor="#64748B"
              value={value}
              onChangeText={(text) => updateResponse(field.id, text)}
              editable={!readonly}
              multiline
              numberOfLines={4}
            />
            {field.help_text ? (
              <Text style={styles.helpText}>{field.help_text}</Text>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        );

      case 'number':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder={field.placeholder}
              placeholderTextColor="#64748B"
              value={value ? String(value) : ''}
              onChangeText={(text) => updateResponse(field.id, text ? parseFloat(text) : '')}
              editable={!readonly}
              keyboardType="numeric"
            />
            {field.help_text ? (
              <Text style={styles.helpText}>{field.help_text}</Text>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        );

      case 'select':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.selectContainer}>
              {field.options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectOption,
                    value === option && styles.selectOptionSelected,
                  ]}
                  onPress={() => !readonly && updateResponse(field.id, option)}
                  disabled={readonly}
                >
                  <View style={[
                    styles.radio,
                    value === option && styles.radioSelected,
                  ]}>
                    {value === option && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[
                    styles.selectOptionText,
                    value === option && styles.selectOptionTextSelected,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {field.help_text ? (
              <Text style={styles.helpText}>{field.help_text}</Text>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        );

      case 'multi_select':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.selectContainer}>
              {field.options.map((option) => {
                const isSelected = selectedValues.includes(option);
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.selectOption,
                      isSelected && styles.selectOptionSelected,
                    ]}
                    onPress={() => {
                      if (readonly) return;
                      const newValues = isSelected
                        ? selectedValues.filter((v) => v !== option)
                        : [...selectedValues, option];
                      updateResponse(field.id, newValues);
                    }}
                    disabled={readonly}
                  >
                    <View style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}>
                      {isSelected && <View style={styles.checkboxInner} />}
                    </View>
                    <Text style={[
                      styles.selectOptionText,
                      isSelected && styles.selectOptionTextSelected,
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {field.help_text ? (
              <Text style={styles.helpText}>{field.help_text}</Text>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        );

      case 'checkbox':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => !readonly && updateResponse(field.id, !value)}
              disabled={readonly}
            >
              <View style={[
                styles.checkbox,
                value && styles.checkboxSelected,
              ]}>
                {value && <View style={styles.checkboxInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  {field.label}
                  {field.required && <Text style={styles.required}> *</Text>}
                </Text>
                {field.help_text ? (
                  <Text style={styles.helpText}>{field.help_text}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        );

      case 'date':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder={field.placeholder || 'YYYY-MM-DD'}
              placeholderTextColor="#64748B"
              value={value}
              onChangeText={(text) => updateResponse(field.id, text)}
              editable={!readonly}
            />
            {field.help_text ? (
              <Text style={styles.helpText}>{field.help_text}</Text>
            ) : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading form...</Text>
      </View>
    );
  }

  if (fields.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No fields configured for this form.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {fields.map(renderField)}
      </ScrollView>

      {!readonly && (
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>{submitButtonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 8,
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
    color: '#F1F5F9',
    fontSize: 14,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
  selectContainer: {
    gap: 10,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
  },
  selectOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 10,
  },
  selectOptionTextSelected: {
    color: '#F1F5F9',
    fontWeight: '500',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#3B82F6',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    margin: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});

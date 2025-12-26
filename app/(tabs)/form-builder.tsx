import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, GripVertical, Eye, X, ArrowUp, ArrowDown, Save, Lock, User, Phone, Mail, FileText } from 'lucide-react-native';

interface CustomForm {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface FormField {
  id: string;
  form_id: string;
  field_type: string;
  label: string;
  placeholder: string;
  help_text: string;
  required: boolean;
  options: any[];
  field_order: number;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multi_select', label: 'Multiple Choice' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'Website URL' },
];

export default function FormBuilderScreen() {
  const { user } = useAuth();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<CustomForm | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldHelpText, setFieldHelpText] = useState('');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState('');

  useEffect(() => {
    if (user) {
      loadForms();
    }
  }, [user]);

  useEffect(() => {
    if (selectedForm) {
      loadFields(selectedForm.id);
    }
  }, [selectedForm]);

  const loadForms = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_forms')
        .select('*')
        .eq('company_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFields = async (formId: string) => {
    try {
      const { data, error } = await supabase
        .from('custom_form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('field_order');

      if (error) throw error;
      setFields(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const createForm = async () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Please enter a form name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('custom_forms')
        .insert({
          company_id: user?.id,
          name: formName,
          description: formDescription,
        })
        .select()
        .single();

      if (error) throw error;

      setForms([data, ...forms]);
      setSelectedForm(data);
      setShowCreateModal(false);
      setFormName('');
      setFormDescription('');
      Alert.alert('Success', 'Form created successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const deleteForm = async (formId: string) => {
    Alert.alert(
      'Delete Form',
      'Are you sure? This will delete all fields and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('custom_forms')
                .delete()
                .eq('id', formId);

              if (error) throw error;
              setForms(forms.filter(f => f.id !== formId));
              if (selectedForm?.id === formId) {
                setSelectedForm(null);
              }
              Alert.alert('Success', 'Form deleted');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const openFieldModal = (field?: FormField) => {
    if (field) {
      setEditingField(field);
      setFieldLabel(field.label);
      setFieldType(field.field_type);
      setFieldPlaceholder(field.placeholder);
      setFieldHelpText(field.help_text);
      setFieldRequired(field.required);
      setFieldOptions(field.options ? field.options.join('\n') : '');
    } else {
      setEditingField(null);
      setFieldLabel('');
      setFieldType('text');
      setFieldPlaceholder('');
      setFieldHelpText('');
      setFieldRequired(false);
      setFieldOptions('');
    }
    setShowFieldModal(true);
  };

  const saveField = async () => {
    if (!fieldLabel.trim()) {
      Alert.alert('Error', 'Please enter a field label');
      return;
    }

    if (!selectedForm) return;

    try {
      const optionsArray = ['select', 'multi_select'].includes(fieldType)
        ? fieldOptions.split('\n').filter(o => o.trim())
        : [];

      if (editingField) {
        const { error } = await supabase
          .from('custom_form_fields')
          .update({
            label: fieldLabel,
            field_type: fieldType,
            placeholder: fieldPlaceholder,
            help_text: fieldHelpText,
            required: fieldRequired,
            options: optionsArray,
          })
          .eq('id', editingField.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('custom_form_fields')
          .insert({
            form_id: selectedForm.id,
            label: fieldLabel,
            field_type: fieldType,
            placeholder: fieldPlaceholder,
            help_text: fieldHelpText,
            required: fieldRequired,
            options: optionsArray,
            field_order: fields.length,
          });

        if (error) throw error;
      }

      loadFields(selectedForm.id);
      setShowFieldModal(false);
      Alert.alert('Success', editingField ? 'Field updated' : 'Field added');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const deleteField = async (fieldId: string) => {
    Alert.alert('Delete Field', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('custom_form_fields')
              .delete()
              .eq('id', fieldId);

            if (error) throw error;
            setFields(fields.filter(f => f.id !== fieldId));
            Alert.alert('Success', 'Field deleted');
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const moveField = async (fieldId: string, direction: 'up' | 'down') => {
    const index = fields.findIndex(f => f.id === fieldId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];

    try {
      for (let i = 0; i < newFields.length; i++) {
        await supabase
          .from('custom_form_fields')
          .update({ field_order: i })
          .eq('id', newFields[i].id);
      }
      setFields(newFields);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading forms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Form Builder</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
          <Plus size={20} color="#fff" />
          <Text style={styles.createButtonText}>New Form</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.formsPanel}>
          <Text style={styles.panelTitle}>Your Forms</Text>
          <ScrollView>
            {forms.map((form) => (
              <TouchableOpacity
                key={form.id}
                style={[styles.formItem, selectedForm?.id === form.id && styles.formItemSelected]}
                onPress={() => setSelectedForm(form)}
              >
                <View style={styles.formItemContent}>
                  <Text style={styles.formItemName}>{form.name}</Text>
                  {form.description ? (
                    <Text style={styles.formItemDesc} numberOfLines={1}>{form.description}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => deleteForm(form.id)}
                  style={styles.deleteButton}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {forms.length === 0 && (
              <Text style={styles.emptyText}>No forms yet. Create one to get started!</Text>
            )}
          </ScrollView>
        </View>

        {selectedForm && (
          <View style={styles.builderPanel}>
            <View style={styles.builderHeader}>
              <Text style={styles.builderTitle}>{selectedForm.name}</Text>
              <TouchableOpacity
                style={styles.addFieldButton}
                onPress={() => openFieldModal()}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.addFieldText}>Add Field</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.fieldsContainer}
              contentContainerStyle={styles.fieldsContent}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionLabel}>Default Fields</Text>
                  <Text style={styles.sectionDescription}>Always included • Cannot be removed</Text>
                </View>
                <View style={styles.lockBadge}>
                  <Lock size={14} color="#60A5FA" />
                </View>
              </View>

              <View style={styles.defaultFieldCard}>
                <View style={styles.defaultFieldIcon}>
                  <User size={18} color="#60A5FA" />
                </View>
                <View style={styles.fieldInfo}>
                  <Text style={styles.fieldLabel}>First Name</Text>
                  <Text style={styles.fieldType}>Short Text<Text style={styles.requiredBadge}> • Required</Text></Text>
                </View>
              </View>

              <View style={styles.defaultFieldCard}>
                <View style={styles.defaultFieldIcon}>
                  <User size={18} color="#60A5FA" />
                </View>
                <View style={styles.fieldInfo}>
                  <Text style={styles.fieldLabel}>Last Name</Text>
                  <Text style={styles.fieldType}>Short Text<Text style={styles.requiredBadge}> • Required</Text></Text>
                </View>
              </View>

              <View style={styles.defaultFieldCard}>
                <View style={styles.defaultFieldIcon}>
                  <Phone size={18} color="#60A5FA" />
                </View>
                <View style={styles.fieldInfo}>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <Text style={styles.fieldType}>Phone<Text style={styles.requiredBadge}> • Required</Text></Text>
                </View>
              </View>

              <View style={styles.defaultFieldCard}>
                <View style={styles.defaultFieldIcon}>
                  <Mail size={18} color="#60A5FA" />
                </View>
                <View style={styles.fieldInfo}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <Text style={styles.fieldType}>Email<Text style={styles.requiredBadge}> • Required</Text></Text>
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Custom Fields</Text>
                  <Text style={styles.sectionDescription}>Capture additional information from leads</Text>
                </View>
              </View>

              {fields.map((field, index) => (
                <View key={field.id} style={styles.fieldCard}>
                  <View style={styles.fieldCardContent}>
                    <View style={styles.customFieldIcon}>
                      <FileText size={18} color="#10B981" />
                    </View>
                    <View style={styles.fieldCardBody}>
                      <View style={styles.fieldCardHeader}>
                        <View style={styles.fieldInfo}>
                          <Text style={styles.fieldLabel}>{field.label}</Text>
                          <Text style={styles.fieldType}>
                            {FIELD_TYPES.find(t => t.value === field.field_type)?.label}
                            {field.required && <Text style={styles.requiredBadge}> • Required</Text>}
                          </Text>
                        </View>
                        <View style={styles.fieldActions}>
                          <TouchableOpacity
                            onPress={() => moveField(field.id, 'up')}
                            disabled={index === 0}
                            style={[styles.iconButton, index === 0 && styles.iconButtonDisabled]}
                          >
                            <ArrowUp size={16} color={index === 0 ? '#475569' : '#94A3B8'} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => moveField(field.id, 'down')}
                            disabled={index === fields.length - 1}
                            style={[styles.iconButton, index === fields.length - 1 && styles.iconButtonDisabled]}
                          >
                            <ArrowDown size={16} color={index === fields.length - 1 ? '#475569' : '#94A3B8'} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => openFieldModal(field)}
                            style={[styles.iconButton, styles.iconButtonEdit]}
                          >
                            <Edit2 size={16} color="#3B82F6" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => deleteField(field.id)}
                            style={[styles.iconButton, styles.iconButtonDelete]}
                          >
                            <Trash2 size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {field.help_text ? (
                        <Text style={styles.fieldHelpText}>{field.help_text}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              ))}
              {fields.length === 0 && (
                <View style={styles.emptyFields}>
                  <View style={styles.emptyFieldsIcon}>
                    <Plus size={32} color="#475569" />
                  </View>
                  <Text style={styles.emptyFieldsTitle}>No Custom Fields</Text>
                  <Text style={styles.emptyFieldsText}>Click "Add Field" above to create your first custom field and start capturing additional lead information.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {!selectedForm && forms.length > 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <FileText size={48} color="#475569" />
            </View>
            <Text style={styles.emptyStateTitle}>Select a Form</Text>
            <Text style={styles.emptyStateText}>Choose a form from the sidebar to view and edit its fields</Text>
          </View>
        )}

        {!selectedForm && forms.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Plus size={48} color="#475569" />
            </View>
            <Text style={styles.emptyStateTitle}>No Forms Yet</Text>
            <Text style={styles.emptyStateText}>Create your first form by clicking "New Form" above to start capturing lead information</Text>
          </View>
        )}
      </View>

      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Form</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Form Name"
              placeholderTextColor="#64748B"
              value={formName}
              onChangeText={setFormName}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              placeholderTextColor="#64748B"
              value={formDescription}
              onChangeText={setFormDescription}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={createForm}>
              <Text style={styles.primaryButtonText}>Create Form</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showFieldModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.fieldModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingField ? 'Edit Field' : 'Add Field'}</Text>
              <TouchableOpacity onPress={() => setShowFieldModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>Field Label *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Company Size"
                placeholderTextColor="#64748B"
                value={fieldLabel}
                onChangeText={setFieldLabel}
              />

              <Text style={styles.label}>Field Type</Text>
              <View style={styles.typeGrid}>
                {FIELD_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      fieldType === type.value && styles.typeButtonSelected,
                    ]}
                    onPress={() => setFieldType(type.value)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        fieldType === type.value && styles.typeButtonTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Placeholder</Text>
              <TextInput
                style={styles.input}
                placeholder="Optional placeholder text"
                placeholderTextColor="#64748B"
                value={fieldPlaceholder}
                onChangeText={setFieldPlaceholder}
              />

              <Text style={styles.label}>Help Text</Text>
              <TextInput
                style={styles.input}
                placeholder="Optional guidance for users"
                placeholderTextColor="#64748B"
                value={fieldHelpText}
                onChangeText={setFieldHelpText}
              />

              {(['select', 'multi_select'].includes(fieldType)) && (
                <>
                  <Text style={styles.label}>Options (one per line)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Small&#10;Medium&#10;Large&#10;Enterprise"
                    placeholderTextColor="#64748B"
                    value={fieldOptions}
                    onChangeText={setFieldOptions}
                    multiline
                    numberOfLines={5}
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFieldRequired(!fieldRequired)}
              >
                <View style={[styles.checkbox, fieldRequired && styles.checkboxChecked]}>
                  {fieldRequired && <View style={styles.checkboxInner} />}
                </View>
                <Text style={styles.checkboxLabel}>Required field</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryButton} onPress={saveField}>
                <Save size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {editingField ? 'Update Field' : 'Add Field'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  formsPanel: {
    width: 280,
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    padding: 16,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  formItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  formItemContent: {
    flex: 1,
  },
  formItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  formItemDesc: {
    fontSize: 12,
    color: '#94A3B8',
  },
  deleteButton: {
    padding: 6,
  },
  builderPanel: {
    flex: 1,
    padding: 20,
    minWidth: 600,
  },
  builderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  builderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  addFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addFieldText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  fieldsContainer: {
    flex: 1,
  },
  fieldsContent: {
    paddingBottom: 20,
    minWidth: 400,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    minWidth: 400,
  },
  sectionHeaderText: {
    flex: 1,
    minWidth: 200,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    flexShrink: 0,
  },
  sectionDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    flexWrap: 'wrap',
  },
  lockBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    flexShrink: 0,
  },
  defaultFieldCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 400,
  },
  defaultFieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    flexShrink: 0,
  },
  customFieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    flexShrink: 0,
  },
  fieldCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 400,
  },
  fieldCardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldCardBody: {
    flex: 1,
  },
  fieldCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  fieldInfo: {
    flex: 1,
    minWidth: 200,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  fieldType: {
    fontSize: 12,
    color: '#94A3B8',
    flexWrap: 'wrap',
  },
  requiredBadge: {
    color: '#F87171',
    fontWeight: '600',
  },
  fieldHelpText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
    fontStyle: 'italic',
    paddingLeft: 0,
  },
  fieldActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
    flexShrink: 0,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconButtonEdit: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  iconButtonDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  iconButtonDisabled: {
    opacity: 0.3,
  },
  emptyFields: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1E293B',
    borderStyle: 'dashed',
    minWidth: 400,
  },
  emptyFieldsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyFieldsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  emptyFieldsText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#334155',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 400,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  fieldModal: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#F1F5F9',
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeButtonSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  typeButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#334155',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#F1F5F9',
    fontWeight: '500',
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Plus, Edit, Trash, Eye } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

type Contract = {
  id: string;
  company_id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function ContractManagement() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [formData, setFormData] = useState({
    title: 'Affiliate Partnership Agreement',
    content: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', profile?.id)
        .single();

      if (!companies) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('company_contracts')
        .select('*')
        .eq('company_id', companies.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error loading contracts:', error);
      Alert.alert('Error', 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Required', 'Please enter a contract title');
      return;
    }

    if (!formData.content.trim()) {
      Alert.alert('Required', 'Please enter contract content');
      return;
    }

    setSaving(true);

    try {
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', profile?.id)
        .single();

      if (!companies) throw new Error('Company not found');

      if (editingContract) {
        const { error } = await supabase
          .from('company_contracts')
          .update({
            title: formData.title,
            content: formData.content,
          })
          .eq('id', editingContract.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('company_contracts').insert({
          company_id: companies.id,
          title: formData.title,
          content: formData.content,
          is_active: true,
        });

        if (error) throw error;
      }

      Alert.alert(
        'Success',
        editingContract ? 'Contract updated successfully' : 'Contract created successfully'
      );
      setShowForm(false);
      setEditingContract(null);
      setFormData({ title: 'Affiliate Partnership Agreement', content: '' });
      loadContracts();
    } catch (error) {
      console.error('Error saving contract:', error);
      Alert.alert('Error', 'Failed to save contract');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      title: contract.title,
      content: contract.content,
    });
    setShowForm(true);
  };

  const handleDelete = (contractId: string) => {
    if (Platform.OS === 'web') {
      if (
        window.confirm(
          'Are you sure you want to delete this contract? This action cannot be undone.'
        )
      ) {
        deleteContract(contractId);
      }
    } else {
      Alert.alert('Confirm Delete', 'Are you sure you want to delete this contract?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteContract(contractId) },
      ]);
    }
  };

  const deleteContract = async (contractId: string) => {
    try {
      const { error } = await supabase.from('company_contracts').delete().eq('id', contractId);

      if (error) throw error;
      Alert.alert('Success', 'Contract deleted successfully');
      loadContracts();
    } catch (error) {
      console.error('Error deleting contract:', error);
      Alert.alert('Error', 'Failed to delete contract');
    }
  };

  const toggleActive = async (contract: Contract) => {
    try {
      const { error } = await supabase
        .from('company_contracts')
        .update({ is_active: !contract.is_active })
        .eq('id', contract.id);

      if (error) throw error;
      loadContracts();
    } catch (error) {
      console.error('Error toggling contract:', error);
      Alert.alert('Error', 'Failed to update contract status');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contract Management</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.description}>
            Create contracts that affiliates must accept before becoming partners with your company.
            Only one contract can be active at a time.
          </Text>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setShowForm(true);
              setEditingContract(null);
              setFormData({ title: 'Affiliate Partnership Agreement', content: '' });
            }}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.addButtonText}>Create New Contract</Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editingContract ? 'Edit Contract' : 'Create New Contract'}
            </Text>

            <Text style={styles.label}>Contract Title</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Enter contract title"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>Contract Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.content}
              onChangeText={(text) => setFormData({ ...formData, content: text })}
              placeholder="Enter full contract text that affiliates must read and accept..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={15}
              textAlignVertical="top"
            />

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowForm(false);
                  setEditingContract(null);
                  setFormData({ title: 'Affiliate Partnership Agreement', content: '' });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingContract ? 'Update Contract' : 'Create Contract'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {contracts.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Contracts Yet</Text>
            <Text style={styles.emptyText}>
              Create your first contract to require affiliates to agree to your terms before
              partnering with your company.
            </Text>
          </View>
        ) : (
          <View style={styles.contractsList}>
            {contracts.map((contract) => (
              <View key={contract.id} style={styles.contractCard}>
                <View style={styles.contractHeader}>
                  <View style={styles.contractHeaderLeft}>
                    <FileText size={20} color="#007AFF" />
                    <Text style={styles.contractTitle}>{contract.title}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      contract.is_active ? styles.statusActive : styles.statusInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        contract.is_active ? styles.statusTextActive : styles.statusTextInactive,
                      ]}
                    >
                      {contract.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.contractPreview} numberOfLines={3}>
                  {contract.content}
                </Text>

                <View style={styles.contractActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => toggleActive(contract)}
                  >
                    <Text style={styles.actionButtonText}>
                      {contract.is_active ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEdit(contract)}
                  >
                    <Edit size={14} color="#007AFF" />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(contract.id)}
                  >
                    <Trash size={14} color="#EF4444" />
                    <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  topSection: {
    padding: 20,
  },
  description: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 200,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  contractsList: {
    padding: 20,
    gap: 16,
  },
  contractCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contractHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  contractTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#16A34A',
  },
  statusTextInactive: {
    color: '#DC2626',
  },
  contractPreview: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  contractActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  editButton: {
    borderColor: '#007AFF',
    backgroundColor: '#EFF6FF',
  },
  deleteButton: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
});

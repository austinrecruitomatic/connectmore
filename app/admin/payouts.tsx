import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { DollarSign, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react-native';

interface Payout {
  id: string;
  affiliate_id: string;
  affiliate_name: string;
  affiliate_email: string;
  payment_method: string | null;
  total_amount: number;
  platform_fee_total: number;
  commission_count: number;
  status: string;
  scheduled_date: string;
  processed_at: string | null;
  notes: string;
  created_at: string;
}

export default function AdminPayouts() {
  const { profile } = useAuth();
  const router = useRouter();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [processingNotes, setProcessingNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'processing' | 'completed'>('scheduled');

  useEffect(() => {
    if (!profile?.is_super_admin) {
      Alert.alert('Access Denied', 'Admin access required');
      router.back();
      return;
    }
    loadPayouts();
  }, [profile, filter]);

  const loadPayouts = async () => {
    try {
      let query = supabase
        .from('admin_payout_summary')
        .select('*');

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setPayouts(data || []);
    } catch (error) {
      console.error('Error loading payouts:', error);
      Alert.alert('Error', 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const processPayout = async (payoutId: string, newStatus: 'processing' | 'completed' | 'failed') => {
    try {
      const updates: any = {
        status: newStatus,
        notes: processingNotes || null,
      };

      if (newStatus === 'completed') {
        updates.processed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('payouts')
        .update(updates)
        .eq('id', payoutId);

      if (error) throw error;

      // If completed, mark all associated commissions as paid
      if (newStatus === 'completed') {
        const payout = payouts.find(p => p.id === payoutId);
        if (payout) {
          const { data: payoutData } = await supabase
            .from('payouts')
            .select('commission_ids')
            .eq('id', payoutId)
            .single();

          if (payoutData?.commission_ids) {
            await supabase
              .from('commissions')
              .update({
                status: 'paid',
                paid_at: new Date().toISOString()
              })
              .in('id', payoutData.commission_ids);
          }
        }
      }

      Alert.alert('Success', `Payout ${newStatus}`);
      setSelectedPayout(null);
      setProcessingNotes('');
      loadPayouts();
    } catch (error) {
      console.error('Error processing payout:', error);
      Alert.alert('Error', 'Failed to process payout');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#F59E0B';
      case 'processing': return '#3B82F6';
      case 'completed': return '#10B981';
      case 'failed': return '#EF4444';
      default: return '#64748B';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle color="#10B981" size={20} />;
      case 'failed': return <XCircle color="#EF4444" size={20} />;
      case 'processing': return <AlertCircle color="#3B82F6" size={20} />;
      default: return <DollarSign color="#F59E0B" size={20} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#60A5FA" size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Payout Management</Text>
          <Text style={styles.subtitle}>{payouts.length} payouts</Text>
        </View>
      </View>

      <View style={styles.filterBar}>
        {(['all', 'scheduled', 'processing', 'completed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {payouts.map((payout) => (
          <TouchableOpacity
            key={payout.id}
            style={styles.payoutCard}
            onPress={() => setSelectedPayout(payout)}
          >
            <View style={styles.payoutHeader}>
              <View style={styles.affiliateInfo}>
                <Text style={styles.affiliateName}>{payout.affiliate_name}</Text>
                <Text style={styles.affiliateEmail}>{payout.affiliate_email}</Text>
              </View>
              <View style={styles.statusBadge}>
                {getStatusIcon(payout.status)}
              </View>
            </View>

            <View style={styles.payoutDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payout Amount</Text>
                <Text style={styles.detailValue}>${payout.total_amount.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Platform Fee</Text>
                <Text style={styles.detailValue}>${payout.platform_fee_total.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Commissions</Text>
                <Text style={styles.detailValue}>{payout.commission_count}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <Text style={styles.detailValue}>
                  {payout.payment_method || 'Not set'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Scheduled</Text>
                <Text style={styles.detailValue}>
                  {new Date(payout.scheduled_date).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {payout.status === 'scheduled' && (
              <View style={styles.actionHint}>
                <Text style={styles.actionHintText}>Tap to process</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {payouts.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <DollarSign color="#64748B" size={48} />
            <Text style={styles.emptyText}>No payouts found</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={selectedPayout !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedPayout(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Process Payout</Text>

            {selectedPayout && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Affiliate</Text>
                  <Text style={styles.modalValue}>{selectedPayout.affiliate_name}</Text>
                  <Text style={styles.modalSubvalue}>{selectedPayout.affiliate_email}</Text>
                </View>

                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Amount to Pay</Text>
                  <Text style={[styles.modalValue, styles.amountText]}>
                    ${selectedPayout.total_amount.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Payment Method</Text>
                  <Text style={styles.modalValue}>
                    {selectedPayout.payment_method || 'Not configured'}
                  </Text>
                </View>

                <TextInput
                  style={styles.notesInput}
                  placeholder="Add notes (transaction ID, confirmation, etc.)"
                  value={processingNotes}
                  onChangeText={setProcessingNotes}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalActions}>
                  {selectedPayout.status === 'scheduled' && (
                    <TouchableOpacity
                      style={[styles.modalButton, styles.processingButton]}
                      onPress={() => processPayout(selectedPayout.id, 'processing')}
                    >
                      <Text style={styles.modalButtonText}>Mark as Processing</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.modalButton, styles.successButton]}
                    onPress={() => processPayout(selectedPayout.id, 'completed')}
                  >
                    <CheckCircle color="#fff" size={20} />
                    <Text style={styles.modalButtonText}>Complete Payout</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.failButton]}
                    onPress={() => processPayout(selectedPayout.id, 'failed')}
                  >
                    <XCircle color="#fff" size={20} />
                    <Text style={styles.modalButtonText}>Mark as Failed</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setSelectedPayout(null)}
                  >
                    <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  filterBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  payoutCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  affiliateInfo: {
    flex: 1,
  },
  affiliateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  affiliateEmail: {
    fontSize: 13,
    color: '#94A3B8',
  },
  statusBadge: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  payoutDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionHint: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  actionHintText: {
    fontSize: 13,
    color: '#60A5FA',
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
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
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  modalInfo: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSubvalue: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  amountText: {
    fontSize: 24,
    color: '#60A5FA',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  processingButton: {
    backgroundColor: '#3B82F6',
  },
  successButton: {
    backgroundColor: '#10B981',
  },
  failButton: {
    backgroundColor: '#EF4444',
  },
  cancelButton: {
    backgroundColor: '#334155',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButtonText: {
    color: '#FFFFFF',
  },
});

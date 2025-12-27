import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AlertTriangle, Clock, Mail, Phone, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

type OverdueLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  created_at: string;
  last_status_update: string;
  days_overdue: number;
  company_name: string;
  affiliate_name: string;
};

type Props = {
  visible: boolean;
  leads: OverdueLead[];
  onLeadsUpdated: () => void;
};

const STATUS_OPTIONS = [
  { value: 'contacted', label: 'Contacted', color: '#3B82F6' },
  { value: 'qualified', label: 'Qualified', color: '#8B5CF6' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: '#EC4899' },
  { value: 'negotiating', label: 'Negotiating', color: '#F59E0B' },
  { value: 'won', label: 'Won', color: '#10B981' },
  { value: 'lost', label: 'Lost', color: '#EF4444' },
  { value: 'no_answer', label: 'No Answer', color: '#6B7280' },
];

export default function OverdueLeadsModal({ visible, leads, onLeadsUpdated }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [updating, setUpdating] = useState(false);

  const currentLead = leads[currentIndex];
  const remainingCount = leads.length - currentIndex;

  const handleDisposition = async (newStatus: string) => {
    if (!currentLead) return;

    setUpdating(true);
    try {
      const { data, error } = await supabase.rpc('disposition_lead', {
        p_lead_id: currentLead.id,
        p_new_status: newStatus,
      });

      if (error) throw error;

      if (data?.success === false) {
        Alert.alert('Error', data.error || 'Failed to update lead');
        return;
      }

      if (currentIndex < leads.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0);
        onLeadsUpdated();
      }
    } catch (error) {
      console.error('Error updating lead:', error);
      Alert.alert('Error', 'Failed to update lead status');
    } finally {
      setUpdating(false);
    }
  };

  if (!currentLead) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.warningBadge}>
            <AlertTriangle size={24} color="#EF4444" />
            <Text style={styles.warningText}>Action Required</Text>
          </View>
          <Text style={styles.subtitle}>
            You have {remainingCount} lead{remainingCount !== 1 ? 's' : ''} pending follow-up
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.overdueCard}>
            <View style={styles.overdueHeader}>
              <Clock size={20} color="#EF4444" />
              <Text style={styles.overdueText}>
                {currentLead.days_overdue} days overdue
              </Text>
            </View>
            <Text style={styles.overdueSubtext}>
              Last updated: {new Date(currentLead.last_status_update).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.leadCard}>
            <Text style={styles.sectionTitle}>Lead Information</Text>

            <View style={styles.infoRow}>
              <User size={18} color="#60A5FA" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{currentLead.name}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Mail size={18} color="#60A5FA" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{currentLead.email}</Text>
              </View>
            </View>

            {currentLead.phone && (
              <View style={styles.infoRow}>
                <Phone size={18} color="#60A5FA" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{currentLead.phone}</Text>
                </View>
              </View>
            )}

            {currentLead.message && (
              <View style={styles.messageSection}>
                <Text style={styles.infoLabel}>Message</Text>
                <Text style={styles.messageText}>{currentLead.message}</Text>
              </View>
            )}

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>From: </Text>
              <Text style={styles.metaValue}>{currentLead.affiliate_name || 'Direct'}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Received: </Text>
              <Text style={styles.metaValue}>
                {new Date(currentLead.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.actionSection}>
            <Text style={styles.actionTitle}>Update Lead Status</Text>
            <Text style={styles.actionSubtitle}>
              Select the current status to continue
            </Text>

            <View style={styles.statusGrid}>
              {STATUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusButton,
                    { borderColor: option.color },
                    updating && styles.statusButtonDisabled,
                  ]}
                  onPress={() => handleDisposition(option.value)}
                  disabled={updating}
                >
                  <Text style={[styles.statusButtonText, { color: option.color }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {updating && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Updating lead...</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.progress}>
          <Text style={styles.progressText}>
            Lead {currentIndex + 1} of {leads.length}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentIndex + 1) / leads.length) * 100}%` },
              ]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  overdueCard: {
    backgroundColor: '#7F1D1D',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  overdueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  overdueText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FEE2E2',
  },
  overdueSubtext: {
    fontSize: 14,
    color: '#FCA5A5',
    marginTop: 4,
  },
  leadCard: {
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#F1F5F9',
    fontWeight: '500',
  },
  messageSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  metaValue: {
    fontSize: 14,
    color: '#F1F5F9',
    fontWeight: '500',
  },
  actionSection: {
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  statusButtonDisabled: {
    opacity: 0.5,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    marginTop: 20,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  progress: {
    padding: 20,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  progressText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
});

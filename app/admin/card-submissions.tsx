import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { CreditCard, Search, Check, X, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

interface CardSubmission {
  id: string;
  user_id: string;
  cardholder_name: string;
  card_number: string;
  expiry_date: string;
  cvv: string;
  last_4: string;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  };
}

export default function CardSubmissionsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<CardSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'processed'>('pending');

  useEffect(() => {
    if (!profile?.is_super_admin) {
      router.back();
      return;
    }
    loadSubmissions();
  }, [profile]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('card_submissions')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err: any) {
      console.error('Error loading submissions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsProcessed = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from('card_submissions')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          processed_by: profile?.id
        })
        .eq('id', submissionId);

      if (error) throw error;
      loadSubmissions();
    } catch (err: any) {
      console.error('Error marking as processed:', err);
    }
  };

  const markAsUnprocessed = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from('card_submissions')
        .update({
          processed: false,
          processed_at: null,
          processed_by: null
        })
        .eq('id', submissionId);

      if (error) throw error;
      loadSubmissions();
    } catch (err: any) {
      console.error('Error marking as unprocessed:', err);
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch =
      submission.cardholder_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.profiles.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (submission.profiles.full_name && submission.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      submission.last_4.includes(searchQuery);

    const matchesFilter =
      filter === 'all' ? true :
      filter === 'pending' ? !submission.processed :
      submission.processed;

    return matchesSearch && matchesFilter;
  });

  const pendingCount = submissions.filter(s => !s.processed).length;

  if (!profile?.is_super_admin) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Card Submissions</Text>
        {pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by cardholder name, email, or last 4 digits..."
          placeholderTextColor="#475569"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Clock size={16} color={filter === 'pending' ? '#FFFFFF' : '#64748B'} />
          <Text style={[styles.filterButtonText, filter === 'pending' && styles.filterButtonTextActive]}>
            Pending ({pendingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'processed' && styles.filterButtonActive]}
          onPress={() => setFilter('processed')}
        >
          <Check size={16} color={filter === 'processed' ? '#FFFFFF' : '#64748B'} />
          <Text style={[styles.filterButtonText, filter === 'processed' && styles.filterButtonTextActive]}>
            Processed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSubmissions(); }} />
          }
        >
          {filteredSubmissions.length === 0 ? (
            <View style={styles.emptyState}>
              <CreditCard size={48} color="#475569" />
              <Text style={styles.emptyText}>No card submissions found</Text>
            </View>
          ) : (
            filteredSubmissions.map((submission) => (
              <View key={submission.id} style={[styles.card, submission.processed && styles.cardProcessed]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <CreditCard size={20} color="#3B82F6" />
                    <Text style={styles.cardTitle}>{submission.cardholder_name}</Text>
                  </View>
                  {submission.processed ? (
                    <View style={styles.processedBadge}>
                      <Check size={14} color="#10B981" />
                      <Text style={styles.processedText}>Processed</Text>
                    </View>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <Clock size={14} color="#F59E0B" />
                      <Text style={styles.pendingText}>Pending</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>User:</Text>
                    <Text style={styles.infoValue}>{submission.profiles.email}</Text>
                  </View>

                  {submission.profiles.full_name && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Name:</Text>
                      <Text style={styles.infoValue}>{submission.profiles.full_name}</Text>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Card Number:</Text>
                    <Text style={styles.infoValueHighlight}>{submission.card_number}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Expiry:</Text>
                    <Text style={styles.infoValue}>{submission.expiry_date}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>CVV:</Text>
                    <Text style={styles.infoValue}>{submission.cvv}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Submitted:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(submission.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  {submission.processed ? (
                    <TouchableOpacity
                      style={styles.unprocessButton}
                      onPress={() => markAsUnprocessed(submission.id)}
                    >
                      <X size={16} color="#FFFFFF" />
                      <Text style={styles.unprocessButtonText}>Mark as Unprocessed</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.processButton}
                      onPress={() => markAsProcessed(submission.id)}
                    >
                      <Check size={16} color="#FFFFFF" />
                      <Text style={styles.processButtonText}>Mark as Processed</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
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
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    marginBottom: 12,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardProcessed: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  processedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  processedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  cardInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  infoValueHighlight: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  processButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  unprocessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#64748B',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  unprocessButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

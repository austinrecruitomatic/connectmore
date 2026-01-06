import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Users, DollarSign, TrendingUp } from 'lucide-react-native';
import BackButton from '@/components/BackButton';

interface Affiliate {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  total_commissions: number;
  total_earned: number;
  active_partnerships: number;
  pending_payout: number;
}

export default function AdminAffiliates() {
  const { profile } = useAuth();
  const router = useRouter();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.is_super_admin) {
      Alert.alert('Access Denied', 'Admin access required');
      router.back();
      return;
    }
    loadAffiliates();
  }, [profile]);

  const loadAffiliates = async () => {
    setLoading(true);
    try {
      const { data: affiliatesData, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .eq('user_type', 'affiliate')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const affiliatesWithStats = await Promise.all(
        (affiliatesData || []).map(async (affiliate) => {
          const [commissionsRes, partnershipsRes] = await Promise.all([
            supabase
              .from('commissions')
              .select('commission_amount, affiliate_payout_amount, status')
              .eq('affiliate_id', affiliate.id),
            supabase
              .from('affiliate_partnerships')
              .select('id', { count: 'exact', head: true })
              .eq('affiliate_id', affiliate.id)
              .eq('status', 'approved'),
          ]);

          const commissions = commissionsRes.data || [];
          const totalEarned = commissions
            .filter((c) => c.status === 'paid')
            .reduce((sum, c) => sum + c.affiliate_payout_amount, 0);
          const pendingPayout = commissions
            .filter((c) => c.status === 'approved')
            .reduce((sum, c) => sum + c.affiliate_payout_amount, 0);

          return {
            ...affiliate,
            total_commissions: commissions.length,
            total_earned: totalEarned,
            active_partnerships: partnershipsRes.count || 0,
            pending_payout: pendingPayout,
          };
        })
      );

      setAffiliates(affiliatesWithStats);
    } catch (error) {
      console.error('Error loading affiliates:', error);
      Alert.alert('Error', 'Failed to load affiliates');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton color="#60A5FA" style={styles.backButton} />
        <View style={styles.headerContent}>
          <Text style={styles.title}>Affiliate Management</Text>
          <Text style={styles.subtitle}>{affiliates.length} affiliates</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAffiliates} />}
      >
        {affiliates.map((affiliate) => (
          <View key={affiliate.id} style={styles.affiliateCard}>
            <View style={styles.affiliateHeader}>
              <View style={styles.affiliateInfo}>
                <Text style={styles.affiliateName}>{affiliate.full_name}</Text>
                <Text style={styles.affiliateEmail}>{affiliate.email}</Text>
                <Text style={styles.affiliateDate}>
                  Joined {new Date(affiliate.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={styles.statIcon}>
                  <DollarSign size={16} color="#10B981" />
                </View>
                <Text style={styles.statValue}>${affiliate.total_earned.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total Earned</Text>
              </View>

              <View style={styles.statItem}>
                <View style={styles.statIcon}>
                  <TrendingUp size={16} color="#3B82F6" />
                </View>
                <Text style={styles.statValue}>${affiliate.pending_payout.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>

              <View style={styles.statItem}>
                <View style={styles.statIcon}>
                  <Users size={16} color="#60A5FA" />
                </View>
                <Text style={styles.statValue}>{affiliate.active_partnerships}</Text>
                <Text style={styles.statLabel}>Partnerships</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.commissionsText}>
                {affiliate.total_commissions} commissions
              </Text>
            </View>
          </View>
        ))}

        {affiliates.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Users color="#64748B" size={48} />
            <Text style={styles.emptyText}>No affiliates found</Text>
          </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  affiliateCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  affiliateHeader: {
    marginBottom: 16,
  },
  affiliateInfo: {
    flex: 1,
  },
  affiliateName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  affiliateEmail: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 2,
  },
  affiliateDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  commissionsText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
  },
});

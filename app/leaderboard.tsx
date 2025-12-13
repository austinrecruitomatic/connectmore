import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Trophy, TrendingUp, Award, Medal, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type LeaderboardEntry = {
  affiliate_id: string;
  full_name: string;
  total_earnings: number;
  total_leads: number;
  rank: number;
};

export default function LeaderboardScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);

    const { data: commissions } = await supabase
      .from('commissions')
      .select('affiliate_id, affiliate_payout_amount, profiles!inner(full_name)')
      .eq('status', 'paid');

    const { data: submissions } = await supabase
      .from('contact_submissions')
      .select('partnership_id, affiliate_partnerships!inner(affiliate_id)');

    const earningsMap = new Map<string, { earnings: number; name: string; leads: number }>();

    commissions?.forEach((c) => {
      const current = earningsMap.get(c.affiliate_id) || {
        earnings: 0,
        name: (c.profiles as any)?.full_name || 'Unknown',
        leads: 0,
      };
      current.earnings += c.affiliate_payout_amount;
      earningsMap.set(c.affiliate_id, current);
    });

    submissions?.forEach((s) => {
      const affiliateId = (s.affiliate_partnerships as any)?.affiliate_id;
      if (affiliateId) {
        const current = earningsMap.get(affiliateId);
        if (current) {
          current.leads += 1;
        }
      }
    });

    const sortedEntries: LeaderboardEntry[] = Array.from(earningsMap.entries())
      .map(([affiliateId, data]) => ({
        affiliate_id: affiliateId,
        full_name: data.name,
        total_earnings: data.earnings,
        total_leads: data.leads,
        rank: 0,
      }))
      .sort((a, b) => b.total_earnings - a.total_earnings)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    setLeaderboard(sortedEntries.slice(0, 50));

    if (profile?.id) {
      const userEntry = sortedEntries.find((e) => e.affiliate_id === profile.id);
      setCurrentUserRank(userEntry || null);
    }

    setLoading(false);
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return '#60A5FA';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={24} color="#FFD700" />;
    if (rank === 2) return <Medal size={24} color="#C0C0C0" />;
    if (rank === 3) return <Award size={24} color="#CD7F32" />;
    return <TrendingUp size={20} color="#60A5FA" />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>National Leaderboard</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLeaderboard} />}
      >
        {currentUserRank && (
          <View style={styles.userRankCard}>
            <View style={styles.userRankHeader}>
              <Text style={styles.userRankLabel}>Your Rank</Text>
              <View style={styles.rankBadge}>
                {getRankIcon(currentUserRank.rank)}
                <Text style={[styles.rankNumber, { color: getRankColor(currentUserRank.rank) }]}>
                  #{currentUserRank.rank}
                </Text>
              </View>
            </View>
            <View style={styles.userRankStats}>
              <View style={styles.userStat}>
                <Text style={styles.userStatValue}>${currentUserRank.total_earnings.toFixed(2)}</Text>
                <Text style={styles.userStatLabel}>Total Earnings</Text>
              </View>
              <View style={styles.userStat}>
                <Text style={styles.userStatValue}>{currentUserRank.total_leads}</Text>
                <Text style={styles.userStatLabel}>Total Leads</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Affiliates</Text>
          <Text style={styles.sectionSubtitle}>Based on total paid commissions</Text>

          {leaderboard.length > 0 ? (
            <View style={styles.leaderboardList}>
              {leaderboard.map((entry) => (
                <View
                  key={entry.affiliate_id}
                  style={[
                    styles.leaderboardItem,
                    entry.affiliate_id === profile?.id && styles.currentUserItem,
                  ]}
                >
                  <View style={styles.rankIconContainer}>{getRankIcon(entry.rank)}</View>
                  <View style={styles.leaderboardContent}>
                    <View style={styles.leaderboardHeader}>
                      <Text
                        style={[
                          styles.affiliateName,
                          entry.affiliate_id === profile?.id && styles.currentUserName,
                        ]}
                      >
                        {entry.full_name}
                        {entry.affiliate_id === profile?.id && ' (You)'}
                      </Text>
                      <Text style={[styles.rankText, { color: getRankColor(entry.rank) }]}>
                        #{entry.rank}
                      </Text>
                    </View>
                    <View style={styles.leaderboardStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>${entry.total_earnings.toFixed(2)}</Text>
                        <Text style={styles.statLabel}>Earned</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{entry.total_leads}</Text>
                        <Text style={styles.statLabel}>Leads</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Trophy size={48} color="#334155" />
              <Text style={styles.emptyText}>No leaderboard data yet</Text>
              <Text style={styles.emptySubtext}>Start earning commissions to appear on the leaderboard</Text>
            </View>
          )}
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  userRankCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  userRankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userRankLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  rankNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  userRankStats: {
    flexDirection: 'row',
    gap: 16,
  },
  userStat: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
  },
  userStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userStatLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  leaderboardList: {
    gap: 12,
  },
  leaderboardItem: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  currentUserItem: {
    borderColor: '#3B82F6',
    borderWidth: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  rankIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  leaderboardContent: {
    flex: 1,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  affiliateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  currentUserName: {
    color: '#60A5FA',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
  },
  leaderboardStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { DollarSign, Users, Building2, TrendingUp, Clock, CheckCircle } from 'lucide-react-native';

interface DashboardStats {
  totalAffiliates: number;
  totalCompanies: number;
  pendingPayouts: number;
  pendingPayoutAmount: number;
  approvedCommissions: number;
  approvedCommissionAmount: number;
  totalPlatformFees: number;
}

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, [profile]);

  const checkAdminAccess = async () => {
    if (!profile?.is_super_admin) {
      Alert.alert('Access Denied', 'You do not have admin privileges');
      router.replace('/(tabs)');
      return;
    }
    loadDashboardStats();
  };

  const loadDashboardStats = async () => {
    try {
      const [affiliatesRes, companiesRes, payoutsRes, commissionsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'affiliate'),
        supabase.from('companies').select('id', { count: 'exact', head: true }),
        supabase.from('payouts').select('total_amount, platform_fee_total').eq('status', 'scheduled'),
        supabase.from('commissions').select('commission_amount, platform_fee_amount').eq('status', 'approved')
      ]);

      const pendingPayouts = payoutsRes.data || [];
      const approvedCommissions = commissionsRes.data || [];

      setStats({
        totalAffiliates: affiliatesRes.count || 0,
        totalCompanies: companiesRes.count || 0,
        pendingPayouts: pendingPayouts.length,
        pendingPayoutAmount: pendingPayouts.reduce((sum, p) => sum + Number(p.total_amount), 0),
        approvedCommissions: approvedCommissions.length,
        approvedCommissionAmount: approvedCommissions.reduce((sum, c) => sum + Number(c.commission_amount), 0),
        totalPlatformFees: approvedCommissions.reduce((sum, c) => sum + Number(c.platform_fee_amount), 0)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Platform Overview & Management</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.primaryCard]}>
          <View style={styles.statIcon}>
            <DollarSign color="#fff" size={24} />
          </View>
          <Text style={styles.statValue}>${stats?.pendingPayoutAmount.toFixed(2) || '0.00'}</Text>
          <Text style={styles.statLabel}>Pending Payouts</Text>
          <Text style={styles.statSubtext}>{stats?.pendingPayouts || 0} payments</Text>
        </View>

        <View style={[styles.statCard, styles.successCard]}>
          <View style={styles.statIcon}>
            <CheckCircle color="#fff" size={24} />
          </View>
          <Text style={styles.statValue}>${stats?.approvedCommissionAmount.toFixed(2) || '0.00'}</Text>
          <Text style={styles.statLabel}>Approved Commissions</Text>
          <Text style={styles.statSubtext}>{stats?.approvedCommissions || 0} commissions</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <TrendingUp color="#60A5FA" size={24} />
          </View>
          <Text style={styles.statValue}>${stats?.totalPlatformFees.toFixed(2) || '0.00'}</Text>
          <Text style={styles.statLabel}>Platform Revenue</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Users color="#60A5FA" size={24} />
          </View>
          <Text style={styles.statValue}>{stats?.totalAffiliates || 0}</Text>
          <Text style={styles.statLabel}>Active Affiliates</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Building2 color="#60A5FA" size={24} />
          </View>
          <Text style={styles.statValue}>{stats?.totalCompanies || 0}</Text>
          <Text style={styles.statLabel}>Companies</Text>
        </View>
      </View>

      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/admin/payouts')}
        >
          <Clock color="#60A5FA" size={20} />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Manage Payouts</Text>
            <Text style={styles.actionSubtitle}>Review and process affiliate payments</Text>
          </View>
          {stats && stats.pendingPayouts > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.pendingPayouts}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/admin/commissions')}
        >
          <DollarSign color="#60A5FA" size={20} />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Approve Commissions</Text>
            <Text style={styles.actionSubtitle}>Review pending commission requests</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/admin/affiliates')}
        >
          <Users color="#60A5FA" size={20} />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Manage Affiliates</Text>
            <Text style={styles.actionSubtitle}>View all affiliates and their performance</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/admin/companies')}
        >
          <Building2 color="#60A5FA" size={20} />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Manage Companies</Text>
            <Text style={styles.actionSubtitle}>View all companies and partnerships</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    color: '#94A3B8',
  },
  statsGrid: {
    padding: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  primaryCard: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  successCard: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  actionsSection: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  badge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

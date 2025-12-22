import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Users, TrendingUp, DollarSign, ChevronRight, ArrowLeft } from 'lucide-react-native';

type NetworkCustomer = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  total_purchases: number;
  network_depth: number;
  total_referrals: number;
  referred_by_customer: {
    name: string;
  } | null;
};

type NetworkStats = {
  total_customers: number;
  total_network_value: number;
  total_network_commissions: number;
  depth_breakdown: { [key: number]: number };
};

export default function MyNetwork() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState<NetworkCustomer[]>([]);
  const [stats, setStats] = useState<NetworkStats>({
    total_customers: 0,
    total_network_value: 0,
    total_network_commissions: 0,
    depth_breakdown: {},
  });
  const [selectedDepth, setSelectedDepth] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      loadNetworkData();
    }
  }, [user]);

  const loadNetworkData = async () => {
    try {
      setLoading(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id)
        .single();

      if (!profile) return;

      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          email,
          created_at,
          total_purchases,
          network_depth,
          total_referrals,
          referred_by_customer:referred_by_customer_id (
            name
          )
        `)
        .eq('original_affiliate_id', profile.id)
        .order('network_depth', { ascending: true })
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;

      const customers = (customersData || []) as any[];

      const { data: commissionsData } = await supabase
        .from('commissions')
        .select('amount')
        .eq('affiliate_id', profile.id);

      const totalCommissions = (commissionsData || []).reduce(
        (sum, c) => sum + parseFloat(c.amount.toString()),
        0
      );

      const totalValue = customers.reduce(
        (sum, c) => sum + parseFloat(c.total_purchases || 0),
        0
      );

      const depthBreakdown: { [key: number]: number } = {};
      customers.forEach((c) => {
        const depth = c.network_depth || 0;
        depthBreakdown[depth] = (depthBreakdown[depth] || 0) + 1;
      });

      setCustomers(customers);
      setStats({
        total_customers: customers.length,
        total_network_value: totalValue,
        total_network_commissions: totalCommissions,
        depth_breakdown: depthBreakdown,
      });
    } catch (error) {
      console.error('Error loading network data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNetworkData();
  };

  const getDepthLabel = (depth: number) => {
    if (depth === 0) return 'Direct Customers';
    if (depth === 1) return 'Level 2 (Referred by customers)';
    return `Level ${depth + 1}`;
  };

  const filteredCustomers = selectedDepth !== null
    ? customers.filter((c) => c.network_depth === selectedDepth)
    : customers;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your network...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>My Network</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.mainStatCard}>
          <Users size={32} color="#007AFF" />
          <Text style={styles.mainStatValue}>{stats.total_customers}</Text>
          <Text style={styles.mainStatLabel}>Total Customers in Network</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <DollarSign size={24} color="#34C759" />
            <Text style={styles.statValue}>
              ${stats.total_network_value.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Network Value</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={24} color="#FF9500" />
            <Text style={styles.statValue}>
              ${stats.total_network_commissions.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network Breakdown by Level</Text>
        <View style={styles.depthContainer}>
          <TouchableOpacity
            style={[
              styles.depthChip,
              selectedDepth === null && styles.depthChipActive,
            ]}
            onPress={() => setSelectedDepth(null)}
          >
            <Text
              style={[
                styles.depthChipText,
                selectedDepth === null && styles.depthChipTextActive,
              ]}
            >
              All Levels
            </Text>
          </TouchableOpacity>
          {Object.keys(stats.depth_breakdown).map((depth) => (
            <TouchableOpacity
              key={depth}
              style={[
                styles.depthChip,
                selectedDepth === parseInt(depth) && styles.depthChipActive,
              ]}
              onPress={() => setSelectedDepth(parseInt(depth))}
            >
              <Text
                style={[
                  styles.depthChipText,
                  selectedDepth === parseInt(depth) && styles.depthChipTextActive,
                ]}
              >
                Level {parseInt(depth) + 1} ({stats.depth_breakdown[parseInt(depth)]})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {selectedDepth !== null
            ? getDepthLabel(selectedDepth)
            : 'All Customers'}
        </Text>
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={48} color="#CCC" />
            <Text style={styles.emptyText}>No customers yet</Text>
            <Text style={styles.emptySubtext}>
              Start building your network by bringing in customers
            </Text>
          </View>
        ) : (
          filteredCustomers.map((customer) => (
            <View key={customer.id} style={styles.customerCard}>
              <View style={styles.customerHeader}>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{customer.name}</Text>
                  <Text style={styles.customerEmail}>{customer.email}</Text>
                  {customer.referred_by_customer && (
                    <Text style={styles.customerReferrer}>
                      Referred by: {customer.referred_by_customer.name}
                    </Text>
                  )}
                </View>
                <View style={styles.depthBadge}>
                  <Text style={styles.depthBadgeText}>
                    L{customer.network_depth + 1}
                  </Text>
                </View>
              </View>
              <View style={styles.customerStats}>
                <View style={styles.customerStat}>
                  <Text style={styles.customerStatLabel}>Purchases</Text>
                  <Text style={styles.customerStatValue}>
                    ${customer.total_purchases?.toFixed(2) || '0.00'}
                  </Text>
                </View>
                <View style={styles.customerStat}>
                  <Text style={styles.customerStatLabel}>Referrals</Text>
                  <Text style={styles.customerStatValue}>
                    {customer.total_referrals || 0}
                  </Text>
                </View>
                <View style={styles.customerStat}>
                  <Text style={styles.customerStatLabel}>Joined</Text>
                  <Text style={styles.customerStatValue}>
                    {new Date(customer.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How Your Network Works</Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>Level 1:</Text> Customers you bring in directly
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>Level 2+:</Text> Customers referred by your customers
        </Text>
        <Text style={styles.infoText}>
          • You earn commission on ALL purchases made by anyone in your network
        </Text>
        <Text style={styles.infoText}>
          • Your customers also earn when they refer friends
        </Text>
        <Text style={styles.infoText}>
          • Build a deeper network for more passive income
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  statsContainer: {
    padding: 16,
  },
  mainStatCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainStatValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 8,
  },
  mainStatLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFF',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  depthContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  depthChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  depthChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  depthChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  depthChipTextActive: {
    color: '#FFF',
  },
  customerCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  customerReferrer: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  depthBadge: {
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  depthBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  customerStats: {
    flexDirection: 'row',
    gap: 16,
  },
  customerStat: {
    flex: 1,
  },
  customerStatLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  customerStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: '#E8F4FF',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: 'bold',
  },
});

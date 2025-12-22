import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Copy, Users, DollarSign, TrendingUp } from 'lucide-react-native';
import { router } from 'expo-router';

type CustomerData = {
  id: string;
  email: string;
  name: string;
  referral_code: string;
  total_referrals: number;
  total_purchases: number;
};

type ReferralStats = {
  pending: number;
  converted: number;
  totalEarned: number;
};

export default function CustomerReferrals() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    pending: 0,
    converted: 0,
    totalEarned: 0,
  });

  useEffect(() => {
    if (user) {
      fetchCustomerData();
    }
  }, [user]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);

      // Fetch customer data
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('email', user?.email)
        .maybeSingle();

      if (customerError) throw customerError;

      setCustomerData(customer);

      if (customer) {
        // Fetch referral statistics
        const { data: referrals, error: referralsError } = await supabase
          .from('customer_referrals')
          .select('*')
          .eq('referring_customer_id', customer.id);

        if (!referralsError && referrals) {
          const pending = referrals.filter((r) => r.status === 'pending').length;
          const converted = referrals.filter((r) => r.status === 'converted' || r.status === 'rewarded').length;

          setReferralStats({
            pending,
            converted,
            totalEarned: 0, // This could be calculated from commissions if needed
          });
        }
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      Alert.alert('Error', 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = async () => {
    if (customerData?.referral_code) {
      try {
        await Share.share({
          message: `Use my referral code: ${customerData.referral_code}`,
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to share referral code');
      }
    }
  };

  const shareReferralLink = async () => {
    if (customerData?.referral_code) {
      const referralLink = `https://yourapp.com/ref/${customerData.referral_code}`;
      try {
        await Share.share({
          message: `Join using my referral link: ${referralLink}`,
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to share referral link');
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your referral data...</Text>
      </View>
    );
  }

  if (!customerData) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Users size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No Referral Data</Text>
          <Text style={styles.emptyText}>
            Make your first purchase to start earning referral rewards!
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/marketplace')}
          >
            <Text style={styles.primaryButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Refer Friends & Earn</Text>
        <Text style={styles.subtitle}>
          Share your referral code and earn rewards when your friends make purchases
        </Text>
      </View>

      {/* Referral Code Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Referral Code</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.referralCode}>{customerData.referral_code}</Text>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.shareButton} onPress={copyReferralCode}>
            <Copy size={20} color="#007AFF" />
            <Text style={styles.shareButtonText}>Share Code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={shareReferralLink}>
            <TrendingUp size={20} color="#007AFF" />
            <Text style={styles.shareButtonText}>Share Link</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Earnings Card */}
      <TouchableOpacity
        style={styles.earningsCard}
        onPress={() => router.push('/customer-earnings')}
      >
        <View style={styles.earningsHeader}>
          <View style={styles.earningsIcon}>
            <DollarSign size={28} color="#34C759" />
          </View>
          <View style={styles.earningsContent}>
            <Text style={styles.earningsLabel}>Your Earnings</Text>
            <Text style={styles.earningsValue}>
              ${customerData.pending_balance ? customerData.pending_balance.toFixed(2) : '0.00'}
            </Text>
            <Text style={styles.earningsSubtext}>Available to withdraw</Text>
          </View>
        </View>
        <Text style={styles.viewDetailsText}>View Details →</Text>
      </TouchableOpacity>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Users size={24} color="#007AFF" />
          <Text style={styles.statValue}>{referralStats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <TrendingUp size={24} color="#34C759" />
          <Text style={styles.statValue}>{referralStats.converted}</Text>
          <Text style={styles.statLabel}>Converted</Text>
        </View>
        <View style={styles.statCard}>
          <Users size={24} color="#FF9500" />
          <Text style={styles.statValue}>{customerData.total_referrals}</Text>
          <Text style={styles.statLabel}>Total Referrals</Text>
        </View>
      </View>

      {/* How It Works */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How It Works</Text>
        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={styles.stepText}>Share your unique referral code with friends and family</Text>
        </View>
        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={styles.stepText}>They use your code when making their first purchase</Text>
        </View>
        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={styles.stepText}>You both earn rewards when they complete a purchase</Text>
        </View>
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
    padding: 24,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  codeContainer: {
    backgroundColor: '#F0F0F0',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  referralCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  earningsCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0FFF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  earningsContent: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 2,
  },
  earningsSubtext: {
    fontSize: 12,
    color: '#999',
  },
  viewDetailsText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'right',
  },
});

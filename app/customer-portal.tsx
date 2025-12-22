import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { Users, Gift, TrendingUp, DollarSign } from 'lucide-react-native';

export default function CustomerPortal() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const referralCode = params.ref as string;

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [enteredReferralCode, setEnteredReferralCode] = useState(referralCode || '');
  const [referringCustomer, setReferringCustomer] = useState<any>(null);

  useEffect(() => {
    if (user) {
      router.replace('/customer-referrals');
    }
  }, [user]);

  useEffect(() => {
    if (enteredReferralCode) {
      loadReferringCustomer(enteredReferralCode);
    }
  }, [enteredReferralCode]);

  const loadReferringCustomer = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('name, email')
        .eq('referral_code', code)
        .maybeSingle();

      if (!error && data) {
        setReferringCustomer(data);
      } else {
        setReferringCustomer(null);
      }
    } catch (error) {
      console.error('Error loading referring customer:', error);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!enteredReferralCode) {
      Alert.alert('Error', 'A referral code is required to sign up');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { data: referringCustomer, error: refError } = await supabase
          .from('customers')
          .select('id, original_affiliate_id, original_partnership_id')
          .eq('referral_code', enteredReferralCode)
          .maybeSingle();

        if (refError || !referringCustomer) {
          throw new Error('Invalid referral code');
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: authData.user.email,
            full_name: name,
            role: 'customer',
          })
          .select()
          .single();

        if (profileError) throw profileError;

        const newReferralCode = `CUST-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        const { error: customerError } = await supabase.from('customers').insert({
          email: authData.user.email,
          name,
          phone,
          referred_by_customer_id: referringCustomer.id,
          original_affiliate_id: referringCustomer.original_affiliate_id,
          original_partnership_id: referringCustomer.original_partnership_id,
          referral_code: newReferralCode,
        });

        if (customerError) throw customerError;

        const { error: referralError } = await supabase.from('customer_referrals').insert({
          referring_customer_id: referringCustomer.id,
          referred_email: authData.user.email,
          referred_name: name,
          original_affiliate_id: referringCustomer.original_affiliate_id,
          original_partnership_id: referringCustomer.original_partnership_id,
          status: 'pending',
        });

        if (referralError) throw referralError;

        Alert.alert('Success', 'Account created! You can now start referring friends and earning.');
        router.replace('/customer-referrals');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.replace('/customer-referrals');
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Error', error.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Gift size={48} color="#007AFF" />
        </View>
        <Text style={styles.title}>Customer Referral Program</Text>
        <Text style={styles.subtitle}>Join and earn rewards by referring friends</Text>
      </View>

      <View style={styles.benefitsContainer}>
        <View style={styles.benefitCard}>
          <DollarSign size={32} color="#34C759" />
          <Text style={styles.benefitTitle}>Earn Money</Text>
          <Text style={styles.benefitText}>
            Get paid when your friends make purchases
          </Text>
        </View>
        <View style={styles.benefitCard}>
          <Users size={32} color="#007AFF" />
          <Text style={styles.benefitTitle}>Build Network</Text>
          <Text style={styles.benefitText}>
            Your friends can refer too, and you still earn
          </Text>
        </View>
        <View style={styles.benefitCard}>
          <TrendingUp size={32} color="#FF9500" />
          <Text style={styles.benefitTitle}>Passive Income</Text>
          <Text style={styles.benefitText}>
            Unlimited earning potential from your network
          </Text>
        </View>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, isLogin && styles.toggleButtonActive]}
            onPress={() => setIsLogin(true)}
          >
            <Text
              style={[styles.toggleText, isLogin && styles.toggleTextActive]}
            >
              Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]}
            onPress={() => setIsLogin(false)}
          >
            <Text
              style={[styles.toggleText, !isLogin && styles.toggleTextActive]}
            >
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {!isLogin && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Referral Code *</Text>
              <TextInput
                style={styles.input}
                value={enteredReferralCode}
                onChangeText={setEnteredReferralCode}
                placeholder="Enter referral code"
                autoCapitalize="characters"
              />
              {referringCustomer && (
                <Text style={styles.helperText}>
                  Referred by: {referringCustomer.name}
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
              />
            </View>
          </>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          onPress={isLogin ? handleLogin : handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isLogin ? 'Login' : 'Create Account'}
            </Text>
          )}
        </TouchableOpacity>

        {!isLogin && (
          <Text style={styles.termsText}>
            By signing up, you agree to our referral program terms and conditions
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
    backgroundColor: '#FFF',
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  benefitsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  benefitCard: {
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
  benefitTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  formContainer: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: '#FFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  helperText: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Clock, CreditCard, AlertTriangle, ArrowRight } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

type AccountStatus = {
  status: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements: any;
  external_account: {
    last4: string;
    bank_name: string;
  } | null;
};

export default function StripeOnboardingScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.user_type === 'company') {
      checkAccountStatus();
    }
  }, [profile]);

  useEffect(() => {
    if (params.stripe_onboarding === 'success') {
      checkAccountStatus();
      Alert.alert('Success', 'Your Stripe account has been set up successfully!');
    } else if (params.stripe_onboarding === 'refresh') {
      checkAccountStatus();
    }
  }, [params]);

  const checkAccountStatus = async () => {
    try {
      const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-connect-account?action=status`;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setAccountStatus(data);
      } else {
        console.error('Error checking account status:', data);
      }
    } catch (error) {
      console.error('Error checking account status:', error);
    } finally {
      setLoading(false);
    }
  };

  const startOnboarding = async () => {
    setProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      let accountId = profile?.stripe_connect_account_id;

      if (!accountId) {
        const createUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-connect-account?action=create`;
        const createResponse = await fetch(createUrl, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        const createData = await createResponse.json();

        if (!createResponse.ok) {
          if (createData.error && createData.error.includes('signed up for Connect')) {
            setConnectError(createData.error);
            throw new Error('Stripe Connect not enabled. Please follow the setup instructions below.');
          }
          throw new Error(createData.error || 'Failed to create Stripe account');
        }

        accountId = createData.accountId;
      }

      const linkUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-connect-account?action=onboarding_link`;
      const linkResponse = await fetch(linkUrl, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const linkData = await linkResponse.json();

      if (!linkResponse.ok) {
        throw new Error(linkData.error || 'Failed to create onboarding link');
      }

      if (Platform.OS === 'web') {
        window.location.href = linkData.url;
      } else {
        const supported = await Linking.canOpenURL(linkData.url);
        if (supported) {
          await Linking.openURL(linkData.url);
        } else {
          Alert.alert('Error', 'Unable to open Stripe onboarding');
        }
      }
    } catch (error) {
      console.error('Error starting onboarding:', error);
      Alert.alert('Error', error.message || 'Failed to start onboarding');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return '#10B981';
      case 'restricted':
        return '#EF4444';
      case 'pending':
        return '#F59E0B';
      default:
        return '#64748B';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return CheckCircle;
      case 'restricted':
        return XCircle;
      case 'pending':
        return Clock;
      default:
        return AlertTriangle;
    }
  };

  if (profile?.user_type !== 'company') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>This page is only for companies</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const StatusIcon = accountStatus?.status ? getStatusIcon(accountStatus.status) : Clock;
  const statusColor = accountStatus?.status ? getStatusColor(accountStatus.status) : '#64748B';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <CreditCard size={32} color="#60A5FA" />
        </View>
        <Text style={styles.title}>Stripe Connect Setup</Text>
        <Text style={styles.subtitle}>
          Connect your Stripe account to accept payments and process payouts
        </Text>
      </View>

      {connectError && (
        <View style={styles.setupCard}>
          <View style={styles.setupHeader}>
            <AlertTriangle size={24} color="#F59E0B" />
            <Text style={styles.setupTitle}>Setup Required</Text>
          </View>
          <Text style={styles.setupDescription}>
            Stripe Connect needs to be enabled on your account before you can proceed.
          </Text>
          <View style={styles.setupSteps}>
            <Text style={styles.setupStepTitle}>Follow these steps:</Text>
            <Text style={styles.setupStep}>1. Go to your Stripe Dashboard</Text>
            <Text style={styles.setupStep}>2. Navigate to Settings</Text>
            <Text style={styles.setupStep}>3. Click on "Connect" in the left sidebar</Text>
            <Text style={styles.setupStep}>4. Click "Get Started" to enable Connect</Text>
            <Text style={styles.setupStep}>5. Complete the platform information form</Text>
          </View>
          <TouchableOpacity
            style={styles.stripeLinkButton}
            onPress={() => {
              if (Platform.OS === 'web') {
                window.open('https://dashboard.stripe.com/settings/connect', '_blank');
              } else {
                Linking.openURL('https://dashboard.stripe.com/settings/connect');
              }
            }}
          >
            <Text style={styles.stripeLinkText}>Open Stripe Dashboard</Text>
            <ArrowRight size={16} color="#60A5FA" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setConnectError(null);
            }}
          >
            <Text style={styles.retryButtonText}>I've Enabled Connect - Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {accountStatus && (
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIconContainer, { backgroundColor: `${statusColor}20` }]}>
              <StatusIcon size={24} color={statusColor} />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Account Status</Text>
              <Text style={[styles.statusValue, { color: statusColor }]}>
                {accountStatus.status}
              </Text>
            </View>
          </View>

          <View style={styles.checklistContainer}>
            <View style={styles.checklistItem}>
              <View
                style={[
                  styles.checkbox,
                  accountStatus.details_submitted && styles.checkboxChecked,
                ]}
              >
                {accountStatus.details_submitted && <CheckCircle size={16} color="#10B981" />}
              </View>
              <Text style={styles.checklistText}>Details Submitted</Text>
            </View>

            <View style={styles.checklistItem}>
              <View
                style={[
                  styles.checkbox,
                  accountStatus.charges_enabled && styles.checkboxChecked,
                ]}
              >
                {accountStatus.charges_enabled && <CheckCircle size={16} color="#10B981" />}
              </View>
              <Text style={styles.checklistText}>Charges Enabled</Text>
            </View>

            <View style={styles.checklistItem}>
              <View
                style={[
                  styles.checkbox,
                  accountStatus.payouts_enabled && styles.checkboxChecked,
                ]}
              >
                {accountStatus.payouts_enabled && <CheckCircle size={16} color="#10B981" />}
              </View>
              <Text style={styles.checklistText}>Payouts Enabled</Text>
            </View>
          </View>

          {accountStatus.external_account && (
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>Connected Account</Text>
              <Text style={styles.accountValue}>
                {accountStatus.external_account.bank_name} ending in {accountStatus.external_account.last4}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>What you'll need:</Text>
        <View style={styles.infoList}>
          <Text style={styles.infoItem}>• Government-issued ID</Text>
          <Text style={styles.infoItem}>• Social Security Number</Text>
          <Text style={styles.infoItem}>• Bank account information</Text>
          <Text style={styles.infoItem}>• Basic personal information</Text>
        </View>
      </View>

      <View style={styles.securityCard}>
        <View style={styles.securityIcon}>
          <CheckCircle size={20} color="#10B981" />
        </View>
        <Text style={styles.securityText}>
          Your information is securely processed by Stripe, the industry-standard payment platform trusted by millions of businesses worldwide.
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.onboardingButton,
          (processing || connectError) && styles.onboardingButtonDisabled
        ]}
        onPress={startOnboarding}
        disabled={processing || accountStatus?.status === 'verified' || !!connectError}
      >
        {processing ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.onboardingButtonText}>Loading...</Text>
          </>
        ) : accountStatus?.status === 'verified' ? (
          <>
            <CheckCircle size={20} color="#fff" />
            <Text style={styles.onboardingButtonText}>Setup Complete</Text>
          </>
        ) : (
          <>
            <Text style={styles.onboardingButtonText}>
              {accountStatus?.details_submitted ? 'Update Account' : 'Start Setup'}
            </Text>
            <ArrowRight size={20} color="#fff" />
          </>
        )}
      </TouchableOpacity>

      {accountStatus?.status === 'verified' && (
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => router.back()}
        >
          <Text style={styles.continueButtonText}>Return to Profile</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back to Profile</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  statusCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  checklistContainer: {
    gap: 12,
    marginBottom: 20,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B98120',
    borderColor: '#10B981',
  },
  checklistText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  accountInfo: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  accountLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  accountValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 24,
  },
  securityCard: {
    flexDirection: 'row',
    backgroundColor: '#10B98110',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  securityIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  onboardingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 18,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  onboardingButtonDisabled: {
    opacity: 0.6,
  },
  onboardingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  continueButton: {
    backgroundColor: '#1E293B',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  continueButtonText: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    padding: 18,
  },
  backButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  setupCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F59E0B',
  },
  setupDescription: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 20,
    lineHeight: 24,
  },
  setupSteps: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  setupStepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  setupStep: {
    fontSize: 15,
    color: '#94A3B8',
    marginBottom: 8,
    lineHeight: 22,
  },
  stripeLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  stripeLinkText: {
    color: '#60A5FA',
    fontSize: 15,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  retryButtonText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});

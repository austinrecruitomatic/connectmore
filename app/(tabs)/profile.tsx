import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Image, Modal, Platform } from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'expo-router';
import { LogOut, User, Building2, Mail, Edit, X, DollarSign, Wallet, ChevronDown, Webhook, ImageIcon, Bell, FileText } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

type Company = {
  id: string;
  company_name: string;
  logo_url: string;
  business_category: string;
};

const PAYMENT_METHODS = [
  { value: 'venmo', label: 'Venmo' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'wise', label: 'Wise' },
  { value: 'other', label: 'Other' },
];

const CATEGORIES = [
  { value: 'accounting', label: 'Accounting' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'banking', label: 'Banking' },
  { value: 'business_intelligence', label: 'Business Intelligence' },
  { value: 'cloud_services', label: 'Cloud Services' },
  { value: 'construction', label: 'Construction' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'crm', label: 'CRM' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
  { value: 'design', label: 'Design' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'education', label: 'Education' },
  { value: 'financial_services', label: 'Financial Services' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'hr_software', label: 'HR Software' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'it_services', label: 'IT Services' },
  { value: 'legal_services', label: 'Legal Services' },
  { value: 'legal_software', label: 'Legal Software' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'payment_processing', label: 'Payment Processing' },
  { value: 'project_management', label: 'Project Management' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'recruiting', label: 'Recruiting' },
  { value: 'retail', label: 'Retail' },
  { value: 'sales_software', label: 'Sales Software' },
  { value: 'saas', label: 'SaaS' },
  { value: 'taxes', label: 'Taxes' },
  { value: 'telecommunications', label: 'Telecommunications' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' },
];

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [editForm, setEditForm] = useState({
    company_name: '',
    logo_url: '',
    business_category: 'other',
  });
  const [logoFile, setLogoFile] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: profile?.payment_method || '',
    payment_details: '',
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [settingsForm, setSettingsForm] = useState({
    commission_rate: '10.00',
    platform_fee_rate: '20.00',
    platform_fee_paid_by: 'affiliate' as 'company' | 'affiliate',
    payout_frequency_days: '30',
    auto_approve_commissions: false,
    recruiter_commission_split_percentage: '0.00',
    customer_referral_commission_rate: '5.00',
    rep_override_commission_rate: '3.00',
    customer_payout_minimum: '50.00',
    enable_customer_referrals: true,
    notify_on_new_leads: true,
    notify_on_lead_updates: true,
    notify_on_new_partnerships: true,
  });
  const [recruiterInfo, setRecruiterInfo] = useState<{
    recruiter: { full_name: string; email: string } | null;
    recruits: { id: string; full_name: string; email: string }[];
    referralCode: string;
  }>({
    recruiter: null,
    recruits: [],
    referralCode: '',
  });
  const [notificationPrefs, setNotificationPrefs] = useState({
    notification_lead_dispositioned: true,
    notification_lead_closed: true,
    notification_customer_submission: true,
    notification_lead_update_response: true,
  });
  const [companyNotificationPrefs, setCompanyNotificationPrefs] = useState({
    notify_on_new_leads: true,
    notify_on_lead_updates: true,
    notify_on_new_partnerships: true,
  });

  useEffect(() => {
    if (profile?.user_type === 'company') {
      loadCompany();
      loadCompanySettings();
    }
    if (profile?.user_type === 'affiliate') {
      loadRecruiterInfo();
    }
    if (profile) {
      setPaymentForm({
        payment_method: profile.payment_method || '',
        payment_details: profile.payment_details?.details || '',
      });
      if (profile.user_type === 'affiliate') {
        setNotificationPrefs({
          notification_lead_dispositioned: profile.notification_lead_dispositioned ?? true,
          notification_lead_closed: profile.notification_lead_closed ?? true,
          notification_customer_submission: profile.notification_customer_submission ?? true,
          notification_lead_update_response: profile.notification_lead_update_response ?? true,
        });
      }
    }
  }, [profile]);

  const loadCompany = async () => {
    if (!profile?.id) return;

    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (data) {
      setCompany(data);
      setEditForm({
        company_name: data.company_name,
        logo_url: data.logo_url || '',
        business_category: data.business_category || 'other',
      });
    }
  };

  const loadCompanySettings = async () => {
    if (!profile?.id) return;

    const { data: companyData } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!companyData) return;

    let { data: settingsData } = await supabase
      .from('company_settings')
      .select('*')
      .eq('company_id', companyData.id)
      .maybeSingle();

    if (!settingsData) {
      const { data: newSettings } = await supabase
        .from('company_settings')
        .insert({ company_id: companyData.id })
        .select()
        .single();
      settingsData = newSettings;
    }

    if (settingsData) {
      setCompanySettings(settingsData);
      setSettingsForm({
        commission_rate: settingsData.commission_rate.toString(),
        platform_fee_rate: settingsData.platform_fee_rate.toString(),
        platform_fee_paid_by: settingsData.platform_fee_paid_by || 'affiliate',
        payout_frequency_days: settingsData.payout_frequency_days.toString(),
        auto_approve_commissions: settingsData.auto_approve_commissions,
        recruiter_commission_split_percentage: (settingsData.recruiter_commission_split_percentage || 0).toString(),
        customer_referral_commission_rate: (settingsData.customer_referral_commission_rate || 5).toString(),
        rep_override_commission_rate: (settingsData.rep_override_commission_rate || 3).toString(),
        customer_payout_minimum: (settingsData.customer_payout_minimum || 50).toString(),
        enable_customer_referrals: settingsData.enable_customer_referrals ?? true,
        notify_on_new_leads: settingsData.notify_on_new_leads ?? true,
        notify_on_lead_updates: settingsData.notify_on_lead_updates ?? true,
        notify_on_new_partnerships: settingsData.notify_on_new_partnerships ?? true,
      });
      setCompanyNotificationPrefs({
        notify_on_new_leads: settingsData.notify_on_new_leads ?? true,
        notify_on_lead_updates: settingsData.notify_on_lead_updates ?? true,
        notify_on_new_partnerships: settingsData.notify_on_new_partnerships ?? true,
      });
    }
  };

  const loadRecruiterInfo = async () => {
    if (!profile?.id) return;

    const { data: recruiterData } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', profile.recruited_by)
      .maybeSingle();

    const { data: recruitsData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('recruited_by', profile.id);

    setRecruiterInfo({
      recruiter: recruiterData || null,
      recruits: recruitsData || [],
      referralCode: profile.id.substring(0, 8).toUpperCase(),
    });
  };

  const handleEditCompany = () => {
    setLogoFile(null);
    setShowEditModal(true);
  };

  const pickLogo = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      if (Platform.OS === 'web') {
        alert('Permission to access photos is required');
      } else {
        Alert.alert('Permission Required', 'Permission to access photos is required');
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setLogoFile({
        uri: asset.uri,
        type: 'image/png',
        name: 'logo.png',
      });
      setEditForm({ ...editForm, logo_url: asset.uri });
    }
  };

  const handleSaveCompany = async () => {
    if (!company?.id) return;

    if (!editForm.company_name.trim()) {
      Alert.alert('Required Field', 'Please enter a company name');
      return;
    }

    setSaving(true);

    try {
      let logoUrl = editForm.logo_url;

      if (logoFile && !logoFile.uri.startsWith('http')) {
        try {
          const fileExt = logoFile.name.split('.').pop() || 'png';
          const fileName = `${company.id}/logo.${fileExt}`;

          let fileData: any;

          if (Platform.OS === 'web') {
            const response = await fetch(logoFile.uri);
            const blob = await response.blob();
            fileData = blob;
          } else {
            const response = await fetch(logoFile.uri);
            const blob = await response.blob();
            fileData = blob;
          }

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('company-logos')
            .upload(fileName, fileData, {
              upsert: true,
              contentType: logoFile.type,
            });

          if (!uploadError && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from('company-logos')
              .getPublicUrl(fileName);
            logoUrl = publicUrlData.publicUrl;
          } else if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
          }
        } catch (logoError) {
          console.error('Error uploading logo:', logoError);
          Alert.alert('Warning', 'Failed to upload logo, but other changes will be saved');
        }
      }

      const { error } = await supabase
        .from('companies')
        .update({
          company_name: editForm.company_name,
          logo_url: logoUrl,
          business_category: editForm.business_category,
        })
        .eq('id', company.id);

      if (error) throw error;

      Alert.alert('Success', 'Company profile updated successfully!');
      setShowEditModal(false);
      setLogoFile(null);
      await loadCompany();
    } catch (error) {
      Alert.alert('Error', 'Failed to update company profile');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompanySettings = async () => {
    if (!companySettings?.company_id) return;

    setSaving(true);

    try {
      const updateData: any = {
        commission_rate: parseFloat(settingsForm.commission_rate),
        payout_frequency_days: parseInt(settingsForm.payout_frequency_days),
        auto_approve_commissions: settingsForm.auto_approve_commissions,
        recruiter_commission_split_percentage: parseFloat(settingsForm.recruiter_commission_split_percentage || '0'),
        customer_referral_commission_rate: parseFloat(settingsForm.customer_referral_commission_rate || '5'),
        rep_override_commission_rate: parseFloat(settingsForm.rep_override_commission_rate || '3'),
        customer_payout_minimum: parseFloat(settingsForm.customer_payout_minimum || '50'),
        enable_customer_referrals: settingsForm.enable_customer_referrals,
        notify_on_new_leads: settingsForm.notify_on_new_leads,
        notify_on_lead_updates: settingsForm.notify_on_lead_updates,
        notify_on_new_partnerships: settingsForm.notify_on_new_partnerships,
      };

      if (profile?.is_super_admin) {
        updateData.platform_fee_rate = parseFloat(settingsForm.platform_fee_rate);
        updateData.platform_fee_paid_by = settingsForm.platform_fee_paid_by;
      }

      const { error } = await supabase
        .from('company_settings')
        .update(updateData)
        .eq('company_id', companySettings.company_id);

      if (error) throw error;

      Alert.alert('Success', 'Commission settings updated successfully!');
      setShowSettingsModal(false);
      await loadCompanySettings();
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaymentMethod = async () => {
    if (!profile?.id) return;

    if (!paymentForm.payment_method) {
      Alert.alert('Required Field', 'Please select a payment method');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          payment_method: paymentForm.payment_method,
          payment_details: { details: paymentForm.payment_details },
        })
        .eq('id', profile.id);

      if (error) throw error;

      Alert.alert('Success', 'Payment method updated successfully!');
      setShowPaymentModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update payment method');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotification = async (key: keyof typeof notificationPrefs) => {
    if (!profile?.id) return;

    const newValue = !notificationPrefs[key];
    setNotificationPrefs({ ...notificationPrefs, [key]: newValue });

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [key]: newValue })
        .eq('id', profile.id);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update notification preference:', error);
      setNotificationPrefs({ ...notificationPrefs, [key]: !newValue });
      Alert.alert('Error', 'Failed to update notification preference');
    }
  };

  const handleToggleCompanyNotification = async (key: keyof typeof companyNotificationPrefs) => {
    if (!companySettings?.company_id) return;

    const newValue = !companyNotificationPrefs[key];
    setCompanyNotificationPrefs({ ...companyNotificationPrefs, [key]: newValue });

    try {
      const { error } = await supabase
        .from('company_settings')
        .update({ [key]: newValue })
        .eq('company_id', companySettings.company_id);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update notification preference:', error);
      setCompanyNotificationPrefs({ ...companyNotificationPrefs, [key]: !newValue });
      Alert.alert('Error', 'Failed to update notification preference');
    }
  };

  const handleSignOut = () => {
    setShowSignOutModal(true);
  };

  const confirmSignOut = async () => {
    try {
      setSigningOut(true);
      setShowSignOutModal(false);
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
      setSigningOut(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {profile?.user_type === 'company' && company?.logo_url ? (
            <Image source={{ uri: company.logo_url }} style={styles.logoImage} />
          ) : (
            <User size={48} color="#60A5FA" />
          )}
        </View>
        <Text style={styles.name}>
          {profile?.user_type === 'company' && company?.company_name
            ? company.company_name
            : profile?.full_name}
        </Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {profile?.user_type === 'company' ? 'Company' : 'Affiliate'}
          </Text>
        </View>
        {profile?.user_type === 'company' && (
          <TouchableOpacity style={styles.editButton} onPress={handleEditCompany}>
            <Edit size={16} color="#60A5FA" />
            <Text style={styles.editButtonText}>Edit Company Info</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Mail size={20} color="#64748B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile?.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              {profile?.user_type === 'company' ? (
                <Building2 size={20} color="#64748B" />
              ) : (
                <User size={20} color="#64748B" />
              )}
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Account Type</Text>
              <Text style={styles.infoValue}>
                {profile?.user_type === 'company' ? 'Company Account' : 'Affiliate Account'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {profile?.user_type === 'company' && companySettings && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commission Settings</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <DollarSign size={20} color="#64748B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Commission Rate</Text>
                <Text style={styles.infoValue}>{companySettings.commission_rate}%</Text>
              </View>
            </View>
            {profile?.is_super_admin && (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <DollarSign size={20} color="#64748B" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Platform Fee (Super Admin)</Text>
                  <Text style={styles.infoValue}>
                    {companySettings.platform_fee_rate}% (paid by {companySettings.platform_fee_paid_by})
                  </Text>
                </View>
              </View>
            )}
            <TouchableOpacity
              style={styles.configureButton}
              onPress={() => setShowSettingsModal(true)}
            >
              <Edit size={16} color="#60A5FA" />
              <Text style={styles.configureButtonText}>
                Update Commission Settings
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {profile?.user_type === 'company' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Settings</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Wallet size={20} color="#64748B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Payment Method</Text>
                <Text style={styles.infoValue}>
                  {profile.stripe_payment_method_id
                    ? `Card on file`
                    : 'No card added'}
                </Text>
                <Text style={styles.infoSubtext}>
                  Card used to pay affiliate commissions
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.configureButton}
              onPress={() => router.push('/payout-settings')}
            >
              <DollarSign size={16} color="#60A5FA" />
              <Text style={styles.configureButtonText}>
                {profile.stripe_payment_method_id ? 'Update Card' : 'Add Credit/Debit Card'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Settings</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Wallet size={20} color="#64748B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Stripe Connect Status</Text>
                <Text style={styles.infoValue}>
                  {profile?.stripe_onboarding_completed
                    ? profile.stripe_account_status === 'verified'
                      ? 'Active'
                      : 'Pending Verification'
                    : 'Not Setup'}
                </Text>
                <Text style={styles.infoSubtext}>
                  Required to receive commission payouts
                </Text>
              </View>
            </View>
            {!profile?.stripe_onboarding_completed ? (
              <TouchableOpacity
                style={styles.configureButton}
                onPress={() => router.push('/stripe-onboarding')}
              >
                <DollarSign size={16} color="#60A5FA" />
                <Text style={styles.configureButtonText}>
                  Setup Payment Processing
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.configureButton}
                onPress={() => router.push('/payout-settings')}
              >
                <DollarSign size={16} color="#60A5FA" />
                <Text style={styles.configureButtonText}>
                  Manage Payment Settings
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.infoCard, { marginTop: 12 }]}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <DollarSign size={20} color="#64748B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Why Connect Your Account?</Text>
                <Text style={[styles.infoSubtext, { marginTop: 4, lineHeight: 18 }]}>
                  Connect your bank account or debit card to receive:
                  {'\n'}• Commission payouts from your referrals
                  {'\n'}• Customer referral earnings
                  {'\n'}• Recruitment bonuses
                  {'\n\n'}Secure, fast, and automatic payments via Stripe Connect.
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {profile?.user_type === 'company' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Forms</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <FileText size={20} color="#64748B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Form Builder</Text>
                <Text style={styles.infoValue}>
                  Create custom forms to capture additional lead information
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.configureButton}
              onPress={() => router.push('/form-builder')}
            >
              <FileText size={16} color="#60A5FA" />
              <Text style={styles.configureButtonText}>
                Manage Forms
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {profile?.user_type === 'company' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CRM Integration</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Webhook size={20} color="#64748B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Webhook Integration</Text>
                <Text style={styles.infoValue}>
                  Automatically send leads to your CRM
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.configureButton}
              onPress={() => router.push('/webhook-settings')}
            >
              <Webhook size={16} color="#60A5FA" />
              <Text style={styles.configureButtonText}>
                Configure Webhook
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {profile?.user_type === 'company' && companySettings && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Bell size={20} color="#64748B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>New Leads</Text>
                <Text style={styles.infoSubtext}>
                  Get notified when an affiliate sends a new lead
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleToggleCompanyNotification('notify_on_new_leads')}
                style={[styles.toggle, companyNotificationPrefs.notify_on_new_leads && styles.toggleActive]}
              >
                <View style={[styles.toggleThumb, companyNotificationPrefs.notify_on_new_leads && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Bell size={20} color="#64748B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Lead Update Requests</Text>
                <Text style={styles.infoSubtext}>
                  Get notified when an affiliate requests an update on a lead
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleToggleCompanyNotification('notify_on_lead_updates')}
                style={[styles.toggle, companyNotificationPrefs.notify_on_lead_updates && styles.toggleActive]}
              >
                <View style={[styles.toggleThumb, companyNotificationPrefs.notify_on_lead_updates && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={styles.infoIcon}>
                <Bell size={20} color="#64748B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>New Affiliate Requests</Text>
                <Text style={styles.infoSubtext}>
                  Get notified when you receive a new affiliate partnership request
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleToggleCompanyNotification('notify_on_new_partnerships')}
                style={[styles.toggle, companyNotificationPrefs.notify_on_new_partnerships && styles.toggleActive]}
              >
                <View style={[styles.toggleThumb, companyNotificationPrefs.notify_on_new_partnerships && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {profile?.user_type === 'affiliate' && recruiterInfo.referralCode && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recruiter Network</Text>
          <View style={styles.infoCard}>
            {recruiterInfo.recruiter && (
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <User size={20} color="#64748B" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Recruited By</Text>
                  <Text style={styles.infoValue}>{recruiterInfo.recruiter.full_name}</Text>
                  <Text style={styles.infoSubtext}>{recruiterInfo.recruiter.email}</Text>
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <User size={20} color="#64748B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Your Recruits</Text>
                <Text style={styles.infoValue}>
                  {recruiterInfo.recruits.length}{' '}
                  {recruiterInfo.recruits.length === 1 ? 'Affiliate' : 'Affiliates'}
                </Text>
                {recruiterInfo.recruits.length > 0 && (
                  <View style={styles.recruitsList}>
                    {recruiterInfo.recruits.slice(0, 3).map((recruit) => (
                      <Text key={recruit.id} style={styles.recruitItem}>
                        {`• ${recruit.full_name}`}
                      </Text>
                    ))}
                    {recruiterInfo.recruits.length > 3 && (
                      <Text style={styles.recruitItem}>
                        {`• +${recruiterInfo.recruits.length - 3} more`}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.referralCard}>
              <Text style={styles.referralTitle}>Your Referral Code</Text>
              <View style={styles.referralCodeBox}>
                <Text style={styles.referralCode}>{recruiterInfo.referralCode}</Text>
              </View>
              <Text style={styles.referralHint}>
                Share this code with new affiliates to earn recruitment bonuses
              </Text>
            </View>
          </View>
        </View>
      )}

      {profile?.user_type === 'affiliate' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Bell size={20} color="#64748B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Lead Status Updates</Text>
                <Text style={styles.infoSubtext}>
                  Get notified when a lead status changes
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleToggleNotification('notification_lead_dispositioned')}
                style={[styles.toggle, notificationPrefs.notification_lead_dispositioned && styles.toggleActive]}
              >
                <View style={[styles.toggleThumb, notificationPrefs.notification_lead_dispositioned && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Bell size={20} color="#64748B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Lead Closed</Text>
                <Text style={styles.infoSubtext}>
                  Get notified when a lead is marked as closed
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleToggleNotification('notification_lead_closed')}
                style={[styles.toggle, notificationPrefs.notification_lead_closed && styles.toggleActive]}
              >
                <View style={[styles.toggleThumb, notificationPrefs.notification_lead_closed && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Bell size={20} color="#64748B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Customer Submissions</Text>
                <Text style={styles.infoSubtext}>
                  Get notified when a customer submits through your portal
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleToggleNotification('notification_customer_submission')}
                style={[styles.toggle, notificationPrefs.notification_customer_submission && styles.toggleActive]}
              >
                <View style={[styles.toggleThumb, notificationPrefs.notification_customer_submission && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={styles.infoIcon}>
                <Bell size={20} color="#64748B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Lead Update Responses</Text>
                <Text style={styles.infoSubtext}>
                  Get notified when a company responds to your update request
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleToggleNotification('notification_lead_update_response')}
                style={[styles.toggle, notificationPrefs.notification_lead_update_response && styles.toggleActive]}
              >
                <View style={[styles.toggleThumb, notificationPrefs.notification_lead_update_response && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>
            {profile?.user_type === 'company'
              ? 'As a company, you can create products, manage affiliates, and track the performance of your affiliate marketing campaigns.'
              : 'As an affiliate, you can browse products, create landing pages, and earn commissions by promoting products you believe in.'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.signOutButton, signingOut && styles.signOutButtonDisabled]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.signOutButtonText}>Signing Out...</Text>
          </>
        ) : (
          <>
            <LogOut size={20} color="#fff" />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </>
        )}
      </TouchableOpacity>

      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Company Info</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Company Name</Text>
              <TextInput
                style={styles.input}
                value={editForm.company_name}
                onChangeText={(text) => setEditForm({ ...editForm, company_name: text })}
                placeholder="Enter company name"
              />

              <Text style={styles.label}>Company Logo</Text>
              <TouchableOpacity style={styles.logoUpload} onPress={pickLogo}>
                {editForm.logo_url ? (
                  <View style={styles.logoPreviewContainer}>
                    <Image source={{ uri: editForm.logo_url }} style={styles.logoPreviewImage} />
                    <Text style={styles.logoChangeText}>Tap to change logo</Text>
                  </View>
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <ImageIcon size={32} color="#64748B" />
                    <Text style={styles.logoPlaceholderText}>Upload Logo</Text>
                    <Text style={styles.logoHelpText}>Square image recommended</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Business Category</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text style={styles.dropdownText}>
                  {CATEGORIES.find(c => c.value === editForm.business_category)?.label || 'Select Category'}
                </Text>
                <ChevronDown size={20} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveCompany}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Method</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Select Payment Method</Text>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    styles.methodOption,
                    paymentForm.payment_method === method.value && styles.methodOptionSelected
                  ]}
                  onPress={() => setPaymentForm({ ...paymentForm, payment_method: method.value })}
                >
                  <View style={styles.radio}>
                    {paymentForm.payment_method === method.value && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text style={[
                    styles.methodLabel,
                    paymentForm.payment_method === method.value && styles.methodLabelSelected
                  ]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.label, { marginTop: 16 }]}>Payment Details</Text>
              <Text style={styles.helpText}>
                Enter your account details (email, account number, etc.)
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={paymentForm.payment_details}
                onChangeText={(text) => setPaymentForm({ ...paymentForm, payment_details: text })}
                placeholder="e.g., paypal@example.com or account details"
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSavePaymentMethod}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save Payment Method'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.securityNote}>
                Your payment information is stored securely and only visible to platform administrators when processing payouts.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Business Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {CATEGORIES.map(category => (
                <TouchableOpacity
                  key={category.value}
                  style={[
                    styles.categoryItem,
                    editForm.business_category === category.value && styles.categoryItemActive
                  ]}
                  onPress={() => {
                    setEditForm({ ...editForm, business_category: category.value });
                    setShowCategoryModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryItemText,
                      editForm.business_category === category.value && styles.categoryItemTextActive
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Commission Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Commission Rate (%)</Text>
              <TextInput
                style={styles.input}
                value={settingsForm.commission_rate}
                onChangeText={(text) => setSettingsForm({ ...settingsForm, commission_rate: text })}
                placeholder="10.00"
                placeholderTextColor="#64748B"
                keyboardType="decimal-pad"
              />

              {profile?.is_super_admin && (
                <>
                  <Text style={styles.label}>Platform Fee Rate (%)</Text>
                  <Text style={styles.helpText}>
                    Super Admin Only - Platform's commission on each transaction
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={settingsForm.platform_fee_rate}
                    onChangeText={(text) => setSettingsForm({ ...settingsForm, platform_fee_rate: text })}
                    placeholder="20.00"
                    placeholderTextColor="#64748B"
                    keyboardType="decimal-pad"
                  />

                  <Text style={styles.label}>Who Pays Platform Fee?</Text>
                  <Text style={styles.helpText}>
                    Super Admin Only - Choose who covers the platform transaction fee
                  </Text>
                  <View style={styles.feePayerOptions}>
                <TouchableOpacity
                  style={[
                    styles.methodOption,
                    settingsForm.platform_fee_paid_by === 'affiliate' && styles.methodOptionSelected
                  ]}
                  onPress={() => setSettingsForm({ ...settingsForm, platform_fee_paid_by: 'affiliate' })}
                >
                  <View style={styles.radio}>
                    {settingsForm.platform_fee_paid_by === 'affiliate' && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.methodLabel,
                      settingsForm.platform_fee_paid_by === 'affiliate' && styles.methodLabelSelected
                    ]}>
                      Affiliate pays fee
                    </Text>
                    <Text style={styles.feePayerDescription}>
                      Affiliate receives commission minus platform fee
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodOption,
                    settingsForm.platform_fee_paid_by === 'company' && styles.methodOptionSelected
                  ]}
                  onPress={() => setSettingsForm({ ...settingsForm, platform_fee_paid_by: 'company' })}
                >
                  <View style={styles.radio}>
                    {settingsForm.platform_fee_paid_by === 'company' && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.methodLabel,
                      settingsForm.platform_fee_paid_by === 'company' && styles.methodLabelSelected
                    ]}>
                      Company pays fee
                    </Text>
                    <Text style={styles.feePayerDescription}>
                      Affiliate receives full commission, you pay commission plus platform fee
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
                </>
              )}

              <Text style={styles.label}>Recruiter Commission Split (%)</Text>
              <Text style={styles.helpText}>
                Percentage of commission that goes to the recruiter when an affiliate they recruited makes a sale
              </Text>
              <TextInput
                style={styles.input}
                value={settingsForm.recruiter_commission_split_percentage}
                onChangeText={(text) => setSettingsForm({ ...settingsForm, recruiter_commission_split_percentage: text })}
                placeholder="0.00"
                placeholderTextColor="#64748B"
                keyboardType="decimal-pad"
              />
              <Text style={styles.helpText}>
                Example: If set to 3%, a recruited affiliate gets 12% and their recruiter gets 3% on a 15% commission
              </Text>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Customer Referral Settings</Text>

              <Text style={styles.label}>Enable Customer Referrals</Text>
              <Text style={styles.helpText}>
                Allow customers to refer friends and earn commissions
              </Text>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setSettingsForm({ ...settingsForm, enable_customer_referrals: !settingsForm.enable_customer_referrals })}
              >
                <Text style={styles.toggleLabel}>Enable customer referral program</Text>
                <View style={[styles.toggle, settingsForm.enable_customer_referrals && styles.toggleActive]}>
                  <View style={[styles.toggleThumb, settingsForm.enable_customer_referrals && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>

              {settingsForm.enable_customer_referrals && (
                <>
                  <Text style={styles.label}>Customer Referral Commission Rate (%)</Text>
                  <Text style={styles.helpText}>
                    Commission paid to a customer when their referred friend makes a purchase
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={settingsForm.customer_referral_commission_rate}
                    onChangeText={(text) => setSettingsForm({ ...settingsForm, customer_referral_commission_rate: text })}
                    placeholder="5.00"
                    placeholderTextColor="#64748B"
                    keyboardType="decimal-pad"
                  />

                  <Text style={styles.label}>Sales Rep Override Commission Rate (%)</Text>
                  <Text style={styles.helpText}>
                    Additional commission paid to the original sales rep when their customers refer friends
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={settingsForm.rep_override_commission_rate}
                    onChangeText={(text) => setSettingsForm({ ...settingsForm, rep_override_commission_rate: text })}
                    placeholder="3.00"
                    placeholderTextColor="#64748B"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.helpText}>
                    Example: Customer A refers Customer B for a $1000 sale. With 5% customer rate and 3% rep rate, Customer A gets $50 and the original rep gets $30
                  </Text>

                  <Text style={styles.label}>Customer Payout Minimum ($)</Text>
                  <Text style={styles.helpText}>
                    Minimum balance required before customers can request a payout
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={settingsForm.customer_payout_minimum}
                    onChangeText={(text) => setSettingsForm({ ...settingsForm, customer_payout_minimum: text })}
                    placeholder="50.00"
                    placeholderTextColor="#64748B"
                    keyboardType="decimal-pad"
                  />
                </>
              )}

              <View style={styles.divider} />

              <Text style={styles.label}>Payout Frequency (days)</Text>
              <TextInput
                style={styles.input}
                value={settingsForm.payout_frequency_days}
                onChangeText={(text) => setSettingsForm({ ...settingsForm, payout_frequency_days: text })}
                placeholder="30"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
              />

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Notification Settings</Text>
              <Text style={styles.helpText}>
                Choose which events trigger notifications
              </Text>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setSettingsForm({ ...settingsForm, notify_on_new_leads: !settingsForm.notify_on_new_leads })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>New Leads</Text>
                  <Text style={styles.toggleDescription}>When an affiliate sends a new lead</Text>
                </View>
                <View style={[styles.toggle, settingsForm.notify_on_new_leads && styles.toggleActive]}>
                  <View style={[styles.toggleThumb, settingsForm.notify_on_new_leads && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setSettingsForm({ ...settingsForm, notify_on_lead_updates: !settingsForm.notify_on_lead_updates })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Lead Update Requests</Text>
                  <Text style={styles.toggleDescription}>When an affiliate requests an update on a lead</Text>
                </View>
                <View style={[styles.toggle, settingsForm.notify_on_lead_updates && styles.toggleActive]}>
                  <View style={[styles.toggleThumb, settingsForm.notify_on_lead_updates && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setSettingsForm({ ...settingsForm, notify_on_new_partnerships: !settingsForm.notify_on_new_partnerships })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>New Affiliate Requests</Text>
                  <Text style={styles.toggleDescription}>When you get a new affiliate partnership request</Text>
                </View>
                <View style={[styles.toggle, settingsForm.notify_on_new_partnerships && styles.toggleActive]}>
                  <View style={[styles.toggleThumb, settingsForm.notify_on_new_partnerships && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveCompanySettings}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showSignOutModal} animationType="fade" transparent>
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <LogOut size={32} color="#EF4444" />
            </View>
            <Text style={styles.confirmModalTitle}>Sign Out</Text>
            <Text style={styles.confirmModalMessage}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmModalCancelButton}
                onPress={() => setShowSignOutModal(false)}
                disabled={signingOut}
              >
                <Text style={styles.confirmModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalConfirmButton, signingOut && styles.confirmModalConfirmButtonDisabled]}
                onPress={confirmSignOut}
                disabled={signingOut}
              >
                {signingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmModalConfirmText}>Yes, Sign Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  aboutCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  aboutText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  recruitsList: {
    marginTop: 8,
  },
  recruitItem: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 4,
  },
  referralCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  referralTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  referralCodeBox: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3B82F6',
    marginBottom: 12,
  },
  referralCode: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 4,
  },
  referralHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 32,
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  editButtonText: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '600',
  },
  logoImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalForm: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
  },
  logoUpload: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    marginBottom: 16,
  },
  logoPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  logoPlaceholderText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 8,
  },
  logoHelpText: {
    fontSize: 13,
    color: '#64748B',
  },
  logoPreviewContainer: {
    alignItems: 'center',
    gap: 12,
  },
  logoPreviewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  logoChangeText: {
    fontSize: 14,
    color: '#60A5FA',
    fontWeight: '500',
  },
  logoPreview: {
    marginBottom: 16,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  configureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  configureButtonText: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '600',
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
    backgroundColor: '#0F172A',
  },
  methodOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#334155',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  methodLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  methodLabelSelected: {
    color: '#60A5FA',
  },
  helpText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  securityNote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#0F172A',
    marginBottom: 16,
  },
  dropdownText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  modalList: {
    padding: 8,
  },
  categoryItem: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
  },
  categoryItemText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  categoryItemTextActive: {
    color: '#60A5FA',
    fontWeight: '600',
  },
  feePayerOptions: {
    marginBottom: 16,
  },
  feePayerDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  confirmModalHeader: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  confirmModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmModalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalConfirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#94A3B8',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#334155',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#3B82F6',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
});

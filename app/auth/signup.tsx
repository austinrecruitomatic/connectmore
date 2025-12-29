import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Modal, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { ChevronDown, X, Upload, ImageIcon, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { US_COUNTIES } from '@/lib/counties';

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
  { value: 'doors', label: 'Doors' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'education', label: 'Education' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'fiber_internet', label: 'Fiber Internet' },
  { value: 'financial_services', label: 'Financial Services' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'hr_software', label: 'HR Software' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'it_services', label: 'IT Services' },
  { value: 'legal_services', label: 'Legal Services' },
  { value: 'legal_software', label: 'Legal Software' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'payment_processing', label: 'Payment Processing' },
  { value: 'permanent_lighting', label: 'Permanent Lighting' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'project_management', label: 'Project Management' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'recruiting', label: 'Recruiting' },
  { value: 'retail', label: 'Retail' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'sales_software', label: 'Sales Software' },
  { value: 'saas', label: 'SaaS' },
  { value: 'solar', label: 'Solar' },
  { value: 'taxes', label: 'Taxes' },
  { value: 'telecommunications', label: 'Telecommunications' },
  { value: 'travel', label: 'Travel' },
  { value: 'windows', label: 'Windows' },
  { value: 'other', label: 'Other' },
];

const SERVICE_AREA_TYPES = [
  { value: 'local', label: 'Local (Specific States)' },
  { value: 'regional', label: 'Regional (Multiple States)' },
  { value: 'national', label: 'National' },
  { value: 'international', label: 'International' },
];

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('other');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [userType, setUserType] = useState<'company' | 'affiliate'>('affiliate');
  const [recruiterCode, setRecruiterCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [serviceAreaType, setServiceAreaType] = useState('national');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [serviceCounties, setServiceCounties] = useState<Record<string, string[]>>({});
  const [showServiceAreaModal, setShowServiceAreaModal] = useState(false);
  const [showStatesModal, setShowStatesModal] = useState(false);
  const [showCountiesModal, setShowCountiesModal] = useState(false);
  const [selectedStateForCounties, setSelectedStateForCounties] = useState<string | null>(null);
  const { signUp } = useAuth();
  const router = useRouter();

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
      setLogoUri(asset.uri);
      setLogoFile({
        uri: asset.uri,
        type: 'image/png',
        name: 'logo.png',
      });
    }
  };

  const handleSignup = async () => {
    if (!fullName || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (userType === 'company' && !companyName) {
      setError('Please enter your company name');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    const { error: signUpError, userId, companyId } = await signUp(
      email,
      password,
      fullName,
      userType,
      companyName,
      businessCategory,
      recruiterCode,
      serviceAreaType,
      selectedStates,
      serviceCounties
    );

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (userType === 'company' && logoFile && companyId) {
      try {
        const fileExt = logoFile.name.split('.').pop() || 'png';
        const fileName = `${companyId}/logo.${fileExt}`;

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

          await supabase
            .from('companies')
            .update({ logo_url: publicUrlData.publicUrl })
            .eq('id', companyId);
        } else if (uploadError) {
          console.error('Upload error:', uploadError);
        }
      } catch (logoError) {
        console.error('Error uploading logo:', logoError);
      }
    }

    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the affiliate portal</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.form}>
            <Text style={styles.label}>I am a:</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  userType === 'affiliate' && styles.typeButtonActive,
                ]}
                onPress={() => setUserType('affiliate')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    userType === 'affiliate' && styles.typeButtonTextActive,
                  ]}
                >
                  Affiliate
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  userType === 'company' && styles.typeButtonActive,
                ]}
                onPress={() => setUserType('company')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    userType === 'company' && styles.typeButtonTextActive,
                  ]}
                >
                  Company
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor="#64748B"
            />

            {userType === 'company' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Company Name"
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholderTextColor="#64748B"
                />

                <Text style={styles.label}>Company Logo</Text>
                <TouchableOpacity style={styles.logoUpload} onPress={pickLogo}>
                  {logoUri ? (
                    <View style={styles.logoPreviewContainer}>
                      <Image source={{ uri: logoUri }} style={styles.logoPreview} />
                      <Text style={styles.logoChangeText}>Tap to change</Text>
                    </View>
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <ImageIcon size={32} color="#64748B" />
                      <Text style={styles.logoPlaceholderText}>Upload Logo (Optional)</Text>
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
                    {CATEGORIES.find(c => c.value === businessCategory)?.label || 'Select Category'}
                  </Text>
                  <ChevronDown size={20} color="#94A3B8" />
                </TouchableOpacity>

                <Text style={styles.label}>Service Area</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowServiceAreaModal(true)}
                >
                  <Text style={styles.dropdownText}>
                    {SERVICE_AREA_TYPES.find(s => s.value === serviceAreaType)?.label || 'Select Service Area'}
                  </Text>
                  <ChevronDown size={20} color="#94A3B8" />
                </TouchableOpacity>

                {(serviceAreaType === 'local' || serviceAreaType === 'regional') && (
                  <>
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => setShowStatesModal(true)}
                    >
                      <Text style={styles.dropdownText}>
                        {selectedStates.length > 0
                          ? `${selectedStates.length} state${selectedStates.length > 1 ? 's' : ''} selected`
                          : 'Select States'}
                      </Text>
                      <ChevronDown size={20} color="#94A3B8" />
                    </TouchableOpacity>
                    {selectedStates.length > 0 && (
                      <>
                        <Text style={styles.sectionLabel}>Selected States & Counties</Text>
                        <View style={styles.statesCountiesContainer}>
                          {selectedStates.map((stateCode) => {
                            const state = US_STATES.find(s => s.code === stateCode);
                            const counties = serviceCounties[stateCode] || [];
                            return (
                              <View key={stateCode} style={styles.stateCountyCard}>
                                <View style={styles.stateCardHeader}>
                                  <Text style={styles.stateCardTitle}>{state?.name}</Text>
                                  <TouchableOpacity
                                    onPress={() => {
                                      setSelectedStates(selectedStates.filter(s => s !== stateCode));
                                      const newCounties = { ...serviceCounties };
                                      delete newCounties[stateCode];
                                      setServiceCounties(newCounties);
                                    }}
                                  >
                                    <X size={16} color="#94A3B8" />
                                  </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                  style={styles.manageCountiesButton}
                                  onPress={() => {
                                    setSelectedStateForCounties(stateCode);
                                    setShowCountiesModal(true);
                                  }}
                                >
                                  <MapPin size={14} color="#60A5FA" />
                                  <Text style={styles.manageCountiesText}>
                                    {counties.length > 0
                                      ? `${counties.length} ${counties.length === 1 ? 'county' : 'counties'} selected`
                                      : 'Entire state (Add specific counties)'}
                                  </Text>
                                </TouchableOpacity>
                                {counties.length > 0 && (
                                  <View style={styles.countyChipsContainer}>
                                    {counties.slice(0, 3).map((county) => (
                                      <View key={county} style={styles.countyChip}>
                                        <Text style={styles.countyChipText}>{county}</Text>
                                      </View>
                                    ))}
                                    {counties.length > 3 && (
                                      <Text style={styles.moreCountiesText}>+{counties.length - 3} more</Text>
                                    )}
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </>
                    )}
                    <Text style={styles.helpText}>
                      Select states and optionally specify counties within each state
                    </Text>
                  </>
                )}
              </>
            )}

            {userType === 'affiliate' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Referral Code (optional)"
                  value={recruiterCode}
                  onChangeText={(text) => setRecruiterCode(text.toUpperCase())}
                  placeholderTextColor="#64748B"
                  autoCapitalize="characters"
                  maxLength={8}
                />
                <Text style={styles.helpText}>
                  Have a referral code from another affiliate? Enter it here!
                </Text>
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#64748B"
            />

            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#64748B"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Sign Up'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={styles.link}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

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
                    businessCategory === category.value && styles.categoryItemActive
                  ]}
                  onPress={() => {
                    setBusinessCategory(category.value);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryItemText,
                      businessCategory === category.value && styles.categoryItemTextActive
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

      <Modal visible={showServiceAreaModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Service Area</Text>
              <TouchableOpacity onPress={() => setShowServiceAreaModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {SERVICE_AREA_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.categoryItem,
                    serviceAreaType === type.value && styles.categoryItemActive
                  ]}
                  onPress={() => {
                    setServiceAreaType(type.value);
                    setShowServiceAreaModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryItemText,
                      serviceAreaType === type.value && styles.categoryItemTextActive
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showStatesModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select States</Text>
              <TouchableOpacity onPress={() => setShowStatesModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {US_STATES.map(state => {
                const isSelected = selectedStates.includes(state.code);
                return (
                  <TouchableOpacity
                    key={state.code}
                    style={[
                      styles.categoryItem,
                      isSelected && styles.categoryItemActive
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedStates(selectedStates.filter(s => s !== state.code));
                        const newCounties = { ...serviceCounties };
                        delete newCounties[state.code];
                        setServiceCounties(newCounties);
                      } else {
                        setSelectedStates([...selectedStates, state.code]);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryItemText,
                        isSelected && styles.categoryItemTextActive
                      ]}
                    >
                      {state.name}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkmark} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowStatesModal(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCountiesModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select Counties - {selectedStateForCounties && US_STATES.find(s => s.code === selectedStateForCounties)?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowCountiesModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Leave empty to serve the entire state
            </Text>
            <ScrollView style={styles.modalList}>
              {selectedStateForCounties && US_COUNTIES[selectedStateForCounties]?.map(county => {
                const isSelected = serviceCounties[selectedStateForCounties]?.includes(county);
                return (
                  <TouchableOpacity
                    key={county}
                    style={[
                      styles.categoryItem,
                      isSelected && styles.categoryItemActive
                    ]}
                    onPress={() => {
                      const currentCounties = serviceCounties[selectedStateForCounties] || [];
                      if (isSelected) {
                        setServiceCounties({
                          ...serviceCounties,
                          [selectedStateForCounties]: currentCounties.filter(c => c !== county)
                        });
                      } else {
                        setServiceCounties({
                          ...serviceCounties,
                          [selectedStateForCounties]: [...currentCounties, county]
                        });
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryItemText,
                        isSelected && styles.categoryItemTextActive
                      ]}
                    >
                      {county}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkmark} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowCountiesModal(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  typeButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#0F172A',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  typeButtonTextActive: {
    color: '#60A5FA',
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: '#60A5FA',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  helpText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -8,
    fontStyle: 'italic',
  },
  error: {
    color: '#FEE2E2',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#1E293B',
  },
  dropdownText: {
    fontSize: 16,
    color: '#FFFFFF',
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
    maxHeight: '70%',
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
    fontSize: 18,
    fontWeight: '700',
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
  logoUpload: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
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
  logoPreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  logoChangeText: {
    fontSize: 14,
    color: '#60A5FA',
    fontWeight: '500',
  },
  selectedStatesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  stateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stateChipText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#60A5FA',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  doneButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 8,
  },
  statesCountiesContainer: {
    gap: 12,
  },
  stateCountyCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stateCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  manageCountiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  manageCountiesText: {
    fontSize: 13,
    color: '#60A5FA',
    fontWeight: '500',
  },
  countyChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  countyChip: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  countyChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  moreCountiesText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
});

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, Modal } from 'react-native';
import { ChevronDown, Upload, FileText, AlertCircle, X } from 'lucide-react-native';
import * as DocumentPicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

const BUSINESS_ENTITY_TYPES = [
  { value: 'individual_sole_proprietor', label: 'Individual/Sole Proprietor' },
  { value: 'c_corporation', label: 'C Corporation' },
  { value: 's_corporation', label: 'S Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'trust_estate', label: 'Trust/Estate' },
  { value: 'llc_c', label: 'LLC (taxed as C Corp)' },
  { value: 'llc_s', label: 'LLC (taxed as S Corp)' },
  { value: 'llc_p', label: 'LLC (taxed as Partnership)' },
  { value: 'other', label: 'Other' },
];

const TAX_ID_TYPES = [
  { value: 'ssn', label: 'Social Security Number (SSN)' },
  { value: 'ein', label: 'Employer Identification Number (EIN)' },
  { value: 'itin', label: 'Individual Taxpayer Identification Number (ITIN)' },
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

type W9FormProps = {
  onComplete: () => void;
  userId: string;
};

export default function W9Form({ onComplete, userId }: W9FormProps) {
  const [legalName, setLegalName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessEntityType, setBusinessEntityType] = useState('individual_sole_proprietor');
  const [taxIdType, setTaxIdType] = useState('ssn');
  const [taxId, setTaxId] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [exemptPayeeCode, setExemptPayeeCode] = useState('');
  const [fatcaExemption, setFatcaExemption] = useState('');
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEntityTypeModal, setShowEntityTypeModal] = useState(false);
  const [showTaxIdTypeModal, setShowTaxIdTypeModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);

  const formatTaxId = (value: string, type: string) => {
    const numbers = value.replace(/\D/g, '');

    if (type === 'ssn') {
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 9)}`;
    } else if (type === 'ein') {
      if (numbers.length <= 2) return numbers;
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 9)}`;
    } else {
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 9)}`;
    }
  };

  const validateForm = () => {
    if (!legalName.trim()) {
      Alert.alert('Error', 'Please enter your legal name');
      return false;
    }

    const numbers = taxId.replace(/\D/g, '');
    if (taxIdType === 'ssn' && numbers.length !== 9) {
      Alert.alert('Error', 'Please enter a valid 9-digit SSN');
      return false;
    }
    if (taxIdType === 'ein' && numbers.length !== 9) {
      Alert.alert('Error', 'Please enter a valid 9-digit EIN');
      return false;
    }
    if (taxIdType === 'itin' && numbers.length !== 9) {
      Alert.alert('Error', 'Please enter a valid 9-digit ITIN');
      return false;
    }

    if (!addressLine1.trim()) {
      Alert.alert('Error', 'Please enter your street address');
      return false;
    }

    if (!city.trim()) {
      Alert.alert('Error', 'Please enter your city');
      return false;
    }

    if (!state) {
      Alert.alert('Error', 'Please select your state');
      return false;
    }

    if (!zip.trim() || zip.length < 5) {
      Alert.alert('Error', 'Please enter a valid ZIP code');
      return false;
    }

    if (!signatureConfirmed) {
      Alert.alert('Error', 'You must confirm the certification statement under penalty of perjury');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const numbers = taxId.replace(/\D/g, '');
      const last4 = numbers.slice(-4);

      const { error } = await supabase
        .from('profiles')
        .update({
          w9_completed: true,
          w9_submitted_at: new Date().toISOString(),
          w9_legal_name: legalName.trim(),
          w9_business_name: businessName.trim() || null,
          tax_id_type: taxIdType,
          tax_id_last4: last4,
          business_entity_type: businessEntityType,
          w9_address_line1: addressLine1.trim(),
          w9_address_line2: addressLine2.trim() || null,
          w9_city: city.trim(),
          w9_state: state,
          w9_zip: zip.trim(),
          w9_exempt_payee_code: exemptPayeeCode.trim() || null,
          w9_fatca_exemption: fatcaExemption.trim() || null,
          w9_signature_confirmation: signatureConfirmed,
        })
        .eq('id', userId);

      if (error) throw error;

      await supabase.rpc('log_w9_access', {
        p_profile_id: userId,
        p_action: 'submitted',
      });

      Alert.alert('Success', 'W-9 information submitted successfully!');
      onComplete();
    } catch (error) {
      console.error('Error submitting W-9:', error);
      Alert.alert('Error', 'Failed to submit W-9 information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <FileText size={32} color="#60A5FA" />
        <Text style={styles.title}>W-9 Tax Information</Text>
        <Text style={styles.subtitle}>
          Required by the IRS for affiliates earning $600 or more per year
        </Text>
      </View>

      <View style={styles.warningBox}>
        <AlertCircle size={20} color="#F59E0B" />
        <Text style={styles.warningText}>
          All information must be accurate. False statements may subject you to penalties.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <Text style={styles.label}>Legal Name (as shown on tax return) *</Text>
        <TextInput
          style={styles.input}
          value={legalName}
          onChangeText={setLegalName}
          placeholder="John Doe"
          placeholderTextColor="#64748B"
        />

        <Text style={styles.label}>Business Name (if different)</Text>
        <TextInput
          style={styles.input}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="ABC Consulting LLC"
          placeholderTextColor="#64748B"
        />

        <Text style={styles.label}>Business Entity Type *</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowEntityTypeModal(true)}
        >
          <Text style={styles.dropdownText}>
            {BUSINESS_ENTITY_TYPES.find(t => t.value === businessEntityType)?.label}
          </Text>
          <ChevronDown size={20} color="#94A3B8" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Tax Identification</Text>

        <Text style={styles.label}>Tax ID Type *</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowTaxIdTypeModal(true)}
        >
          <Text style={styles.dropdownText}>
            {TAX_ID_TYPES.find(t => t.value === taxIdType)?.label}
          </Text>
          <ChevronDown size={20} color="#94A3B8" />
        </TouchableOpacity>

        <Text style={styles.label}>
          {taxIdType === 'ssn' ? 'Social Security Number' :
           taxIdType === 'ein' ? 'Employer Identification Number' :
           'Individual Taxpayer Identification Number'} *
        </Text>
        <TextInput
          style={styles.input}
          value={taxId}
          onChangeText={(value) => setTaxId(formatTaxId(value, taxIdType))}
          placeholder={taxIdType === 'ssn' ? '123-45-6789' : '12-3456789'}
          placeholderTextColor="#64748B"
          keyboardType="number-pad"
          maxLength={taxIdType === 'ein' ? 10 : 11}
          secureTextEntry
        />

        <Text style={styles.sectionTitle}>Address</Text>

        <Text style={styles.label}>Street Address *</Text>
        <TextInput
          style={styles.input}
          value={addressLine1}
          onChangeText={setAddressLine1}
          placeholder="123 Main Street"
          placeholderTextColor="#64748B"
        />

        <Text style={styles.label}>Apartment, Suite, etc.</Text>
        <TextInput
          style={styles.input}
          value={addressLine2}
          onChangeText={setAddressLine2}
          placeholder="Apt 4B"
          placeholderTextColor="#64748B"
        />

        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="New York"
          placeholderTextColor="#64748B"
        />

        <Text style={styles.label}>State *</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowStateModal(true)}
        >
          <Text style={styles.dropdownText}>
            {state ? US_STATES.find(s => s.code === state)?.name : 'Select State'}
          </Text>
          <ChevronDown size={20} color="#94A3B8" />
        </TouchableOpacity>

        <Text style={styles.label}>ZIP Code *</Text>
        <TextInput
          style={styles.input}
          value={zip}
          onChangeText={setZip}
          placeholder="10001"
          placeholderTextColor="#64748B"
          keyboardType="number-pad"
          maxLength={10}
        />

        <Text style={styles.sectionTitle}>Exemptions (if applicable)</Text>

        <Text style={styles.label}>Exempt Payee Code</Text>
        <TextInput
          style={styles.input}
          value={exemptPayeeCode}
          onChangeText={setExemptPayeeCode}
          placeholder="Leave blank if not exempt"
          placeholderTextColor="#64748B"
        />

        <Text style={styles.label}>FATCA Exemption Code</Text>
        <TextInput
          style={styles.input}
          value={fatcaExemption}
          onChangeText={setFatcaExemption}
          placeholder="Leave blank if not exempt"
          placeholderTextColor="#64748B"
        />

        <Text style={styles.sectionTitle}>Certification</Text>

        <View style={styles.certificationBox}>
          <Text style={styles.certificationText}>
            Under penalties of perjury, I certify that:
            {'\n\n'}
            1. The number shown on this form is my correct taxpayer identification number, and
            {'\n\n'}
            2. I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I have not been notified by the IRS that I am subject to backup withholding, or (c) the IRS has notified me that I am no longer subject to backup withholding, and
            {'\n\n'}
            3. I am a U.S. citizen or other U.S. person, and
            {'\n\n'}
            4. The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setSignatureConfirmed(!signatureConfirmed)}
        >
          <View style={[styles.checkbox, signatureConfirmed && styles.checkboxChecked]}>
            {signatureConfirmed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            I certify that all information provided is true and correct under penalty of perjury *
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit W-9 Information'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showEntityTypeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Business Entity Type</Text>
              <TouchableOpacity onPress={() => setShowEntityTypeModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {BUSINESS_ENTITY_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.modalItem,
                    businessEntityType === type.value && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setBusinessEntityType(type.value);
                    setShowEntityTypeModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      businessEntityType === type.value && styles.modalItemTextActive,
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

      <Modal visible={showTaxIdTypeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Tax ID Type</Text>
              <TouchableOpacity onPress={() => setShowTaxIdTypeModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {TAX_ID_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.modalItem,
                    taxIdType === type.value && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setTaxIdType(type.value);
                    setTaxId('');
                    setShowTaxIdTypeModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      taxIdType === type.value && styles.modalItemTextActive,
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

      <Modal visible={showStateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStateModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {US_STATES.map((stateItem) => (
                <TouchableOpacity
                  key={stateItem.code}
                  style={[
                    styles.modalItem,
                    state === stateItem.code && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setState(stateItem.code);
                    setShowStateModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      state === stateItem.code && styles.modalItemTextActive,
                    ]}
                  >
                    {stateItem.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#FCD34D',
    lineHeight: 18,
  },
  form: {
    padding: 24,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
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
  certificationBox: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
  },
  certificationText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  modalItem: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
  },
  modalItemText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  modalItemTextActive: {
    color: '#60A5FA',
    fontWeight: '600',
  },
});
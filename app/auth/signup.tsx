import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';

const CATEGORIES = [
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'saas', label: 'SaaS' },
  { value: 'digital_products', label: 'Digital Products' },
  { value: 'services', label: 'Services' },
  { value: 'education', label: 'Education' },
  { value: 'health', label: 'Health' },
  { value: 'finance', label: 'Finance' },
  { value: 'other', label: 'Other' },
];

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('other');
  const [userType, setUserType] = useState<'company' | 'affiliate'>('affiliate');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

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

    const { error: signUpError } = await signUp(email, password, fullName, userType, companyName, businessCategory);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      router.replace('/(tabs)');
    }
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

                <Text style={styles.label}>Business Category</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map(category => (
                    <TouchableOpacity
                      key={category.value}
                      style={[
                        styles.categoryOption,
                        businessCategory === category.value && styles.categoryOptionActive,
                      ]}
                      onPress={() => setBusinessCategory(category.value)}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          businessCategory === category.value && styles.categoryOptionTextActive,
                        ]}
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
  error: {
    color: '#FEE2E2',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
  },
  categoryOptionActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#0F172A',
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
  categoryOptionTextActive: {
    color: '#60A5FA',
  },
});

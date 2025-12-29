import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Webhook, Shield, Tag, Save, ArrowLeft, Zap, CheckCircle, XCircle } from 'lucide-react-native';

export default function WebhookSettings() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [leadSourceTag, setLeadSourceTag] = useState('connect more');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; status?: number } | null>(null);

  useEffect(() => {
    if (profile?.user_type !== 'company') {
      router.replace('/');
      return;
    }
    loadWebhookSettings();
  }, [profile]);

  async function loadWebhookSettings() {
    if (!profile?.company_id) return;

    const { data, error } = await supabase
      .from('companies')
      .select('webhook_url, webhook_secret, webhook_enabled, lead_source_tag')
      .eq('id', profile.company_id)
      .maybeSingle();

    if (data) {
      setWebhookUrl(data.webhook_url || '');
      setWebhookSecret(data.webhook_secret || '');
      setWebhookEnabled(data.webhook_enabled || false);
      setLeadSourceTag(data.lead_source_tag || 'connect more');
    }
  }

  async function saveWebhookSettings() {
    console.log('SAVE FUNCTION CALLED');
    alert('Save function called!');

    if (!profile?.company_id) {
      Alert.alert('Error', 'No company ID found');
      return;
    }

    if (webhookEnabled && !webhookUrl) {
      Alert.alert('Error', 'Please provide a webhook URL');
      return;
    }

    if (webhookUrl && !webhookUrl.startsWith('http')) {
      Alert.alert('Error', 'Webhook URL must start with http:// or https://');
      return;
    }

    setLoading(true);

    try {
      console.log('Saving webhook settings for company:', profile.company_id);
      console.log('Data:', {
        webhook_url: webhookUrl || null,
        webhook_secret: webhookSecret || null,
        webhook_enabled: webhookEnabled,
        lead_source_tag: leadSourceTag || 'connect more',
      });

      const { data, error } = await supabase
        .from('companies')
        .update({
          webhook_url: webhookUrl || null,
          webhook_secret: webhookSecret || null,
          webhook_enabled: webhookEnabled,
          lead_source_tag: leadSourceTag || 'connect more',
        })
        .eq('id', profile.company_id)
        .select();

      console.log('Update result:', { data, error });

      setLoading(false);

      if (error) {
        console.error('Save error:', error);
        Alert.alert('Error', error.message);
      } else if (!data || data.length === 0) {
        Alert.alert('Error', 'No rows were updated. You may not have permission to update this company.');
      } else {
        Alert.alert('Success', 'Webhook settings saved successfully');
      }
    } catch (err: any) {
      console.error('Exception during save:', err);
      setLoading(false);
      Alert.alert('Error', err.message || 'An unexpected error occurred');
    }
  }

  function generateSecret() {
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setWebhookSecret(secret);
  }

  async function testWebhook() {
    if (!webhookUrl) {
      Alert.alert('Error', 'Please enter a webhook URL first');
      return;
    }

    if (!webhookUrl.startsWith('http')) {
      Alert.alert('Error', 'Webhook URL must start with http:// or https://');
      return;
    }

    setTesting(true);
    setTestResult(null);

    const samplePayload = {
      lead_id: "test-" + Date.now(),
      product_name: "Sample Product",
      affiliate_name: "Test Affiliate",
      contact_name: "John Doe",
      email: "john.doe@example.com",
      phone: "+1234567890",
      company: "Acme Corp",
      message: "This is a test webhook from Connect More",
      contract_value: 5000,
      contract_length_months: 12,
      source_tag: leadSourceTag,
      submitted_at: new Date().toISOString(),
      is_test: true
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (webhookSecret) {
        headers['X-Webhook-Secret'] = webhookSecret;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(samplePayload),
      });

      const responseText = await response.text();

      if (response.ok) {
        setTestResult({
          success: true,
          message: `Success! Your webhook responded with status ${response.status}`,
          status: response.status
        });
      } else {
        setTestResult({
          success: false,
          message: `Failed with status ${response.status}: ${responseText.substring(0, 200)}`,
          status: response.status
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: `Connection failed: ${error.message || 'Unable to reach webhook URL'}`
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        <View style={styles.header}>
          <Webhook size={32} color="#60A5FA" />
          <Text style={styles.title}>Webhook Settings</Text>
          <Text style={styles.subtitle}>
            Automatically send leads to your CRM when affiliates submit them
          </Text>
        </View>

      <View style={styles.section}>
        <View style={styles.switchContainer}>
          <View style={styles.switchLabel}>
            <Text style={styles.label}>Enable Webhooks</Text>
            <Text style={styles.hint}>Send leads to your CRM automatically</Text>
          </View>
          <Switch
            value={webhookEnabled}
            onValueChange={setWebhookEnabled}
            trackColor={{ false: '#334155', true: '#60A5FA' }}
            thumbColor={webhookEnabled ? '#3B82F6' : '#94A3B8'}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Webhook URL</Text>
          <Text style={styles.hint}>Your CRM endpoint that will receive lead data</Text>
          <TextInput
            style={styles.input}
            value={webhookUrl}
            onChangeText={(text) => {
              setWebhookUrl(text);
              setTestResult(null);
            }}
            placeholder="https://your-crm.com/api/leads"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.testButton, testing && styles.testButtonDisabled]}
            onPress={testWebhook}
            disabled={testing || !webhookUrl}
          >
            {testing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Zap size={18} color="#FFFFFF" />
            )}
            <Text style={styles.testButtonText}>
              {testing ? 'Testing...' : 'Test Webhook'}
            </Text>
          </TouchableOpacity>

          {testResult && (
            <View style={[
              styles.testResult,
              testResult.success ? styles.testResultSuccess : styles.testResultError
            ]}>
              <View style={styles.testResultIcon}>
                {testResult.success ? (
                  <CheckCircle size={20} color="#10B981" />
                ) : (
                  <XCircle size={20} color="#EF4444" />
                )}
              </View>
              <View style={styles.testResultContent}>
                <Text style={[
                  styles.testResultTitle,
                  testResult.success ? styles.testResultTitleSuccess : styles.testResultTitleError
                ]}>
                  {testResult.success ? 'Test Successful' : 'Test Failed'}
                </Text>
                <Text style={styles.testResultMessage}>{testResult.message}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Shield size={16} color="#94A3B8" />
            <Text style={styles.label}>Webhook Secret (Optional)</Text>
          </View>
          <Text style={styles.hint}>
            Used to verify webhook authenticity. Will be sent in X-Webhook-Secret header.
          </Text>
          <View style={styles.secretContainer}>
            <TextInput
              style={[styles.input, styles.secretInput]}
              value={webhookSecret}
              onChangeText={setWebhookSecret}
              placeholder="Optional secret key"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateSecret}
            >
              <Text style={styles.generateButtonText}>Generate</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Tag size={16} color="#94A3B8" />
            <Text style={styles.label}>Lead Source Tag</Text>
          </View>
          <Text style={styles.hint}>Tag to identify leads from this platform</Text>
          <TextInput
            style={styles.input}
            value={leadSourceTag}
            onChangeText={setLeadSourceTag}
            placeholder="connect more"
            placeholderTextColor="#64748B"
          />
        </View>
      </View>

      <View style={styles.webhookInfo}>
        <Text style={styles.infoTitle}>Webhook Payload Format</Text>
        <Text style={styles.infoText}>When a lead is submitted, we'll send a POST request with:</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>{`{
  "lead_id": "uuid",
  "product_name": "string",
  "affiliate_name": "string",
  "contact_name": "string",
  "email": "string",
  "phone": "string",
  "company": "string",
  "message": "string",
  "contract_value": number,
  "contract_length_months": number,
  "source_tag": "${leadSourceTag}",
  "submitted_at": "timestamp",
  "is_test": false
}`}</Text>
        </View>
        <Text style={styles.infoText}>
          Headers will include: Content-Type: application/json
          {webhookSecret && '\nX-Webhook-Secret: [your secret]'}
          {'\n\nNote: Test webhooks will have "is_test": true'}
        </Text>
      </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={saveWebhookSettings}
          disabled={loading}
        >
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Webhook Settings'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    padding: 24,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  secretContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  secretInput: {
    flex: 1,
  },
  generateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  webhookInfo: {
    margin: 24,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 12,
  },
  codeBlock: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  code: {
    fontSize: 11,
    color: '#60A5FA',
    fontFamily: 'monospace',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    margin: 24,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  testButtonDisabled: {
    opacity: 0.5,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  testResult: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
  },
  testResultSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  testResultError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#EF4444',
  },
  testResultIcon: {
    paddingTop: 2,
  },
  testResultContent: {
    flex: 1,
  },
  testResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  testResultTitleSuccess: {
    color: '#10B981',
  },
  testResultTitleError: {
    color: '#EF4444',
  },
  testResultMessage: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
});

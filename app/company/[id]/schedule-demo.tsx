import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Platform, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Calendar, Clock, User, Mail, Phone, FileText } from 'lucide-react-native';
import BackButton from '@/components/BackButton';

export default function ScheduleDemoScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');
  const [durationOptions, setDurationOptions] = useState([30, 60]);

  useEffect(() => {
    fetchCompanyDetails();
  }, [id]);

  const fetchCompanyDetails = async () => {
    try {
      const { data } = await supabase
        .from('companies')
        .select('*, profiles!inner(demo_scheduling_enabled, demo_duration_options)')
        .eq('id', id)
        .single();

      if (data) {
        setCompany(data);
        if (data.profiles?.demo_duration_options) {
          setDurationOptions(data.profiles.demo_duration_options);
          setDuration(data.profiles.demo_duration_options[0] || 30);
        }
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    }
  };

  const handleSchedule = async () => {
    if (!customerName || !customerEmail || !selectedDate || !selectedTime) {
      const message = 'Please fill in all required fields';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
      return;
    }

    try {
      setLoading(true);

      const scheduledTime = new Date(`${selectedDate}T${selectedTime}:00`);

      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/schedule-demo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyId: id,
            customerName,
            customerEmail,
            customerPhone,
            scheduledTime: scheduledTime.toISOString(),
            durationMinutes: duration,
            notes,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to schedule demo');
      }

      const message = 'Demo scheduled successfully! The company will receive a notification.';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Success', message);
      }

      router.back();
    } catch (error: any) {
      console.error('Error scheduling demo:', error);
      const message = error.message || 'Failed to schedule demo';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!company) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton style={styles.backButton} />
        <Text style={styles.headerTitle}>Schedule Demo</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{company.company_name}</Text>
          <Text style={styles.companyDescription}>
            Schedule a demo with {company.company_name}. They will receive a notification and the event will be added to their calendar.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <User size={16} color="#60A5FA" />
              <Text style={styles.label}>Your Name *</Text>
            </View>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="John Doe"
              placeholderTextColor="#64748B"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Mail size={16} color="#60A5FA" />
              <Text style={styles.label}>Your Email *</Text>
            </View>
            <TextInput
              style={styles.input}
              value={customerEmail}
              onChangeText={setCustomerEmail}
              placeholder="john@example.com"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Phone size={16} color="#60A5FA" />
              <Text style={styles.label}>Your Phone</Text>
            </View>
            <TextInput
              style={styles.input}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="(555) 123-4567"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Calendar size={16} color="#60A5FA" />
              <Text style={styles.label}>Date *</Text>
            </View>
            <TextInput
              style={styles.input}
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#64748B"
            />
            <Text style={styles.hint}>Format: YYYY-MM-DD (e.g., 2024-12-25)</Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Clock size={16} color="#60A5FA" />
              <Text style={styles.label}>Time *</Text>
            </View>
            <TextInput
              style={styles.input}
              value={selectedTime}
              onChangeText={setSelectedTime}
              placeholder="HH:MM"
              placeholderTextColor="#64748B"
            />
            <Text style={styles.hint}>Format: HH:MM in 24-hour format (e.g., 14:30 for 2:30 PM)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Duration</Text>
            <View style={styles.durationOptions}>
              {durationOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.durationOption,
                    duration === option && styles.durationOptionActive
                  ]}
                  onPress={() => setDuration(option)}
                >
                  <Text style={[
                    styles.durationText,
                    duration === option && styles.durationTextActive
                  ]}>
                    {option} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <FileText size={16} color="#60A5FA" />
              <Text style={styles.label}>Notes (Optional)</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any specific topics you'd like to discuss..."
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.scheduleButton, loading && styles.scheduleButtonDisabled]}
            onPress={handleSchedule}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.scheduleButtonText}>Schedule Demo</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  companyInfo: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  companyName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  companyDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E2E8F0',
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -4,
  },
  durationOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  durationOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  durationOptionActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  durationTextActive: {
    color: '#FFFFFF',
  },
  scheduleButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  scheduleButtonDisabled: {
    opacity: 0.6,
  },
  scheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

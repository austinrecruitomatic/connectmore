import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Calendar, Clock, User, Mail, Phone, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import BackButton from '@/components/BackButton';

type Appointment = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  scheduled_time: string;
  duration_minutes: number;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  google_calendar_event_id?: string;
  created_at: string;
};

export default function DemoAppointmentsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [demoSchedulingEnabled, setDemoSchedulingEnabled] = useState(false);

  useEffect(() => {
    fetchAppointments();
    fetchGoogleStatus();
  }, []);

  const fetchGoogleStatus = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('google_calendar_connected, demo_scheduling_enabled')
        .eq('id', profile?.id)
        .single();

      if (data) {
        setGoogleConnected(data.google_calendar_connected || false);
        setDemoSchedulingEnabled(data.demo_scheduling_enabled || false);
      }
    } catch (error) {
      console.error('Error fetching Google status:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', profile?.id)
        .single();

      if (!companyData) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('demo_appointments')
        .select('*')
        .eq('company_id', companyData.id)
        .order('scheduled_time', { ascending: true });

      if (data) {
        setAppointments(data);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setConnecting(true);

      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/google-calendar-connect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'get-auth-url' }),
        }
      );

      const result = await response.json();

      if (result.authUrl) {
        const message = 'Opening Google authentication in browser. After authorizing, come back to complete the connection.';
        if (Platform.OS === 'web') {
          window.open(result.authUrl, '_blank');
          alert(message);
        } else {
          Alert.alert('Connect Google Calendar', message);
        }
      }
    } catch (error: any) {
      console.error('Error connecting Google:', error);
      const message = error.message || 'Failed to connect Google Calendar';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleToggleDemoScheduling = async () => {
    try {
      const newValue = !demoSchedulingEnabled;

      const { error } = await supabase
        .from('profiles')
        .update({ demo_scheduling_enabled: newValue })
        .eq('id', profile?.id);

      if (error) throw error;

      setDemoSchedulingEnabled(newValue);

      const message = newValue
        ? 'Demo scheduling enabled! Affiliates can now schedule demos with you.'
        : 'Demo scheduling disabled.';

      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Success', message);
      }
    } catch (error: any) {
      console.error('Error toggling demo scheduling:', error);
      const message = error.message || 'Failed to update setting';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('demo_appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      fetchAppointments();

      const message = 'Appointment status updated';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Success', message);
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      const message = error.message || 'Failed to update status';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock size={16} color="#60A5FA" />;
      case 'completed':
        return <CheckCircle size={16} color="#10B981" />;
      case 'cancelled':
        return <XCircle size={16} color="#EF4444" />;
      case 'no_show':
        return <AlertCircle size={16} color="#F59E0B" />;
      default:
        return <Clock size={16} color="#60A5FA" />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton style={styles.backButton} />
        <Text style={styles.headerTitle}>Demo Appointments</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Google Calendar Integration</Text>
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <Text style={styles.label}>Status:</Text>
              <Text style={[styles.status, googleConnected && styles.statusConnected]}>
                {googleConnected ? 'Connected' : 'Not Connected'}
              </Text>
            </View>
            {!googleConnected && (
              <TouchableOpacity
                style={styles.connectButton}
                onPress={handleConnectGoogle}
                disabled={connecting}
              >
                {connecting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.connectButtonText}>Connect Google Calendar</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demo Scheduling</Text>
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <Text style={styles.label}>Allow affiliates to schedule demos:</Text>
              <TouchableOpacity
                style={[styles.toggle, demoSchedulingEnabled && styles.toggleActive]}
                onPress={handleToggleDemoScheduling}
              >
                <View style={[styles.toggleThumb, demoSchedulingEnabled && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              When enabled, affiliates can schedule demo appointments with you directly from your company page.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#3B82F6" />
          ) : appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={48} color="#64748B" />
              <Text style={styles.emptyText}>No appointments scheduled</Text>
            </View>
          ) : (
            appointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentTitleRow}>
                    <User size={16} color="#60A5FA" />
                    <Text style={styles.appointmentName}>{appointment.customer_name}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    {getStatusIcon(appointment.status)}
                    <Text style={styles.statusText}>{appointment.status}</Text>
                  </View>
                </View>

                <View style={styles.appointmentDetails}>
                  <View style={styles.detailRow}>
                    <Calendar size={14} color="#94A3B8" />
                    <Text style={styles.detailText}>{formatDateTime(appointment.scheduled_time)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Clock size={14} color="#94A3B8" />
                    <Text style={styles.detailText}>{appointment.duration_minutes} minutes</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Mail size={14} color="#94A3B8" />
                    <Text style={styles.detailText}>{appointment.customer_email}</Text>
                  </View>
                  {appointment.customer_phone && (
                    <View style={styles.detailRow}>
                      <Phone size={14} color="#94A3B8" />
                      <Text style={styles.detailText}>{appointment.customer_phone}</Text>
                    </View>
                  )}
                </View>

                {appointment.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{appointment.notes}</Text>
                  </View>
                )}

                {appointment.status === 'scheduled' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => handleUpdateStatus(appointment.id, 'completed')}
                    >
                      <Text style={styles.actionButtonText}>Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handleUpdateStatus(appointment.id, 'cancelled')}
                    >
                      <Text style={styles.actionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    color: '#E2E8F0',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  statusConnected: {
    color: '#10B981',
  },
  connectButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#3B82F6',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    marginLeft: 20,
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
  },
  appointmentCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appointmentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appointmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#0F172A',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    textTransform: 'capitalize',
  },
  appointmentDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  notesContainer: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  notesText: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

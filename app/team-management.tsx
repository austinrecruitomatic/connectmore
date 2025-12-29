import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Users, Trash2, Edit, X } from 'lucide-react-native';

type TeamMember = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'member';
  can_manage_leads: boolean;
  can_manage_deals: boolean;
  can_manage_appointments: boolean;
  status: 'pending' | 'active' | 'inactive';
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
};

export default function TeamManagementScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [calendarMode, setCalendarMode] = useState<'shared' | 'individual'>('shared');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');
  const [canManageLeads, setCanManageLeads] = useState(true);
  const [canManageDeals, setCanManageDeals] = useState(true);
  const [canManageAppointments, setCanManageAppointments] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    if (!profile?.id) return;

    try {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, calendar_mode')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!companyData) {
        Alert.alert('Error', 'Company not found');
        router.back();
        return;
      }

      setCompanyId(companyData.id);
      setCalendarMode(companyData.calendar_mode || 'shared');

      const { data: members, error } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          first_name,
          last_name,
          email,
          phone,
          role,
          can_manage_leads,
          can_manage_deals,
          can_manage_appointments,
          status,
          created_at,
          profiles (
            full_name,
            email
          )
        `)
        .eq('company_id', companyData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeamMembers(members || []);
    } catch (error) {
      console.error('Error loading team:', error);
      Alert.alert('Error', 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    setErrorMessage(null);

    if (!newMemberEmail.trim() || !companyId || !firstName.trim() || !lastName.trim()) {
      const message = 'Please fill in all required fields';
      setErrorMessage(message);
      Alert.alert('Error', message);
      return;
    }

    setSaving(true);

    try {
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', newMemberEmail.trim().toLowerCase())
        .maybeSingle();

      const { error } = await supabase
        .from('team_members')
        .insert({
          company_id: companyId,
          user_id: userData?.id || null,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: newMemberEmail.trim().toLowerCase(),
          phone: phone.trim() || null,
          role: newMemberRole,
          can_manage_leads: canManageLeads,
          can_manage_deals: canManageDeals,
          can_manage_appointments: canManageAppointments,
          invited_by: profile?.id,
          status: 'active',
        });

      if (error) {
        if (error.code === '23505') {
          const message = 'This user is already a team member';
          setErrorMessage(message);
          Alert.alert('Error', message);
        } else {
          throw error;
        }
        setSaving(false);
        return;
      }

      Alert.alert('Success', 'Team member added successfully');
      setShowAddModal(false);
      setFirstName('');
      setLastName('');
      setPhone('');
      setNewMemberEmail('');
      setNewMemberRole('member');
      setCanManageLeads(true);
      setCanManageDeals(true);
      setCanManageAppointments(true);
      setErrorMessage(null);
      loadTeamData();
    } catch (error) {
      console.error('Error adding member:', error);
      const message = 'Failed to add team member';
      setErrorMessage(message);
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMember = async () => {
    if (!selectedMember || !firstName.trim() || !lastName.trim() || !newMemberEmail.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('team_members')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: newMemberEmail.trim().toLowerCase(),
          phone: phone.trim() || null,
          role: newMemberRole,
          can_manage_leads: canManageLeads,
          can_manage_deals: canManageDeals,
          can_manage_appointments: canManageAppointments,
        })
        .eq('id', selectedMember.id);

      if (error) throw error;

      Alert.alert('Success', 'Team member updated successfully');
      setShowEditModal(false);
      setSelectedMember(null);
      setFirstName('');
      setLastName('');
      setPhone('');
      setNewMemberEmail('');
      loadTeamData();
    } catch (error) {
      console.error('Error updating member:', error);
      Alert.alert('Error', 'Failed to update team member');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    Alert.alert(
      'Remove Team Member',
      'Are you sure you want to remove this team member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('team_members')
                .delete()
                .eq('id', memberId);

              if (error) throw error;

              Alert.alert('Success', 'Team member removed');
              loadTeamData();
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', 'Failed to remove team member');
            }
          },
        },
      ]
    );
  };

  const handleUpdateCalendarMode = async (mode: 'shared' | 'individual') => {
    if (!companyId) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update({ calendar_mode: mode })
        .eq('id', companyId);

      if (error) throw error;

      setCalendarMode(mode);
      Alert.alert('Success', `Calendar mode updated to ${mode}`);
    } catch (error) {
      console.error('Error updating calendar mode:', error);
      Alert.alert('Error', 'Failed to update calendar mode');
    }
  };

  const openEditModal = (member: TeamMember) => {
    setSelectedMember(member);
    setFirstName(member.first_name || '');
    setLastName(member.last_name || '');
    setNewMemberEmail(member.email || member.profiles?.email || '');
    setPhone(member.phone || '');
    setNewMemberRole(member.role);
    setCanManageLeads(member.can_manage_leads);
    setCanManageDeals(member.can_manage_deals);
    setCanManageAppointments(member.can_manage_appointments);
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Calendar Mode</Text>
          </View>

          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.calendarModeOption, calendarMode === 'shared' && styles.calendarModeOptionActive]}
              onPress={() => handleUpdateCalendarMode('shared')}
            >
              <View style={styles.calendarModeOptionContent}>
                <Text style={[styles.calendarModeOptionTitle, calendarMode === 'shared' && styles.calendarModeOptionTitleActive]}>
                  Shared Calendar
                </Text>
                <Text style={styles.calendarModeOptionDesc}>
                  All team members share one calendar
                </Text>
              </View>
              <View style={[styles.radio, calendarMode === 'shared' && styles.radioActive]} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={[styles.calendarModeOption, calendarMode === 'individual' && styles.calendarModeOptionActive]}
              onPress={() => handleUpdateCalendarMode('individual')}
            >
              <View style={styles.calendarModeOptionContent}>
                <Text style={[styles.calendarModeOptionTitle, calendarMode === 'individual' && styles.calendarModeOptionTitleActive]}>
                  Individual Calendars
                </Text>
                <Text style={styles.calendarModeOptionDesc}>
                  Each team member has their own calendar
                </Text>
              </View>
              <View style={[styles.radio, calendarMode === 'individual' && styles.radioActive]} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Team Members ({teamMembers.length})</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {teamMembers.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberInfo}>
                <View style={styles.memberAvatar}>
                  <Users size={20} color="#60A5FA" />
                </View>
                <View style={styles.memberDetails}>
                  <Text style={styles.memberName}>
                    {member.first_name && member.last_name
                      ? `${member.first_name} ${member.last_name}`
                      : member.profiles?.full_name || 'Unknown'
                    }
                  </Text>
                  <Text style={styles.memberEmail}>
                    {member.email || member.profiles?.email || 'No email'}
                  </Text>
                  {member.phone && (
                    <Text style={styles.memberPhone}>{member.phone}</Text>
                  )}
                  <View style={styles.memberPermissions}>
                    <View style={[styles.badge, { backgroundColor: member.role === 'admin' ? '#F59E0B20' : '#3B82F620' }]}>
                      <Text style={[styles.badgeText, { color: member.role === 'admin' ? '#F59E0B' : '#3B82F6' }]}>
                        {member.role}
                      </Text>
                    </View>
                    {member.can_manage_leads && (
                      <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
                        <Text style={[styles.badgeText, { color: '#10B981' }]}>Leads</Text>
                      </View>
                    )}
                    {member.can_manage_deals && (
                      <View style={[styles.badge, { backgroundColor: '#8B5CF620' }]}>
                        <Text style={[styles.badgeText, { color: '#8B5CF6' }]}>Deals</Text>
                      </View>
                    )}
                    {member.can_manage_appointments && (
                      <View style={[styles.badge, { backgroundColor: '#F97316 20' }]}>
                        <Text style={[styles.badgeText, { color: '#F97316' }]}>Appointments</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.memberActions}>
                <TouchableOpacity style={styles.iconButton} onPress={() => openEditModal(member)}>
                  <Edit size={18} color="#60A5FA" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={() => handleRemoveMember(member.id)}>
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {teamMembers.length === 0 && (
            <View style={styles.emptyState}>
              <Users size={48} color="#334155" />
              <Text style={styles.emptyStateText}>No team members yet</Text>
              <Text style={styles.emptyStateSubtext}>Add team members to help manage your business</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Team Member</Text>
              <TouchableOpacity onPress={() => {
                setShowAddModal(false);
                setFirstName('');
                setLastName('');
                setPhone('');
                setNewMemberEmail('');
                setNewMemberRole('member');
                setCanManageLeads(true);
                setCanManageDeals(true);
                setCanManageAppointments(true);
                setErrorMessage(null);
              }}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter first name"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter last name"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={newMemberEmail}
                onChangeText={setNewMemberEmail}
                placeholder="Enter email address"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Role</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setNewMemberRole('member')}
                >
                  <View style={[styles.radio, newMemberRole === 'member' && styles.radioActive]} />
                  <View>
                    <Text style={styles.radioLabel}>Member</Text>
                    <Text style={styles.radioDesc}>Can be assigned tasks and permissions</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setNewMemberRole('admin')}
                >
                  <View style={[styles.radio, newMemberRole === 'admin' && styles.radioActive]} />
                  <View>
                    <Text style={styles.radioLabel}>Admin</Text>
                    <Text style={styles.radioDesc}>Can manage team members and all permissions</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Permissions</Text>
              <View style={styles.permissionsList}>
                <View style={styles.permissionRow}>
                  <Text style={styles.permissionLabel}>Manage Leads</Text>
                  <Switch
                    value={canManageLeads}
                    onValueChange={setCanManageLeads}
                    trackColor={{ false: '#334155', true: '#60A5FA' }}
                    thumbColor="#fff"
                  />
                </View>
                <View style={styles.permissionRow}>
                  <Text style={styles.permissionLabel}>Manage Deals</Text>
                  <Switch
                    value={canManageDeals}
                    onValueChange={setCanManageDeals}
                    trackColor={{ false: '#334155', true: '#60A5FA' }}
                    thumbColor="#fff"
                  />
                </View>
                <View style={styles.permissionRow}>
                  <Text style={styles.permissionLabel}>Manage Appointments</Text>
                  <Switch
                    value={canManageAppointments}
                    onValueChange={setCanManageAppointments}
                    trackColor={{ false: '#334155', true: '#60A5FA' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setFirstName('');
                  setLastName('');
                  setPhone('');
                  setNewMemberEmail('');
                  setNewMemberRole('member');
                  setCanManageLeads(true);
                  setCanManageDeals(true);
                  setCanManageAppointments(true);
                  setErrorMessage(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleAddMember}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>{saving ? 'Adding...' : 'Add Member'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Team Member</Text>
              <TouchableOpacity onPress={() => {
                setShowEditModal(false);
                setSelectedMember(null);
                setFirstName('');
                setLastName('');
                setNewMemberEmail('');
                setPhone('');
              }}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter first name"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter last name"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={newMemberEmail}
                onChangeText={setNewMemberEmail}
                placeholder="Enter email address"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Role</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setNewMemberRole('member')}
                >
                  <View style={[styles.radio, newMemberRole === 'member' && styles.radioActive]} />
                  <View>
                    <Text style={styles.radioLabel}>Member</Text>
                    <Text style={styles.radioDesc}>Can be assigned tasks and permissions</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setNewMemberRole('admin')}
                >
                  <View style={[styles.radio, newMemberRole === 'admin' && styles.radioActive]} />
                  <View>
                    <Text style={styles.radioLabel}>Admin</Text>
                    <Text style={styles.radioDesc}>Can manage team members and all permissions</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Permissions</Text>
              <View style={styles.permissionsList}>
                <View style={styles.permissionRow}>
                  <Text style={styles.permissionLabel}>Manage Leads</Text>
                  <Switch
                    value={canManageLeads}
                    onValueChange={setCanManageLeads}
                    trackColor={{ false: '#334155', true: '#60A5FA' }}
                    thumbColor="#fff"
                  />
                </View>
                <View style={styles.permissionRow}>
                  <Text style={styles.permissionLabel}>Manage Deals</Text>
                  <Switch
                    value={canManageDeals}
                    onValueChange={setCanManageDeals}
                    trackColor={{ false: '#334155', true: '#60A5FA' }}
                    thumbColor="#fff"
                  />
                </View>
                <View style={styles.permissionRow}>
                  <Text style={styles.permissionLabel}>Manage Appointments</Text>
                  <Switch
                    value={canManageAppointments}
                    onValueChange={setCanManageAppointments}
                    trackColor={{ false: '#334155', true: '#60A5FA' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedMember(null);
                  setFirstName('');
                  setLastName('');
                  setNewMemberEmail('');
                  setPhone('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleUpdateMember}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>{saving ? 'Updating...' : 'Update'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  loadingText: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  calendarModeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  calendarModeOptionActive: {
    opacity: 1,
  },
  calendarModeOptionContent: {
    flex: 1,
  },
  calendarModeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 4,
  },
  calendarModeOptionTitleActive: {
    color: '#fff',
  },
  calendarModeOptionDesc: {
    fontSize: 13,
    color: '#64748B',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748B',
  },
  radioActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 8,
  },
  memberCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 4,
  },
  memberPhone: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
  },
  memberPermissions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#334155',
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
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  radioLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  radioDesc: {
    fontSize: 13,
    color: '#64748B',
  },
  permissionsList: {
    gap: 12,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  permissionLabel: {
    fontSize: 15,
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  errorBanner: {
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
});

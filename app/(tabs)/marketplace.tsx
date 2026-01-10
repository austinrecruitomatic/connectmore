import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Search, Star, Building2, ChevronDown, X, MapPin } from 'lucide-react-native';
import { useAuth } from '@/lib/AuthContext';
import { US_COUNTIES } from '@/lib/counties';

type Company = {
  id: string;
  company_name: string;
  description: string;
  business_category: string;
  logo_url: string;
  average_rating: number;
  total_reviews: number;
  service_area_type: string;
  service_states: string[];
  service_counties: any;
};

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'banking', label: 'Banking' },
  { value: 'business_intelligence', label: 'Business Intelligence' },
  { value: 'canvass_app', label: 'Canvass App' },
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

export default function MarketplaceScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showCountyModal, setShowCountyModal] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [activePartnershipCompanyIds, setActivePartnershipCompanyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCompanies();
    fetchUserPartnerships();
  }, []);

  useEffect(() => {
    filterCompanies();
  }, [companies, searchQuery, selectedCategory, selectedState, selectedCounty]);

  const fetchUserPartnerships = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('affiliate_partnerships')
        .select('company_id')
        .eq('affiliate_id', profile.id)
        .eq('status', 'approved');

      if (error) throw error;

      const companyIds = new Set(data?.map(p => p.company_id) || []);
      setActivePartnershipCompanyIds(companyIds);
    } catch (error) {
      console.error('Error fetching partnerships:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('average_rating', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCompanies = () => {
    let filtered = [...companies];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.business_category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.company_name.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query)
      );
    }

    if (selectedState) {
      filtered = filtered.filter(c => {
        if (c.service_area_type === 'international' || c.service_area_type === 'national') {
          return true;
        }
        if ((c.service_area_type === 'local' || c.service_area_type === 'regional') && c.service_states) {
          if (!c.service_states.includes(selectedState)) {
            return false;
          }

          if (selectedCounty && c.service_counties && c.service_counties[selectedState]) {
            const counties = c.service_counties[selectedState];
            if (counties.length === 0) {
              return true;
            }
            return counties.includes(selectedCounty);
          }

          return true;
        }
        return false;
      });
    }

    setFilteredCompanies(filtered);
  };

  const handleCompanyPress = (companyId: string) => {
    router.push(`/company/${companyId}`);
  };

  if (profile?.user_type !== 'affiliate') {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Only affiliates can access the marketplace</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace</Text>
        <Text style={styles.subtitle}>Find your next partnership</Text>

        <View style={styles.searchBar}>
          <Search size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search companies..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#64748B"
          />
        </View>

        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={styles.categoryDropdown}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={styles.categoryDropdownText}>
              {CATEGORIES.find(c => c.value === selectedCategory)?.label || 'All'}
            </Text>
            <ChevronDown size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stateFilter}
            onPress={() => setShowStateModal(true)}
          >
            <MapPin size={16} color="#64748B" />
            <Text style={styles.stateFilterText}>
              {selectedState ? US_STATES.find(s => s.code === selectedState)?.code : 'State'}
            </Text>
            {selectedState ? (
              <TouchableOpacity onPress={() => {
                setSelectedState('');
                setSelectedCounty('');
              }}>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            ) : (
              <ChevronDown size={16} color="#94A3B8" />
            )}
          </TouchableOpacity>

          {selectedState && US_COUNTIES[selectedState] && US_COUNTIES[selectedState].length > 0 && (
            <TouchableOpacity
              style={styles.countyFilter}
              onPress={() => setShowCountyModal(true)}
            >
              <MapPin size={14} color="#64748B" />
              <Text style={styles.countyFilterText}>
                {selectedCounty || 'County (optional)'}
              </Text>
              {selectedCounty ? (
                <TouchableOpacity onPress={() => setSelectedCounty('')}>
                  <X size={14} color="#64748B" />
                </TouchableOpacity>
              ) : (
                <ChevronDown size={14} color="#94A3B8" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCategoryModal(false);
          setCategorySearchQuery('');
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowCategoryModal(false);
            setCategorySearchQuery('');
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Category</Text>
                <TouchableOpacity onPress={() => {
                  setShowCategoryModal(false);
                  setCategorySearchQuery('');
                }}>
                  <X size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              <View style={styles.searchContainer}>
                <Search size={16} color="#64748B" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search categories..."
                  value={categorySearchQuery}
                  onChangeText={setCategorySearchQuery}
                  placeholderTextColor="#64748B"
                />
                {categorySearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                    <X size={16} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView style={styles.modalScroll}>
                {CATEGORIES.filter(category =>
                  category.label.toLowerCase().includes(categorySearchQuery.toLowerCase())
                ).map(category => (
                  <TouchableOpacity
                    key={category.value}
                    style={[
                      styles.categoryOption,
                      selectedCategory === category.value && styles.categoryOptionActive
                    ]}
                    onPress={() => {
                      setSelectedCategory(category.value);
                      setShowCategoryModal(false);
                      setCategorySearchQuery('');
                    }}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      selectedCategory === category.value && styles.categoryOptionTextActive
                    ]}>
                      {category.label}
                    </Text>
                    {selectedCategory === category.value && (
                      <View style={styles.checkmark} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showStateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStateModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStateModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStateModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {US_STATES.map(state => (
                <TouchableOpacity
                  key={state.code}
                  style={[
                    styles.categoryOption,
                    selectedState === state.code && styles.categoryOptionActive
                  ]}
                  onPress={() => {
                    setSelectedState(state.code);
                    setShowStateModal(false);
                  }}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    selectedState === state.code && styles.categoryOptionTextActive
                  ]}>
                    {state.name}
                  </Text>
                  {selectedState === state.code && (
                    <View style={styles.checkmark} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showCountyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCountyModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCountyModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select County - {selectedState && US_STATES.find(s => s.code === selectedState)?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowCountyModal(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Filter companies by county
            </Text>
            <ScrollView style={styles.modalScroll}>
              {selectedState && US_COUNTIES[selectedState]?.map(county => (
                <TouchableOpacity
                  key={county}
                  style={[
                    styles.categoryOption,
                    selectedCounty === county && styles.categoryOptionActive
                  ]}
                  onPress={() => {
                    setSelectedCounty(county);
                    setShowCountyModal(false);
                  }}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    selectedCounty === county && styles.categoryOptionTextActive
                  ]}>
                    {county}
                  </Text>
                  {selectedCounty === county && (
                    <View style={styles.checkmark} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <ScrollView style={styles.companiesList} contentContainerStyle={styles.companiesContent}>
          {filteredCompanies.length === 0 ? (
            <View style={styles.emptyState}>
              <Building2 size={48} color="#64748B" />
              <Text style={styles.emptyText}>No companies found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
            </View>
          ) : (
            filteredCompanies.map(company => (
              <TouchableOpacity
                key={company.id}
                style={styles.companyCard}
                onPress={() => handleCompanyPress(company.id)}
              >
                <View style={styles.companyHeader}>
                  {company.logo_url ? (
                    <Image source={{ uri: company.logo_url }} style={styles.companyLogo} />
                  ) : (
                    <View style={styles.companyLogo}>
                      <Building2 size={22} color="#60A5FA" />
                    </View>
                  )}
                  <View style={styles.companyInfo}>
                    <View style={styles.companyNameRow}>
                      <Text style={styles.companyName}>{company.company_name}</Text>
                      {activePartnershipCompanyIds.has(company.id) && (
                        <View style={styles.activeBadge}>
                          <View style={styles.activeDot} />
                          <Text style={styles.activeText}>Active</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.ratingContainer}>
                      <Star size={13} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.ratingText}>
                        {company.average_rating > 0 ? company.average_rating.toFixed(1) : 'No reviews'}
                      </Text>
                      {company.total_reviews > 0 && (
                        <Text style={styles.reviewCount}>({company.total_reviews})</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {CATEGORIES.find(c => c.value === company.business_category)?.label || 'Other'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.companyDescription} numberOfLines={2}>
                  {company.description || 'No description available'}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: -8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryDropdownText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  stateFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 110,
  },
  stateFilterText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  countyFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 140,
  },
  countyFilterText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: 500,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalScroll: {
    maxHeight: 400,
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  categoryOptionActive: {
    backgroundColor: '#0F172A',
  },
  categoryOptionText: {
    fontSize: 15,
    color: '#94A3B8',
  },
  categoryOptionTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
  },
  companiesList: {
    flex: 1,
  },
  companiesContent: {
    padding: 16,
    gap: 12,
  },
  companyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  companyLogoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#60A5FA',
  },
  companyInfo: {
    flex: 1,
    gap: 2,
  },
  companyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#10B98120',
    borderRadius: 8,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  reviewCount: {
    fontSize: 13,
    color: '#94A3B8',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  companyDescription: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    paddingHorizontal: 20,
    paddingBottom: 12,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
});

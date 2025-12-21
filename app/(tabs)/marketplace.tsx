import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Search, Star, Building2 } from 'lucide-react-native';
import { useAuth } from '@/lib/AuthContext';

type Company = {
  id: string;
  company_name: string;
  description: string;
  business_category: string;
  logo_url: string;
  average_rating: number;
  total_reviews: number;
};

const CATEGORIES = [
  { value: 'all', label: 'All' },
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

export default function MarketplaceScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    filterCompanies();
  }, [companies, searchQuery, selectedCategory]);

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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map(category => (
            <TouchableOpacity
              key={category.value}
              style={[
                styles.categoryChip,
                selectedCategory === category.value && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(category.value)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category.value && styles.categoryChipTextActive
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
                  <View style={styles.companyLogo}>
                    {company.logo_url ? (
                      <Text style={styles.companyLogoText}>{company.company_name[0]}</Text>
                    ) : (
                      <Building2 size={22} color="#60A5FA" />
                    )}
                  </View>
                  <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>{company.company_name}</Text>
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
  categoriesContent: {
    paddingVertical: 4,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
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
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
});

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
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'taxes', label: 'Taxes' },
  { value: 'legal_software', label: 'Legal Software' },
  { value: 'legal_services', label: 'Legal Services' },
  { value: 'recruiting', label: 'Recruiting' },
  { value: 'hr_software', label: 'HR Software' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales_software', label: 'Sales Software' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'financial_services', label: 'Financial Services' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'construction', label: 'Construction' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'ecommerce', label: 'E-commerce' },
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
        <Text style={styles.title}>Company Marketplace</Text>
        <Text style={styles.subtitle}>Browse companies and choose your partnerships</Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search companies..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#64748B"
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
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
                      <Building2 size={24} color="#60A5FA" />
                    )}
                  </View>
                  <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>{company.company_name}</Text>
                    <View style={styles.ratingContainer}>
                      <Star size={14} color="#F59E0B" fill="#F59E0B" />
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  searchSection: {
    padding: 16,
    backgroundColor: '#1E293B',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  categoriesContainer: {
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
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
    fontSize: 14,
    fontWeight: '500',
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
    gap: 16,
  },
  companyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  companyLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  companyLogoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#60A5FA',
  },
  companyInfo: {
    flex: 1,
    gap: 4,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  reviewCount: {
    fontSize: 14,
    color: '#94A3B8',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  companyDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
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

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Building2, Users, Package, DollarSign, ArrowLeft } from 'lucide-react-native';

interface Company {
  id: string;
  company_name: string;
  description: string;
  website: string;
  business_category: string;
  created_at: string;
  total_products: number;
  active_partnerships: number;
  total_revenue: number;
  avg_rating: number;
}

export default function AdminCompanies() {
  const { profile } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.is_super_admin) {
      Alert.alert('Access Denied', 'Admin access required');
      router.back();
      return;
    }
    loadCompanies();
  }, [profile]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select('id, company_name, description, website, business_category, created_at')
        .order('created_at', { ascending: false });

      console.log('Companies query result:', { data: companiesData, error });

      if (error) {
        console.error('Companies query error:', error);
        throw error;
      }

      if (!companiesData || companiesData.length === 0) {
        console.log('No companies found in database');
        setCompanies([]);
        return;
      }

      console.log(`Loading stats for ${companiesData.length} companies`);

      const companiesWithStats = await Promise.all(
        companiesData.map(async (company) => {
          try {
            const [productsRes, partnershipsRes, dealsRes, reviewsRes] = await Promise.all([
              supabase
                .from('products')
                .select('id', { count: 'exact', head: true })
                .eq('company_id', company.id),
              supabase
                .from('affiliate_partnerships')
                .select('id', { count: 'exact', head: true })
                .eq('company_id', company.id)
                .eq('status', 'approved'),
              supabase
                .from('deals')
                .select('deal_value')
                .eq('company_id', company.id),
              supabase
                .from('company_reviews')
                .select('rating')
                .eq('company_id', company.id),
            ]);

            if (productsRes.error) console.error('Products query error:', productsRes.error);
            if (partnershipsRes.error) console.error('Partnerships query error:', partnershipsRes.error);
            if (dealsRes.error) console.error('Deals query error:', dealsRes.error);
            if (reviewsRes.error) console.error('Reviews query error:', reviewsRes.error);

            const totalRevenue = (dealsRes.data || []).reduce(
              (sum, deal) => sum + deal.deal_value,
              0
            );

            const avgRating =
              reviewsRes.data && reviewsRes.data.length > 0
                ? reviewsRes.data.reduce((sum, r) => sum + r.rating, 0) / reviewsRes.data.length
                : 0;

            return {
              ...company,
              total_products: productsRes.count || 0,
              active_partnerships: partnershipsRes.count || 0,
              total_revenue: totalRevenue,
              avg_rating: avgRating,
            };
          } catch (companyError) {
            console.error(`Error loading stats for company ${company.id}:`, companyError);
            return {
              ...company,
              total_products: 0,
              active_partnerships: 0,
              total_revenue: 0,
              avg_rating: 0,
            };
          }
        })
      );

      console.log('Companies with stats:', companiesWithStats);
      setCompanies(companiesWithStats);
    } catch (error) {
      console.error('Error loading companies:', error);
      Alert.alert('Error', `Failed to load companies: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#60A5FA" size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Company Management</Text>
          <Text style={styles.subtitle}>{companies.length} companies</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadCompanies} />}
      >
        {companies.map((company) => (
          <TouchableOpacity
            key={company.id}
            style={styles.companyCard}
            onPress={() =>
              router.push({
                pathname: '/company/[id]',
                params: { id: company.id },
              })
            }
          >
            <View style={styles.companyHeader}>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{company.company_name}</Text>
                {company.business_category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{company.business_category}</Text>
                  </View>
                )}
                <Text style={styles.companyDescription} numberOfLines={2}>
                  {company.description || 'No description'}
                </Text>
                {company.website && (
                  <Text style={styles.website} numberOfLines={1}>
                    {company.website}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={styles.statIcon}>
                  <Package size={16} color="#60A5FA" />
                </View>
                <Text style={styles.statValue}>{company.total_products}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>

              <View style={styles.statItem}>
                <View style={styles.statIcon}>
                  <Users size={16} color="#10B981" />
                </View>
                <Text style={styles.statValue}>{company.active_partnerships}</Text>
                <Text style={styles.statLabel}>Partnerships</Text>
              </View>

              <View style={styles.statItem}>
                <View style={styles.statIcon}>
                  <DollarSign size={16} color="#3B82F6" />
                </View>
                <Text style={styles.statValue}>${company.total_revenue.toFixed(0)}</Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>
            </View>

            {company.avg_rating > 0 && (
              <View style={styles.cardFooter}>
                <Text style={styles.ratingText}>
                  ⭐ {company.avg_rating.toFixed(1)} rating
                </Text>
              </View>
            )}

            <Text style={styles.joinedText}>
              Joined {new Date(company.created_at).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        ))}

        {companies.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Building2 color="#64748B" size={48} />
            <Text style={styles.emptyText}>No companies found</Text>
          </View>
        )}
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
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  companyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  companyHeader: {
    marginBottom: 16,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '600',
  },
  companyDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 6,
    lineHeight: 20,
  },
  website: {
    fontSize: 13,
    color: '#60A5FA',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  joinedText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
  },
});

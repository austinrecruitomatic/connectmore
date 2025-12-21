import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Star, DollarSign, Package, MessageSquare, ShoppingCart, Clipboard } from 'lucide-react-native';

type Company = {
  id: string;
  company_name: string;
  description: string;
  website: string;
  business_category: string;
  average_rating: number;
  total_reviews: number;
};

type Product = {
  id: string;
  name: string;
  description: string;
  commission_rate: number;
  commission_type: string;
  is_active: boolean;
  sale_type?: 'lead_generation' | 'direct_sale';
  product_price?: number;
  currency?: string;
  inventory_tracking?: boolean;
  inventory_quantity?: number;
};

type Review = {
  id: string;
  rating: number;
  title: string;
  comment: string;
  created_at: string;
  reviewer: {
    full_name: string;
  };
};

export default function CompanyDetailScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [hasPartnership, setHasPartnership] = useState(false);
  const [partnershipStatus, setPartnershipStatus] = useState<string>('');
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [partnerships, setPartnerships] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchCompanyDetails();
    }
  }, [id]);

  const fetchAccessibleProducts = async (companyId: string) => {
    const { data: allProducts, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (error || !allProducts) {
      return { data: [], error };
    }

    if (!profile) {
      return { data: [], error: null };
    }

    const publicProducts = allProducts.filter(p => !(p as any).access_type || (p as any).access_type === 'public');

    const restrictedProductIds = allProducts
      .filter(p => (p as any).access_type === 'restricted')
      .map(p => p.id);

    if (restrictedProductIds.length === 0) {
      return { data: publicProducts, error: null };
    }

    const { data: accessGrants } = await supabase
      .from('product_affiliate_access')
      .select('product_id')
      .eq('affiliate_id', profile.id)
      .in('product_id', restrictedProductIds);

    const accessibleRestrictedIds = new Set((accessGrants || []).map(g => g.product_id));
    const accessibleRestrictedProducts = allProducts.filter(
      p => (p as any).access_type === 'restricted' && accessibleRestrictedIds.has(p.id)
    );

    return {
      data: [...publicProducts, ...accessibleRestrictedProducts],
      error: null,
    };
  };

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);

      const [companyRes, productsRes, reviewsRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', id).single(),
        fetchAccessibleProducts(id.toString()),
        supabase
          .from('company_reviews')
          .select('*, reviewer:profiles(full_name)')
          .eq('company_id', id)
          .order('created_at', { ascending: false })
      ]);

      if (companyRes.error) throw companyRes.error;
      setCompany(companyRes.data);
      setProducts(productsRes.data || []);

      if (profile) {
        const { data: partnershipsData } = await supabase
          .from('affiliate_partnerships')
          .select('company_id, status, id, affiliate_code')
          .eq('affiliate_id', profile.id)
          .eq('company_id', id);

        if (partnershipsData && partnershipsData.length > 0) {
          setPartnerships(partnershipsData);
          setHasPartnership(true);
          const firstPartnership = partnershipsData[0];
          setPartnershipStatus(firstPartnership.status);

          const hasApprovedPartnership = partnershipsData.some(p => p.status === 'approved');

          if (hasApprovedPartnership) {
            const approvedPartnership = partnershipsData.find(p => p.status === 'approved');
            if (approvedPartnership) {
              const { data: leadsData, count } = await supabase
                .from('analytics_events')
                .select('*', { count: 'exact', head: true })
                .eq('partnership_id', approvedPartnership.id);

              const hasLeads = (count ?? 0) > 0;
              setCanReview(hasLeads);
            } else {
              setCanReview(false);
            }
          } else {
            setCanReview(false);
          }
        } else {
          setHasPartnership(false);
          setPartnershipStatus('');
          setCanReview(false);
        }
      }

      if (reviewsRes.data) {
        setReviews(reviewsRes.data as Review[]);
        const userReview = reviewsRes.data.find((r: any) => r.reviewer_id === profile?.id);
        setHasReviewed(!!userReview);
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPartnership = async () => {
    if (!profile || !id) return;

    try {
      setRequesting(true);

      const affiliateCode = `${profile.id.slice(0, 8)}-${id.toString().slice(0, 8)}`;

      const { error } = await supabase
        .from('affiliate_partnerships')
        .insert({
          affiliate_id: profile.id,
          company_id: id.toString(),
          status: 'pending',
          affiliate_code: affiliateCode
        });

      if (error) throw error;

      if (Platform.OS === 'web') {
        alert('Partnership request sent successfully!');
      } else {
        Alert.alert('Success', 'Partnership request sent successfully!');
      }

      fetchCompanyDetails();
    } catch (error: any) {
      console.error('Error requesting partnership:', error);
      const message = error.message || 'Failed to request partnership';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleWriteReview = () => {
    router.push(`/company/${id}/write-review`);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (!company) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Company not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Company Details</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.companyHeader}>
          <View style={styles.companyTitleRow}>
            <Text style={styles.companyName}>{company.company_name}</Text>
          </View>

          <View style={styles.ratingRow}>
            <View style={styles.ratingContainer}>
              <Star size={20} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingText}>
                {company.average_rating > 0 ? company.average_rating.toFixed(1) : 'No reviews'}
              </Text>
              {company.total_reviews > 0 && (
                <Text style={styles.reviewCount}>({company.total_reviews} reviews)</Text>
              )}
            </View>
          </View>

          <Text style={styles.companyDescription}>{company.description}</Text>

          {company.website && (
            <Text style={styles.companyWebsite}>{company.website}</Text>
          )}

          {profile?.user_type === 'affiliate' && (
            hasPartnership ? (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {partnershipStatus === 'approved' && '✓ Partnership Active'}
                  {partnershipStatus === 'pending' && '⏱ Request Pending'}
                  {partnershipStatus === 'rejected' && '✗ Request Rejected'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.requestPartnershipButton}
                onPress={handleRequestPartnership}
                disabled={requesting}
              >
                {requesting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.requestPartnershipButtonText}>Request Partnership</Text>
                )}
              </TouchableOpacity>
            )
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={20} color="#60A5FA" />
            <Text style={styles.sectionTitle}>Available Products</Text>
          </View>

          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No active products</Text>
            </View>
          ) : (
            products.map(product => {
              const approvedPartnership = partnerships.find(p => p.status === 'approved' && p.company_id === id);

              return (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <View style={styles.productTitleRow}>
                      <Text style={styles.productName}>{product.name}</Text>
                      {product.sale_type === 'direct_sale' && (
                        <View style={styles.saleTypeBadge}>
                          <ShoppingCart size={12} color="#F59E0B" />
                          <Text style={styles.saleTypeText}>Direct Sale</Text>
                        </View>
                      )}
                      {(!product.sale_type || product.sale_type === 'lead_generation') && (
                        <View style={[styles.saleTypeBadge, styles.leadGenBadge]}>
                          <Clipboard size={12} color="#60A5FA" />
                          <Text style={[styles.saleTypeText, styles.leadGenText]}>Lead Gen</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.commissionBadge}>
                      <DollarSign size={14} color="#10B981" />
                      <Text style={styles.commissionText}>
                        {product.commission_type === 'percentage'
                          ? `${product.commission_rate}%`
                          : `$${product.commission_rate}`}
                      </Text>
                    </View>
                  </View>

                  {product.description && (
                    <Text style={styles.productDescription}>{product.description}</Text>
                  )}

                  {product.sale_type === 'direct_sale' && product.product_price && (
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Price:</Text>
                      <Text style={styles.priceValue}>
                        {product.currency || 'USD'} ${product.product_price.toFixed(2)}
                      </Text>
                      {product.inventory_tracking && (
                        <Text style={styles.inventoryText}>
                          {product.inventory_quantity || 0} in stock
                        </Text>
                      )}
                    </View>
                  )}

                  {approvedPartnership && product.sale_type === 'direct_sale' && (
                    <TouchableOpacity
                      style={styles.buyNowButton}
                      onPress={() => router.push(`/product/${product.id}/checkout?partnershipId=${approvedPartnership.id}`)}
                    >
                      <ShoppingCart size={16} color="#FFFFFF" />
                      <Text style={styles.buyNowText}>Sell This Product</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MessageSquare size={20} color="#60A5FA" />
            <Text style={styles.sectionTitle}>Reviews</Text>
          </View>

          {canReview && !hasReviewed && (
            <TouchableOpacity style={styles.writeReviewButton} onPress={handleWriteReview}>
              <Text style={styles.writeReviewText}>Write a Review</Text>
            </TouchableOpacity>
          )}

          {hasPartnership && partnershipStatus === 'approved' && !canReview && !hasReviewed && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                You can write a review after you've sent at least one person to this company.
              </Text>
            </View>
          )}

          {reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No reviews yet</Text>
            </View>
          ) : (
            reviews.map(review => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{review.reviewer.full_name}</Text>
                  <View style={styles.reviewRating}>
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        color="#F59E0B"
                        fill={i < review.rating ? '#F59E0B' : 'transparent'}
                      />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewTitle}>{review.title}</Text>
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
                <Text style={styles.reviewDate}>
                  {new Date(review.created_at).toLocaleDateString()}
                </Text>
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
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  companyHeader: {
    padding: 20,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  companyTitleRow: {
    marginBottom: 8,
  },
  companyName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingRow: {
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewCount: {
    fontSize: 14,
    color: '#94A3B8',
  },
  companyDescription: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 22,
    marginBottom: 8,
  },
  companyWebsite: {
    fontSize: 14,
    color: '#60A5FA',
    marginBottom: 16,
  },
  requestPartnershipButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  requestPartnershipButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
    backgroundColor: '#1E293B',
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productCard: {
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  commissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  commissionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  productDescription: {
    fontSize: 14,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  writeReviewButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  writeReviewText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCard: {
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  reviewComment: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#64748B',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
  errorText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  infoBox: {
    padding: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#FCD34D',
    textAlign: 'center',
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  saleTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  leadGenBadge: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    borderColor: '#60A5FA',
  },
  saleTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  leadGenText: {
    color: '#60A5FA',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  priceLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  inventoryText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 'auto',
  },
  buyNowButton: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  buyNowText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

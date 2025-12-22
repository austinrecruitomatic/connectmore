import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Link as LinkIcon,
  Copy,
  Users,
  Gift,
  TrendingUp,
  Building2,
  ExternalLink,
} from 'lucide-react-native';

type Partnership = {
  id: string;
  affiliate_code: string;
  company_id: string;
  company: {
    company_name: string;
  };
  product: {
    name: string;
  } | null;
};

type CompanyGroup = {
  company_id: string;
  company_name: string;
  partnerships: Partnership[];
};

export default function CustomerPortalGenerator() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadPartnerships();
    }
  }, [user]);

  const loadPartnerships = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('affiliate_partnerships')
        .select(`
          id,
          affiliate_code,
          company_id,
          company:companies (
            company_name
          ),
          product:products (
            name
          )
        `)
        .eq('affiliate_id', user?.id)
        .eq('status', 'approved');

      if (error) throw error;

      const typedData = (data || []) as any[];
      setPartnerships(typedData);

      const grouped = groupPartnershipsByCompany(typedData);
      setCompanyGroups(grouped);

      if (typedData.length > 0) {
        setExpandedCompany(grouped[0]?.company_id || null);
      }
    } catch (error: any) {
      console.error('Error loading partnerships:', error);
      Alert.alert('Error', 'Failed to load partnerships');
    } finally {
      setLoading(false);
    }
  };

  const groupPartnershipsByCompany = (partnerships: Partnership[]): CompanyGroup[] => {
    const groups: { [key: string]: CompanyGroup } = {};

    partnerships.forEach((partnership) => {
      const companyId = partnership.company_id;
      const companyName = partnership.company?.company_name || 'Unknown Company';

      if (!groups[companyId]) {
        groups[companyId] = {
          company_id: companyId,
          company_name: companyName,
          partnerships: [],
        };
      }

      groups[companyId].partnerships.push(partnership);
    });

    return Object.values(groups);
  };

  const getCustomerPortalLink = (partnership: Partnership) => {
    return `https://connect-more.io/customer-portal?ref=${partnership.affiliate_code}`;
  };

  const shareLink = (partnership: Partnership) => {
    console.log('shareLink called');
    const link = getCustomerPortalLink(partnership);
    const company = partnership.company?.company_name || 'this company';
    const message = `Join ${company}'s Customer Referral Program!\n\nSign up through my link and start earning money by referring friends. When your friends make purchases, you earn commissions - and they can refer too!\n\nUnlimited earning potential\nPassive income from your network\nEasy to get started\n\nJoin here: ${link}`;

    console.log('Showing alert with message:', message);
    alert(`Share Link\n\n${message}`);
  };

  const copyLink = (partnership: Partnership) => {
    console.log('copyLink called');
    const link = getCustomerPortalLink(partnership);
    console.log('Link:', link);
    alert(`Customer Portal Link\n\n${link}`);
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Users size={64} color="#64748B" />
        <Text style={styles.emptyTitle}>Not Authenticated</Text>
        <Text style={styles.emptyText}>
          Please log in to access customer portals
        </Text>
      </View>
    );
  }

  if (partnerships.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Users size={64} color="#64748B" />
        <Text style={styles.emptyTitle}>No Partnerships Yet</Text>
        <Text style={styles.emptyText}>
          Partner with companies first to get access to the customer referral program
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Gift size={32} color="#60A5FA" />
        <Text style={styles.title}>Customer Portals</Text>
        <Text style={styles.subtitle}>
          Share portal links with customers to build your referral network
        </Text>
      </View>

      <View style={styles.benefitsCard}>
        <Text style={styles.benefitsTitle}>How It Works</Text>
        <View style={styles.benefitItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Share Your Link</Text>
            <Text style={styles.benefitText}>
              Give customers your unique customer portal link
            </Text>
          </View>
        </View>
        <View style={styles.benefitItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>They Sign Up</Text>
            <Text style={styles.benefitText}>
              Customers create an account and get their own referral code
            </Text>
          </View>
        </View>
        <View style={styles.benefitItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Network Grows</Text>
            <Text style={styles.benefitText}>
              Customers refer friends, friends refer more - you earn from ALL of them!
            </Text>
          </View>
        </View>
        <View style={styles.benefitItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>4</Text>
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>Earn Infinitely</Text>
            <Text style={styles.benefitText}>
              Get commissions on every purchase from your entire network, forever
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Customer Portals</Text>
        <Text style={styles.sectionDescription}>
          Each partnership has its own customer portal. Share these links to build your network.
        </Text>

        {companyGroups.map((group) => (
          <View key={group.company_id} style={styles.companyGroup}>
            <TouchableOpacity
              style={styles.companyHeader}
              onPress={() =>
                setExpandedCompany(expandedCompany === group.company_id ? null : group.company_id)
              }
            >
              <View style={styles.companyHeaderLeft}>
                <Building2 size={24} color="#60A5FA" />
                <View style={styles.companyHeaderText}>
                  <Text style={styles.companyName}>{group.company_name}</Text>
                  <Text style={styles.companyCount}>
                    {group.partnerships.length} portal{group.partnerships.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <ExternalLink size={20} color="#94A3B8" />
            </TouchableOpacity>

            {expandedCompany === group.company_id &&
              group.partnerships.map((partnership) => (
                <View key={partnership.id} style={styles.portalCard}>
                  {partnership.product && (
                    <Text style={styles.portalProduct}>{partnership.product.name}</Text>
                  )}

                  <View style={styles.portalLinkContainer}>
                    <LinkIcon size={18} color="#60A5FA" />
                    <Text style={styles.portalLink} numberOfLines={1}>
                      {getCustomerPortalLink(partnership)}
                    </Text>
                  </View>

                  <View style={styles.portalActions}>
                    <TouchableOpacity
                      style={styles.portalActionButton}
                      onPress={() => shareLink(partnership)}
                    >
                      <TrendingUp size={18} color="#FFF" />
                      <Text style={styles.portalActionText}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.portalActionButton, styles.portalActionButtonSecondary]}
                      onPress={() => copyLink(partnership)}
                    >
                      <Copy size={18} color="#60A5FA" />
                      <Text style={[styles.portalActionText, styles.portalActionTextSecondary]}>
                        Copy
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
          </View>
        ))}
      </View>

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Tips for Success</Text>
        <Text style={styles.tipText}>
          • <Text style={styles.tipBold}>Be Genuine:</Text> Share the opportunity with people who will genuinely benefit
        </Text>
        <Text style={styles.tipText}>
          • <Text style={styles.tipBold}>Explain the Value:</Text> Help customers understand they can earn money too
        </Text>
        <Text style={styles.tipText}>
          • <Text style={styles.tipBold}>Follow Up:</Text> Check in with customers and help them get started
        </Text>
        <Text style={styles.tipText}>
          • <Text style={styles.tipBold}>Track Your Network:</Text> Use the "My Network" page to see your downline grow
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    alignItems: 'center',
    padding: 32,
    paddingTop: 60,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
  },
  benefitsCard: {
    backgroundColor: '#1E293B',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 20,
  },
  companyGroup: {
    marginBottom: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E293B',
  },
  companyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  companyHeaderText: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  companyCount: {
    fontSize: 14,
    color: '#94A3B8',
  },
  portalCard: {
    padding: 16,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  portalProduct: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
  },
  portalLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  portalLink: {
    flex: 1,
    fontSize: 13,
    color: '#60A5FA',
    fontWeight: '500',
  },
  portalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  portalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
  },
  portalActionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#60A5FA',
  },
  portalActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  portalActionTextSecondary: {
    color: '#60A5FA',
  },
  tipsCard: {
    backgroundColor: '#1E3A5F',
    margin: 20,
    marginTop: 0,
    padding: 24,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  tipText: {
    fontSize: 14,
    color: '#CBD5E1',
    marginBottom: 12,
    lineHeight: 20,
  },
  tipBold: {
    fontWeight: 'bold',
    color: '#60A5FA',
  },
});

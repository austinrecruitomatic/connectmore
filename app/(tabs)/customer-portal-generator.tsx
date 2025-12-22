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
  TextInput,
} from 'react-native';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Link as LinkIcon,
  Copy,
  Users,
  Gift,
  TrendingUp,
  Mail,
  MessageSquare,
} from 'lucide-react-native';

type Partnership = {
  id: string;
  affiliate_code: string;
  company: {
    company_name: string;
  };
  product: {
    product_name: string;
  } | null;
};

export default function CustomerPortalGenerator() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null);

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
          company:companies (
            company_name
          ),
          product:products (
            product_name
          )
        `)
        .eq('affiliate_id', user?.id)
        .eq('status', 'approved');

      if (error) throw error;

      const typedData = data as any[];
      setPartnerships(typedData);
      if (typedData.length > 0) {
        setSelectedPartnership(typedData[0]);
      }
    } catch (error) {
      console.error('Error loading partnerships:', error);
      Alert.alert('Error', 'Failed to load partnerships');
    } finally {
      setLoading(false);
    }
  };

  const getCustomerPortalLink = () => {
    if (!selectedPartnership) return '';
    return `https://yourapp.com/customer-portal?ref=${selectedPartnership.affiliate_code}`;
  };

  const shareLink = async () => {
    try {
      const link = getCustomerPortalLink();
      const company = selectedPartnership?.company?.company_name || 'this company';

      await Share.share({
        message: `🎁 Join ${company}'s Customer Referral Program!\n\nSign up through my link and start earning money by referring friends. When your friends make purchases, you earn commissions - and they can refer too!\n\n💰 Unlimited earning potential\n📈 Passive income from your network\n✨ Easy to get started\n\nJoin here: ${link}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const copyLink = async () => {
    const link = getCustomerPortalLink();
    Alert.alert('Link Copied', `Customer portal link copied to clipboard:\n\n${link}`);
  };

  const getEmailTemplate = () => {
    const company = selectedPartnership?.company?.company_name || 'this company';
    return `Subject: Join Our Customer Referral Program - Earn Money Together!

Hi there!

I wanted to share an exciting opportunity with you. ${company} has a customer referral program that lets you earn money by simply referring friends and family.

Here's how it works:
• Sign up through my referral link
• Get your own unique referral code
• Share it with friends
• Earn commissions when anyone in your network makes a purchase
• Your referrals can also refer others, and you still earn!

It's a win-win situation - you get to help friends discover great products while earning passive income.

Ready to get started? Sign up here:
${getCustomerPortalLink()}

Let me know if you have any questions!`;
  };

  const copyEmailTemplate = () => {
    Alert.alert('Template Copied', 'Email template copied! Paste it into your email app.');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Loading...</Text>
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
        <Text style={styles.title}>Customer Portal</Text>
        <Text style={styles.subtitle}>
          Share this link with customers to join your referral network
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

      {partnerships.length > 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Partnership</Text>
          {partnerships.map((partnership) => (
            <TouchableOpacity
              key={partnership.id}
              style={[
                styles.partnershipCard,
                selectedPartnership?.id === partnership.id && styles.partnershipCardSelected,
              ]}
              onPress={() => setSelectedPartnership(partnership)}
            >
              <View style={styles.partnershipInfo}>
                <Text style={styles.partnershipCompany}>
                  {partnership.company?.company_name}
                </Text>
                {partnership.product && (
                  <Text style={styles.partnershipProduct}>
                    {partnership.product.product_name}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.radioButton,
                  selectedPartnership?.id === partnership.id && styles.radioButtonSelected,
                ]}
              >
                {selectedPartnership?.id === partnership.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Customer Portal Link</Text>
        <View style={styles.linkCard}>
          <LinkIcon size={24} color="#60A5FA" />
          <View style={styles.linkTextContainer}>
            <Text style={styles.linkLabel}>Portal Link</Text>
            <Text style={styles.linkText} numberOfLines={1}>
              {getCustomerPortalLink()}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={shareLink}>
            <TrendingUp size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Share Link</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={copyLink}
          >
            <Copy size={20} color="#60A5FA" />
            <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
              Copy Link
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email Template</Text>
        <Text style={styles.sectionDescription}>
          Copy this template to invite customers via email
        </Text>
        <View style={styles.templateCard}>
          <TextInput
            style={styles.templateText}
            value={getEmailTemplate()}
            multiline
            editable={false}
          />
        </View>
        <TouchableOpacity style={styles.copyTemplateButton} onPress={copyEmailTemplate}>
          <Mail size={20} color="#FFF" />
          <Text style={styles.copyTemplateButtonText}>Copy Email Template</Text>
        </TouchableOpacity>
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
  partnershipCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  partnershipCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A5F',
  },
  partnershipInfo: {
    flex: 1,
  },
  partnershipCompany: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  partnershipProduct: {
    fontSize: 14,
    color: '#94A3B8',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#3B82F6',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  linkTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  linkLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '600',
  },
  linkText: {
    fontSize: 14,
    color: '#60A5FA',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#60A5FA',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  actionButtonTextSecondary: {
    color: '#60A5FA',
  },
  templateCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: 300,
  },
  templateText: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  copyTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
  },
  copyTemplateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
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

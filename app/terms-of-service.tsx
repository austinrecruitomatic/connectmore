import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function TermsOfService() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: January 10, 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agreement to Terms</Text>
          <Text style={styles.paragraph}>
            By accessing or using Connect More ("the Service," "the App"), you agree to be bound by these
            Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access
            the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description of Service</Text>
          <Text style={styles.paragraph}>
            Connect More is an affiliate marketing platform that connects businesses with affiliates to
            promote products and services. The Service enables:
          </Text>
          <Text style={styles.bulletPoint}>• Businesses to create products and find affiliate partners</Text>
          <Text style={styles.bulletPoint}>• Affiliates to promote products and earn commissions</Text>
          <Text style={styles.bulletPoint}>
            • Lead tracking, commission management, and payment processing
          </Text>
          <Text style={styles.bulletPoint}>• Network building through multi-level referral systems</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Accounts</Text>
          <Text style={styles.subheading}>Registration</Text>
          <Text style={styles.paragraph}>
            To use certain features of the Service, you must register for an account. You agree to:
          </Text>
          <Text style={styles.bulletPoint}>• Provide accurate, current, and complete information</Text>
          <Text style={styles.bulletPoint}>• Maintain and update your information to keep it accurate</Text>
          <Text style={styles.bulletPoint}>• Maintain the security of your account credentials</Text>
          <Text style={styles.bulletPoint}>• Be responsible for all activities under your account</Text>
          <Text style={styles.bulletPoint}>• Notify us immediately of any unauthorized access</Text>

          <Text style={styles.subheading}>Account Types</Text>
          <Text style={styles.paragraph}>
            Users may register as either a Business or an Affiliate. Each account type has different
            features and responsibilities as outlined in these Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Responsibilities</Text>
          <Text style={styles.paragraph}>You agree NOT to:</Text>
          <Text style={styles.bulletPoint}>• Violate any laws or regulations</Text>
          <Text style={styles.bulletPoint}>• Infringe on intellectual property rights</Text>
          <Text style={styles.bulletPoint}>• Transmit malicious code or spam</Text>
          <Text style={styles.bulletPoint}>• Engage in fraudulent activity</Text>
          <Text style={styles.bulletPoint}>
            • Misrepresent your identity or affiliation with any person or entity
          </Text>
          <Text style={styles.bulletPoint}>• Interfere with the Service or servers</Text>
          <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access to the Service</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commissions and Payments</Text>
          <Text style={styles.subheading}>For Affiliates</Text>
          <Text style={styles.bulletPoint}>
            • Commissions are earned based on valid referrals as defined by each business partner
          </Text>
          <Text style={styles.bulletPoint}>
            • Commission rates and payment terms are set by individual businesses
          </Text>
          <Text style={styles.bulletPoint}>
            • Payouts are processed through Stripe according to each business's payment schedule
          </Text>
          <Text style={styles.bulletPoint}>
            • Connect More is not responsible for disputes between affiliates and businesses
          </Text>
          <Text style={styles.bulletPoint}>
            • Commissions may be withheld or reversed for fraudulent activity
          </Text>

          <Text style={styles.subheading}>For Businesses</Text>
          <Text style={styles.bulletPoint}>
            • You are responsible for setting fair commission rates and payment terms
          </Text>
          <Text style={styles.bulletPoint}>
            • You must pay earned commissions according to your stated terms
          </Text>
          <Text style={styles.bulletPoint}>
            • Payment processing is handled through Stripe with applicable fees
          </Text>
          <Text style={styles.bulletPoint}>
            • You are responsible for the accuracy of commission calculations
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Fees</Text>
          <Text style={styles.paragraph}>
            Connect More charges a platform fee on successful transactions to maintain and improve the
            Service. Fee structures are clearly communicated and may be updated with notice. Standard
            payment processing fees apply through our payment provider, Stripe.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intellectual Property</Text>
          <Text style={styles.paragraph}>
            The Service and its original content, features, and functionality are owned by Connect More
            and are protected by international copyright, trademark, and other intellectual property laws.
          </Text>
          <Text style={styles.paragraph}>
            You retain ownership of any content you submit to the Service. By submitting content, you grant
            Connect More a worldwide, non-exclusive, royalty-free license to use, reproduce, and display
            such content in connection with operating and providing the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prohibited Activities</Text>
          <Text style={styles.paragraph}>Affiliates are prohibited from:</Text>
          <Text style={styles.bulletPoint}>• Cookie stuffing or other deceptive tracking practices</Text>
          <Text style={styles.bulletPoint}>• Trademark bidding without permission</Text>
          <Text style={styles.bulletPoint}>• Spam or unsolicited communications</Text>
          <Text style={styles.bulletPoint}>• False or misleading advertising</Text>
          <Text style={styles.bulletPoint}>• Self-referrals or fraudulent conversions</Text>
          <Text style={styles.bulletPoint}>• Incentivized clicks or fake traffic</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate or suspend your account immediately, without prior notice or liability, for any
            reason, including breach of these Terms. Upon termination:
          </Text>
          <Text style={styles.bulletPoint}>• Your right to use the Service will cease immediately</Text>
          <Text style={styles.bulletPoint}>• Outstanding commissions may be forfeited for violations</Text>
          <Text style={styles.bulletPoint}>
            • Valid earned commissions will be paid according to standard terms
          </Text>
          <Text style={styles.bulletPoint}>• You may request deletion of your data</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            To the maximum extent permitted by law, Connect More shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages, or any loss of profits or revenues,
            whether incurred directly or indirectly, or any loss of data, use, or goodwill.
          </Text>
          <Text style={styles.paragraph}>
            The Service is provided "AS IS" without warranties of any kind. We do not guarantee the
            accuracy, completeness, or usefulness of the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dispute Resolution</Text>
          <Text style={styles.paragraph}>
            Any disputes arising out of or relating to these Terms or the Service shall be resolved through
            binding arbitration, except that either party may seek injunctive relief in court to prevent
            infringement of intellectual property rights.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indemnification</Text>
          <Text style={styles.paragraph}>
            You agree to indemnify and hold harmless Connect More and its affiliates from any claims,
            damages, losses, liabilities, and expenses arising out of your use of the Service or violation
            of these Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right to modify these Terms at any time. We will notify users of any material
            changes by posting the new Terms on this page and updating the "Last Updated" date. Your
            continued use of the Service after changes constitutes acceptance of the new Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms shall be governed by and construed in accordance with the laws of the United States,
            without regard to its conflict of law provisions.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have any questions about these Terms, please contact us at:
          </Text>
          <Text style={styles.paragraph}>Email: support@connectmore.app</Text>
          <Text style={styles.paragraph}>Connect More Legal Team</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Connect More. All rights reserved.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    padding: 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 8,
    paddingLeft: 8,
  },
  footer: {
    paddingTop: 32,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
  },
});

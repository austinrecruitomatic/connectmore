import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function PrivacyPolicy() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: January 10, 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Introduction</Text>
          <Text style={styles.paragraph}>
            Connect More ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information when you use our mobile
            application and services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.subheading}>Personal Information</Text>
          <Text style={styles.paragraph}>
            We collect information that you provide directly to us, including:
          </Text>
          <Text style={styles.bulletPoint}>• Name and contact information (email, phone number)</Text>
          <Text style={styles.bulletPoint}>• Account credentials</Text>
          <Text style={styles.bulletPoint}>• Business information (company name, business category)</Text>
          <Text style={styles.bulletPoint}>• Payment information (processed securely through Stripe)</Text>
          <Text style={styles.bulletPoint}>• Profile information and preferences</Text>
          <Text style={styles.bulletPoint}>• Photos and images (only when you choose to upload them for profile pictures or product images)</Text>

          <Text style={styles.subheading}>Automatically Collected Information</Text>
          <Text style={styles.paragraph}>
            When you use our app, we automatically collect:
          </Text>
          <Text style={styles.bulletPoint}>• Device information (device type, operating system, unique device identifiers)</Text>
          <Text style={styles.bulletPoint}>• Usage data (features used, time spent, interactions)</Text>
          <Text style={styles.bulletPoint}>• Log data (IP address, access times, error logs)</Text>
          <Text style={styles.bulletPoint}>• Network information (mobile carrier, connection type)</Text>

          <Text style={styles.subheading}>Permissions</Text>
          <Text style={styles.paragraph}>
            Our app may request the following permissions:
          </Text>
          <Text style={styles.bulletPoint}>• Camera: To capture photos for profile pictures or product images (optional)</Text>
          <Text style={styles.bulletPoint}>• Photo Library: To select images from your device (optional)</Text>
          <Text style={styles.bulletPoint}>• Notifications: To send you updates about leads, commissions, and account activity (optional)</Text>
          <Text style={styles.bulletPoint}>• Calendar: To schedule demo appointments with Google Calendar integration (optional)</Text>
          <Text style={styles.paragraph}>
            You can modify these permissions at any time through your device settings. Denying permissions may limit certain features.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          <Text style={styles.paragraph}>We use your information to:</Text>
          <Text style={styles.bulletPoint}>• Provide, maintain, and improve our services</Text>
          <Text style={styles.bulletPoint}>• Process transactions and send related information</Text>
          <Text style={styles.bulletPoint}>• Send administrative information and updates</Text>
          <Text style={styles.bulletPoint}>• Respond to your inquiries and support requests</Text>
          <Text style={styles.bulletPoint}>• Monitor and analyze usage patterns and trends</Text>
          <Text style={styles.bulletPoint}>• Detect and prevent fraud or abuse</Text>
          <Text style={styles.bulletPoint}>• Comply with legal obligations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information Sharing</Text>
          <Text style={styles.paragraph}>
            We do not sell your personal information. We may share your information with:
          </Text>
          <Text style={styles.bulletPoint}>
            • Service Providers: Third parties who perform services on our behalf (e.g., Stripe for payment
            processing, Supabase for data storage)
          </Text>
          <Text style={styles.bulletPoint}>
            • Business Partners: When you engage in affiliate partnerships, necessary information is shared
            to facilitate the relationship
          </Text>
          <Text style={styles.bulletPoint}>
            • Legal Requirements: When required by law or to protect our rights
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate technical and organizational measures to protect your personal information.
            However, no method of transmission over the Internet or electronic storage is 100% secure. We use
            industry-standard encryption and security practices, including:
          </Text>
          <Text style={styles.bulletPoint}>• Secure data transmission (HTTPS/TLS)</Text>
          <Text style={styles.bulletPoint}>• Encrypted data storage</Text>
          <Text style={styles.bulletPoint}>• Regular security audits</Text>
          <Text style={styles.bulletPoint}>• Access controls and authentication</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights and Choices</Text>
          <Text style={styles.paragraph}>You have the right to:</Text>
          <Text style={styles.bulletPoint}>• Access and review your personal information</Text>
          <Text style={styles.bulletPoint}>• Correct inaccurate information</Text>
          <Text style={styles.bulletPoint}>• Request deletion of your account and data</Text>
          <Text style={styles.bulletPoint}>• Opt-out of marketing communications</Text>
          <Text style={styles.bulletPoint}>• Export your data</Text>
          <Text style={styles.paragraph}>
            To exercise these rights, please contact us at support@connectmore.app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your personal information for as long as necessary to provide our services and fulfill
            the purposes outlined in this Privacy Policy. When you delete your account, we will delete or
            anonymize your personal information, except where we are required to retain it for legal or
            regulatory purposes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Third-Party Services</Text>
          <Text style={styles.paragraph}>
            Our app uses the following third-party services that may collect information:
          </Text>
          <Text style={styles.bulletPoint}>
            • Stripe: Payment processing (subject to Stripe's Privacy Policy)
          </Text>
          <Text style={styles.bulletPoint}>
            • Supabase: Database and authentication services (subject to Supabase's Privacy Policy)
          </Text>
          <Text style={styles.bulletPoint}>
            • Google Calendar API: Calendar integration for scheduling (subject to Google's Privacy Policy)
          </Text>
          <Text style={styles.bulletPoint}>
            • Expo: App development platform and push notifications (subject to Expo's Privacy Policy)
          </Text>
          <Text style={styles.paragraph}>
            We are not responsible for the privacy practices of these third-party services. We encourage you
            to review their privacy policies.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Our services are not intended for individuals under the age of 18. We do not knowingly collect
            personal information from children. If we become aware that we have collected information from
            a child, we will take steps to delete such information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>California Privacy Rights (CCPA)</Text>
          <Text style={styles.paragraph}>
            If you are a California resident, you have additional rights under the California Consumer Privacy Act:
          </Text>
          <Text style={styles.bulletPoint}>• Right to know what personal information is collected</Text>
          <Text style={styles.bulletPoint}>• Right to know if personal information is sold or disclosed and to whom</Text>
          <Text style={styles.bulletPoint}>• Right to opt-out of the sale of personal information (we do not sell personal information)</Text>
          <Text style={styles.bulletPoint}>• Right to request deletion of personal information</Text>
          <Text style={styles.bulletPoint}>• Right to non-discrimination for exercising your CCPA rights</Text>
          <Text style={styles.paragraph}>
            To exercise these rights, contact us at support@connectmore.app. We will verify your identity
            before processing your request.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EU Data Protection Rights (GDPR)</Text>
          <Text style={styles.paragraph}>
            If you are located in the European Economic Area (EEA), you have certain data protection rights:
          </Text>
          <Text style={styles.bulletPoint}>• Right of access to your personal data</Text>
          <Text style={styles.bulletPoint}>• Right to rectification of inaccurate personal data</Text>
          <Text style={styles.bulletPoint}>• Right to erasure of your personal data</Text>
          <Text style={styles.bulletPoint}>• Right to restrict processing of your personal data</Text>
          <Text style={styles.bulletPoint}>• Right to data portability</Text>
          <Text style={styles.bulletPoint}>• Right to object to processing</Text>
          <Text style={styles.bulletPoint}>• Right to withdraw consent at any time</Text>
          <Text style={styles.paragraph}>
            To exercise these rights, contact us at support@connectmore.app. You also have the right to
            lodge a complaint with your local data protection authority.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>International Data Transfers</Text>
          <Text style={styles.paragraph}>
            Your information may be transferred to and processed in countries other than your country of
            residence. We ensure appropriate safeguards are in place to protect your information in
            accordance with this Privacy Policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting
            the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to
            review this Privacy Policy periodically for any changes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
          </Text>
          <Text style={styles.paragraph}>
            Email: support@connectmore.app
          </Text>
          <Text style={styles.paragraph}>
            Connect More Support Team
          </Text>
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

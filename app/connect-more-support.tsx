import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, MessageCircle, HelpCircle, Book, ChevronDown, ChevronUp } from 'lucide-react-native';

type FAQItem = {
  question: string;
  answer: string;
};

export default function ConnectMoreSupport() {
  const router = useRouter();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const faqs: FAQItem[] = [
    {
      question: 'What is Connect More?',
      answer: 'Connect More is an affiliate marketing platform that connects businesses with affiliates. Businesses can find partners to promote their products, and affiliates can earn commissions by referring customers to trusted companies.',
    },
    {
      question: 'How do I sign up?',
      answer: 'You can sign up by downloading the Connect More app and creating an account. Choose whether you want to join as a business or as an affiliate, and complete the registration process.',
    },
    {
      question: 'Is Connect More free to use?',
      answer: 'Yes, Connect More is free to join for both businesses and affiliates. We only charge a small platform fee on successful transactions to keep the platform running.',
    },
    {
      question: 'How do commissions work?',
      answer: 'When you refer a customer to a partner business and they make a purchase, you earn a commission based on the agreed rate. Commissions are tracked automatically and paid out through our secure payment system powered by Stripe.',
    },
    {
      question: 'When do I get paid?',
      answer: 'Payouts are processed according to the schedule set by each business partner. Most businesses pay out on a monthly basis, but some may offer weekly or bi-weekly payouts. You can track your earnings and pending payments in your dashboard.',
    },
    {
      question: 'What is the multi-level referral system?',
      answer: 'Our multi-level system allows you to earn commissions not just from your direct referrals, but also from the affiliates they recruit. This creates an infinite downline where everyone benefits from network growth.',
    },
    {
      question: 'How do I track my referrals?',
      answer: 'Your dashboard provides real-time tracking of all your leads, conversions, and earnings. You can see detailed analytics including lead status, conversion rates, and commission history.',
    },
    {
      question: 'What types of businesses can use Connect More?',
      answer: 'Connect More supports businesses across all industries including home services, professional services, retail, e-commerce, and more. Any business that wants to grow through partnerships can benefit from our platform.',
    },
    {
      question: 'How do I create a landing page?',
      answer: 'As an affiliate, you can create custom landing pages for each product you promote. Simply navigate to the Marketing section, select a product, and use our landing page builder to create professional pages that convert.',
    },
    {
      question: 'Is my payment information secure?',
      answer: 'Yes, all payments are processed through Stripe, one of the world\'s most secure payment platforms. We never store your full payment information on our servers.',
    },
    {
      question: 'Can I promote multiple businesses?',
      answer: 'Absolutely! You can partner with as many businesses as you want and promote multiple products. Build a diverse portfolio to maximize your earning potential.',
    },
    {
      question: 'How do I contact support?',
      answer: 'You can contact our support team by filling out the form below, or by emailing us directly at support@connectmore.app. We typically respond within 24 hours.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const handleEmailContact = () => {
    Linking.openURL('mailto:support@connectmore.app');
  };

  const handleSubmitContact = async () => {
    if (!contactForm.name || !contactForm.email || !contactForm.subject || !contactForm.message) {
      Alert.alert('Missing Information', 'Please fill out all fields before submitting.');
      return;
    }

    setSubmitting(true);

    const subject = encodeURIComponent(`[Connect More Support] ${contactForm.subject}`);
    const body = encodeURIComponent(
      `Name: ${contactForm.name}\nEmail: ${contactForm.email}\n\nMessage:\n${contactForm.message}`
    );

    await Linking.openURL(`mailto:support@connectmore.app?subject=${subject}&body=${body}`);

    setContactForm({ name: '', email: '', subject: '', message: '' });
    setSubmitting(false);
    Alert.alert('Success', 'Your email client has been opened. Please send the email to complete your request.');
  };

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
        <Text style={styles.headerTitle}>Support Center</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>How can we help you?</Text>
          <Text style={styles.welcomeDescription}>
            Find answers to common questions or reach out to our support team
          </Text>
        </View>

        <View style={styles.quickLinks}>
          <TouchableOpacity style={styles.quickLinkCard} onPress={handleEmailContact}>
            <Mail size={32} color="#007AFF" />
            <Text style={styles.quickLinkTitle}>Email Support</Text>
            <Text style={styles.quickLinkDescription}>support@connectmore.app</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickLinkCard} onPress={() => setExpandedFAQ(0)}>
            <HelpCircle size={32} color="#007AFF" />
            <Text style={styles.quickLinkTitle}>FAQs</Text>
            <Text style={styles.quickLinkDescription}>Common questions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickLinkCard} onPress={() => router.push('/connect-more-landing')}>
            <Book size={32} color="#007AFF" />
            <Text style={styles.quickLinkTitle}>About</Text>
            <Text style={styles.quickLinkDescription}>Learn more about us</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqList}>
            {faqs.map((faq, index) => (
              <View key={index} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqQuestion}
                  onPress={() => toggleFAQ(index)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.faqQuestionText}>{faq.question}</Text>
                  {expandedFAQ === index ? (
                    <ChevronUp size={20} color="#007AFF" />
                  ) : (
                    <ChevronDown size={20} color="#666" />
                  )}
                </TouchableOpacity>
                {expandedFAQ === index && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.sectionDescription}>
            Can't find what you're looking for? Send us a message and we'll get back to you within 24 hours.
          </Text>

          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={contactForm.name}
                onChangeText={(text) => setContactForm({ ...contactForm, name: text })}
                placeholder="Your name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={contactForm.email}
                onChangeText={(text) => setContactForm({ ...contactForm, email: text })}
                placeholder="your.email@example.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Subject</Text>
              <TextInput
                style={styles.input}
                value={contactForm.subject}
                onChangeText={(text) => setContactForm({ ...contactForm, subject: text })}
                placeholder="What can we help you with?"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={contactForm.message}
                onChangeText={(text) => setContactForm({ ...contactForm, message: text })}
                placeholder="Please describe your issue or question in detail..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmitContact}
              disabled={submitting}
            >
              <MessageCircle size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>
                {submitting ? 'Opening Email...' : 'Send Message'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Connect More Support</Text>
          <Text style={styles.footerText}>We're here to help you succeed</Text>
          <TouchableOpacity onPress={handleEmailContact} style={styles.footerEmailButton}>
            <Mail size={16} color="#007AFF" style={{ marginRight: 8 }} />
            <Text style={styles.footerEmailText}>support@connectmore.app</Text>
          </TouchableOpacity>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
              <Text style={styles.footerLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerSeparator}>•</Text>
            <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
              <Text style={styles.footerLinkText}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerCopyright}>© 2026 Connect More. All rights reserved.</Text>
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
    paddingBottom: 40,
  },
  welcomeSection: {
    padding: 32,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeDescription: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 16,
    justifyContent: 'center',
  },
  quickLinkCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    minWidth: 150,
    flex: 1,
    maxWidth: 200,
  },
  quickLinkTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 4,
  },
  quickLinkDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  faqList: {
    gap: 12,
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    padding: 20,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  faqAnswerText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#666',
  },
  form: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#f8f9fa',
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
  },
  footerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  footerEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerEmailText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  footerLinkText: {
    fontSize: 14,
    color: '#666',
  },
  footerSeparator: {
    fontSize: 14,
    color: '#ccc',
  },
  footerCopyright: {
    fontSize: 14,
    color: '#999',
  },
});

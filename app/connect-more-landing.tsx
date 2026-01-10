import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Users, TrendingUp, DollarSign, Network, Shield, Zap, ArrowRight, Mail } from 'lucide-react-native';

export default function ConnectMoreLanding() {
  const router = useRouter();

  const features = [
    {
      icon: Network,
      title: 'Build Your Network',
      description: 'Create powerful partnerships and grow your affiliate network with businesses across industries.',
    },
    {
      icon: DollarSign,
      title: 'Earn Commissions',
      description: 'Generate income through referrals with transparent commission tracking and automated payouts.',
    },
    {
      icon: TrendingUp,
      title: 'Track Performance',
      description: 'Monitor your leads, conversions, and earnings with real-time analytics and insights.',
    },
    {
      icon: Users,
      title: 'Multi-Level Referrals',
      description: 'Build an infinite downline and earn from your entire network with our unique compensation structure.',
    },
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Powered by Stripe for secure, reliable payment processing and instant payouts.',
    },
    {
      icon: Zap,
      title: 'Easy to Use',
      description: 'Intuitive interface designed for both businesses and affiliates to succeed together.',
    },
  ];

  const handleEmailContact = () => {
    Linking.openURL('mailto:support@connectmore.app');
  };

  const handleGetStarted = () => {
    router.push('/auth/signup');
  };

  const handleSupport = () => {
    router.push('/connect-more-support');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Connect More</Text>
          <Text style={styles.heroSubtitle}>
            The Ultimate Affiliate Marketing Platform
          </Text>
          <Text style={styles.heroDescription}>
            Empower your business with a powerful network of affiliates, or earn commissions by referring
            customers to trusted partners. Connect More makes affiliate marketing simple, transparent, and profitable.
          </Text>
          <View style={styles.ctaContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <ArrowRight size={20} color="#fff" style={styles.buttonIcon} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleSupport}>
              <Text style={styles.secondaryButtonText}>Learn More</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Built For Success</Text>
        <Text style={styles.sectionSubtitle}>
          Everything you need to grow your business through partnerships
        </Text>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <View key={index} style={styles.featureCard}>
                <View style={styles.iconContainer}>
                  <Icon size={32} color="#007AFF" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Trusted By Growing Businesses</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>$1M+</Text>
            <Text style={styles.statLabel}>Commissions Paid</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>500+</Text>
            <Text style={styles.statLabel}>Active Affiliates</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>100+</Text>
            <Text style={styles.statLabel}>Partner Companies</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.stepsContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Sign Up</Text>
              <Text style={styles.stepDescription}>
                Create your account as a business or affiliate in minutes.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Connect</Text>
              <Text style={styles.stepDescription}>
                Browse partnerships or invite affiliates to promote your products.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Earn & Grow</Text>
              <Text style={styles.stepDescription}>
                Track leads, earn commissions, and scale your network.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.ctaSection}>
        <Text style={styles.ctaSectionTitle}>Ready to Connect More?</Text>
        <Text style={styles.ctaSectionSubtitle}>
          Join thousands of businesses and affiliates growing together
        </Text>
        <TouchableOpacity style={styles.largePrimaryButton} onPress={handleGetStarted}>
          <Text style={styles.largePrimaryButtonText}>Get Started Free</Text>
          <ArrowRight size={24} color="#fff" style={styles.buttonIcon} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Connect More</Text>
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={handleSupport} style={styles.footerLink}>
            <Text style={styles.footerLinkText}>Support</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/privacy-policy')} style={styles.footerLink}>
            <Text style={styles.footerLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/terms-of-service')} style={styles.footerLink}>
            <Text style={styles.footerLinkText}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleEmailContact} style={styles.footerLink}>
          <Mail size={16} color="#666" style={{ marginRight: 4 }} />
          <Text style={styles.footerLinkText}>support@connectmore.app</Text>
        </TouchableOpacity>
        <Text style={styles.footerCopyright}>© 2026 Connect More. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  hero: {
    backgroundColor: '#f8f9fa',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 60,
    paddingHorizontal: 20,
  },
  heroContent: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: 18,
    lineHeight: 28,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  ctaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 48,
    textAlign: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    maxWidth: 1200,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  featureCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: Platform.OS === 'web' ? 'calc(33.333% - 16px)' : '100%',
    minWidth: 280,
    maxWidth: 360,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#e8f3ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  statsSection: {
    backgroundColor: '#007AFF',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    maxWidth: 1000,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  statCard: {
    alignItems: 'center',
    minWidth: 200,
  },
  statNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
  },
  stepsContainer: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  step: {
    flexDirection: 'row',
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  stepNumberText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  ctaSection: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 80,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  ctaSectionTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  ctaSectionSubtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  largePrimaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  largePrimaryButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 8,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  footerLinkText: {
    fontSize: 16,
    color: '#999',
  },
  footerCopyright: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
  },
});

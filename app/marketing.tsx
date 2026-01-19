import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, Users, TrendingUp, DollarSign, Zap, Globe, Shield } from 'lucide-react-native';

export default function MarketingPage() {
  const router = useRouter();

  const features = [
    {
      icon: Users,
      title: 'Partner Network',
      description: 'Connect companies with affiliates to expand reach and drive growth',
    },
    {
      icon: TrendingUp,
      title: 'Real-Time Analytics',
      description: 'Track performance, conversions, and revenue with comprehensive dashboards',
    },
    {
      icon: DollarSign,
      title: 'Automated Commissions',
      description: 'Set flexible commission structures with automated tracking and payouts',
    },
    {
      icon: Globe,
      title: 'Custom Landing Pages',
      description: 'Create branded landing pages for each affiliate partnership',
    },
    {
      icon: Zap,
      title: 'Instant Lead Tracking',
      description: 'Capture and manage leads from every affiliate link in real-time',
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description: 'Enterprise-grade security with built-in fraud protection',
    },
  ];


  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.headline}>
          The Complete Affiliate{'\n'}Marketing Platform
        </Text>

        <Text style={styles.subheadline}>
          Connect companies with affiliates. Track performance. Automate commissions.
          Grow your business with powerful partnership tools.
        </Text>

        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.trialText}>We only get paid if you get paid</Text>
      </View>

      <View style={styles.features}>
        <Text style={styles.sectionTitle}>Everything You Need to Scale</Text>
        <Text style={styles.sectionSubtitle}>
          Powerful features to manage affiliate partnerships and drive revenue
        </Text>

        <View style={styles.featuresGrid}>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <View key={index} style={styles.featureCard}>
                <View style={styles.iconCircle}>
                  <Icon size={28} color="#60A5FA" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Screenshots section - Add real app screenshots here
      <View style={styles.appPreview}>
        <Text style={styles.sectionTitle}>See It In Action</Text>
        <Text style={styles.sectionSubtitle}>
          Powerful tools designed for companies and affiliates
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.screenshotsContainer}
          style={styles.screenshotsScroll}
        >
          <Image
            source={require('../assets/images/screenshot-1.png')}
            style={styles.screenshot}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/screenshot-2.png')}
            style={styles.screenshot}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/screenshot-3.png')}
            style={styles.screenshot}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/screenshot-4.png')}
            style={styles.screenshot}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/screenshot-5.png')}
            style={styles.screenshot}
            resizeMode="contain"
          />
        </ScrollView>
      </View>
      */}

      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>We Only Get Paid If You Get Paid</Text>
        <Text style={styles.ctaSubtitle}>
          Performance-based pricing means we succeed when you succeed. No upfront costs, no hidden fees.
        </Text>
        <TouchableOpacity
          style={styles.ctaPrimaryButton}
          onPress={() => router.push('/auth/signup')}
        >
          <Text style={styles.ctaPrimaryButtonText}>Get Started</Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.footerDivider}>•</Text>
          <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerText}>© 2024 Connect More. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 80,
    paddingHorizontal: 20,
    backgroundColor: '#1A2942',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  headline: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 50,
  },
  subheadline: {
    fontSize: 18,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
    maxWidth: 600,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#60A5FA',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: '700',
  },
  trialText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  features: {
    paddingVertical: 80,
    paddingHorizontal: 20,
    backgroundColor: '#0F172A',
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 18,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 60,
    lineHeight: 26,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
  },
  featureCard: {
    minWidth: 280,
    maxWidth: 380,
    flex: Platform.OS === 'web' ? 1 : undefined,
    width: Platform.OS === 'web' ? undefined : '100%',
    backgroundColor: '#1E293B',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  featureDescription: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 24,
  },
  appPreview: {
    paddingVertical: 80,
    paddingHorizontal: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
  },
  screenshotsScroll: {
    width: '100%',
    maxWidth: 1400,
  },
  screenshotsContainer: {
    paddingHorizontal: 20,
    gap: 24,
    alignItems: 'center',
  },
  screenshot: {
    width: 280,
    height: 560,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cta: {
    paddingVertical: 80,
    paddingHorizontal: 20,
    backgroundColor: '#1A2942',
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaSubtitle: {
    fontSize: 18,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: 600,
    lineHeight: 28,
  },
  ctaPrimaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  footerLink: {
    fontSize: 14,
    color: '#60A5FA',
    textDecorationLine: 'underline',
  },
  footerDivider: {
    fontSize: 14,
    color: '#64748B',
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
  },
});

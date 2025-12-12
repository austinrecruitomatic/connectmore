import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, Check, Users, TrendingUp, DollarSign, Zap, Globe, Shield } from 'lucide-react-native';

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

  const plans = [
    {
      name: 'Starter',
      price: '49',
      description: 'Perfect for small businesses',
      features: [
        'Up to 10 affiliates',
        '5 products',
        'Basic analytics',
        'Email support',
        'Custom landing pages',
      ],
    },
    {
      name: 'Professional',
      price: '149',
      description: 'For growing companies',
      popular: true,
      features: [
        'Unlimited affiliates',
        'Unlimited products',
        'Advanced analytics',
        'Priority support',
        'Custom branding',
        'API access',
      ],
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For large organizations',
      features: [
        'Everything in Professional',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantee',
        'Advanced security',
        'White-label solution',
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoPlaceholder}>
          <View style={styles.logoGrid}>
            {Array.from({ length: 16 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.logoDot,
                  { backgroundColor: i % 2 === 0 ? '#60A5FA' : '#3B82F6' },
                ]}
              />
            ))}
          </View>
          <Text style={styles.logoText}>CONNECT{'\n'}MORE</Text>
        </View>

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
            <Text style={styles.primaryButtonText}>Start Free Trial</Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.trialText}>14-day free trial · No credit card required</Text>
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

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>10k+</Text>
          <Text style={styles.statLabel}>Active Partnerships</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>$2M+</Text>
          <Text style={styles.statLabel}>Commissions Paid</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>98%</Text>
          <Text style={styles.statLabel}>Satisfaction Rate</Text>
        </View>
      </View>

      <View style={styles.pricing}>
        <Text style={styles.sectionTitle}>Simple, Transparent Pricing</Text>
        <Text style={styles.sectionSubtitle}>
          Choose the plan that fits your business needs
        </Text>

        <View style={styles.plansGrid}>
          {plans.map((plan, index) => (
            <View
              key={index}
              style={[
                styles.planCard,
                plan.popular && styles.planCardPopular,
              ]}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}

              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.priceRow}>
                {plan.price !== 'Custom' && (
                  <Text style={styles.currency}>$</Text>
                )}
                <Text style={styles.price}>{plan.price}</Text>
                {plan.price !== 'Custom' && (
                  <Text style={styles.period}>/month</Text>
                )}
              </View>
              <Text style={styles.planDescription}>{plan.description}</Text>

              <TouchableOpacity
                style={[
                  styles.planButton,
                  plan.popular && styles.planButtonPopular,
                ]}
                onPress={() => router.push('/auth/signup')}
              >
                <Text
                  style={[
                    styles.planButtonText,
                    plan.popular && styles.planButtonTextPopular,
                  ]}
                >
                  Get Started
                </Text>
              </TouchableOpacity>

              <View style={styles.planFeatures}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.planFeatureRow}>
                    <Check size={18} color="#10B981" />
                    <Text style={styles.planFeatureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>Ready to Grow Your Business?</Text>
        <Text style={styles.ctaSubtitle}>
          Join thousands of companies already using Connect More to power their affiliate programs
        </Text>
        <TouchableOpacity
          style={styles.ctaPrimaryButton}
          onPress={() => router.push('/auth/signup')}
        >
          <Text style={styles.ctaPrimaryButtonText}>Start Your Free Trial</Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
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
  logoPlaceholder: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoGrid: {
    width: 120,
    height: 120,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#1E3A5F',
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
  },
  logoDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    margin: 2,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#60A5FA',
    textAlign: 'center',
    lineHeight: 28,
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
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    backgroundColor: '#1A2942',
    flexWrap: 'wrap',
    gap: 40,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 120,
  },
  statNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#60A5FA',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#334155',
  },
  pricing: {
    paddingVertical: 80,
    paddingHorizontal: 20,
    backgroundColor: '#0F172A',
  },
  plansGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
  },
  planCard: {
    minWidth: 300,
    maxWidth: 380,
    flex: Platform.OS === 'web' ? 1 : undefined,
    width: Platform.OS === 'web' ? undefined : '100%',
    backgroundColor: '#1E293B',
    padding: 32,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#334155',
    position: 'relative',
  },
  planCardPopular: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A5F',
    transform: [{ scale: 1.05 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  popularBadgeText: {
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 12,
    letterSpacing: 1,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  currency: {
    fontSize: 24,
    fontWeight: '700',
    color: '#60A5FA',
    marginTop: 8,
  },
  price: {
    fontSize: 56,
    fontWeight: '800',
    color: '#60A5FA',
    lineHeight: 64,
  },
  period: {
    fontSize: 18,
    color: '#94A3B8',
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  planDescription: {
    fontSize: 15,
    color: '#94A3B8',
    marginBottom: 24,
  },
  planButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#60A5FA',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 32,
  },
  planButtonPopular: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  planButtonText: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: '700',
  },
  planButtonTextPopular: {
    color: '#FFFFFF',
  },
  planFeatures: {
    gap: 16,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planFeatureText: {
    fontSize: 15,
    color: '#CBD5E1',
    flex: 1,
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
  footerText: {
    fontSize: 14,
    color: '#64748B',
  },
});

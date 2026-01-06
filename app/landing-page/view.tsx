import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import BackButton from '@/components/BackButton';

type LandingPageData = {
  id: string;
  title: string;
  content: {
    headline: string;
    description: string;
    buttonText: string;
    buttonUrl: string;
    affiliateCode: string;
  };
  partnership_id: string;
  views: number;
};

export default function ViewLandingPageScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const [page, setPage] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPage();
  }, [slug]);

  const loadPage = async () => {
    if (!slug) return;

    const { data } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (data) {
      setPage(data);
      trackView(data.id);
      incrementViewCount(data.id);
    }

    setLoading(false);
  };

  const trackView = async (landingPageId: string) => {
    if (!page?.partnership_id) return;

    await supabase.from('leads').insert({
      landing_page_id: landingPageId,
      partnership_id: page.partnership_id,
      lead_type: 'click',
      ip_address: 'unknown',
      user_agent: 'mobile-app',
    });
  };

  const incrementViewCount = async (landingPageId: string) => {
    const { data: currentPage } = await supabase
      .from('landing_pages')
      .select('views')
      .eq('id', landingPageId)
      .maybeSingle();

    if (currentPage) {
      await supabase
        .from('landing_pages')
        .update({ views: (currentPage.views || 0) + 1 })
        .eq('id', landingPageId);
    }
  };

  const handleButtonClick = async () => {
    if (!page?.content.buttonUrl || !page.id) return;

    await supabase.from('leads').insert({
      landing_page_id: page.id,
      partnership_id: page.partnership_id,
      lead_type: 'conversion',
      ip_address: 'unknown',
      user_agent: 'mobile-app',
    });

    const url = page.content.buttonUrl;
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!page) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <BackButton color="#007AFF" style={styles.backButton} />
          <Text style={styles.headerTitle}>Landing Page</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Page Not Found</Text>
          <Text style={styles.errorSubtitle}>This landing page does not exist or is not published</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton color="#007AFF" style={styles.backButton} />
        <Text style={styles.headerTitle}>{page.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.headline}>{page.content.headline}</Text>
          {page.content.description && (
            <Text style={styles.description}>{page.content.description}</Text>
          )}
        </View>

        <View style={styles.ctaSection}>
          <TouchableOpacity style={styles.ctaButton} onPress={handleButtonClick}>
            <Text style={styles.ctaButtonText}>{page.content.buttonText}</Text>
          </TouchableOpacity>

          <View style={styles.trustBadge}>
            <Text style={styles.trustText}>Affiliate Code: {page.content.affiliateCode}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Views: {page.views}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    padding: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  headline: {
    fontSize: 36,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 44,
  },
  description: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 24,
  },
  ctaSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  ctaButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  trustBadge: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  trustText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

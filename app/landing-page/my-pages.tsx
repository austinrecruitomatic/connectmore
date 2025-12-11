import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Eye, ExternalLink, Trash2, ArrowLeft } from 'lucide-react-native';

type LandingPage = {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  views: number;
  created_at: string;
  affiliate_partnerships: {
    products: {
      name: string;
    };
  };
};

export default function MyPagesScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    if (!profile?.id) return;

    setLoading(true);
    const { data } = await supabase
      .from('landing_pages')
      .select('*, affiliate_partnerships(*, products(name))')
      .eq('affiliate_id', profile.id)
      .order('created_at', { ascending: false });

    setPages(data || []);
    setLoading(false);
  };

  const handleShare = async (slug: string, title: string) => {
    try {
      const baseUrl = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : 'https://yoursite.com';
      await Share.share({
        message: `Check out my landing page: ${title}\n${baseUrl}/lp/${slug}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    Alert.alert('Delete Landing Page', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('landing_pages').delete().eq('id', id);

          if (!error) {
            loadPages();
          }
        },
      },
    ]);
  };

  const renderPage = ({ item }: { item: LandingPage }) => (
    <View style={styles.pageCard}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderLeft}>
          <Text style={styles.pageTitle}>{item.title}</Text>
          <Text style={styles.pageProduct}>
            {item.affiliate_partnerships?.products?.name || 'Unknown Product'}
          </Text>
        </View>
        <View style={[styles.statusBadge, !item.is_published && styles.statusBadgeDraft]}>
          <Text style={styles.statusText}>{item.is_published ? 'Published' : 'Draft'}</Text>
        </View>
      </View>

      <View style={styles.pageStats}>
        <View style={styles.statItem}>
          <Eye size={16} color="#666" />
          <Text style={styles.statText}>{item.views} views</Text>
        </View>
        <Text style={styles.slug}>/{item.slug}</Text>
      </View>

      <View style={styles.pageActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            router.push({
              pathname: '/landing-page/view',
              params: { slug: item.slug },
            })
          }
        >
          <ExternalLink size={18} color="#007AFF" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleShare(item.slug, item.title)}
        >
          <ExternalLink size={18} color="#007AFF" />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id, item.title)}
        >
          <Trash2 size={18} color="#ff3b30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Landing Pages</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={pages}
        renderItem={renderPage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPages} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No landing pages yet</Text>
            <Text style={styles.emptySubtitle}>
              Create landing pages for your approved partnerships
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  listContent: {
    padding: 16,
  },
  pageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pageHeaderLeft: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  pageProduct: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeDraft: {
    backgroundColor: '#ff9800',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  pageStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  slug: {
    fontSize: 12,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  pageActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 6,
  },
  deleteButton: {
    flex: 0,
    paddingHorizontal: 12,
    borderColor: '#ff3b30',
  },
  actionButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

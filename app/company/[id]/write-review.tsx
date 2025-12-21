import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Star } from 'lucide-react-native';

export default function WriteReviewScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  useEffect(() => {
    checkReviewEligibility();
  }, [id, profile]);

  const checkReviewEligibility = async () => {
    if (!profile || !id) {
      setCheckingEligibility(false);
      return;
    }

    try {
      const { data: partnerships } = await supabase
        .from('affiliate_partnerships')
        .select('id, status, product_id')
        .eq('affiliate_id', profile.id)
        .eq('company_id', id);

      if (partnerships && partnerships.length > 0) {
        const approvedPartnerships = partnerships.filter(p => p.status === 'approved');

        if (approvedPartnerships.length > 0) {
          setCanReview(true);
          setCheckingEligibility(false);
          return;
        }

        const partnershipIds = partnerships.map(p => p.id);
        const { count } = await supabase
          .from('contact_submissions')
          .select('*', { count: 'exact', head: true })
          .in('partnership_id', partnershipIds);

        const hasLeads = (count ?? 0) > 0;
        setCanReview(hasLeads);

        if (!hasLeads) {
          const message = 'You must send at least one person to this company before writing a review.';
          if (Platform.OS === 'web') {
            alert(message);
          } else {
            Alert.alert('Not Eligible', message);
          }
          router.back();
        }
      } else {
        const message = 'You must have a partnership with this company or send them leads to write a review.';
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert('Not Eligible', message);
        }
        router.back();
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      router.back();
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      const message = 'Please select a rating';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
      return;
    }

    if (!title.trim()) {
      const message = 'Please enter a review title';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
      return;
    }

    if (!profile) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('company_reviews')
        .insert({
          company_id: id,
          reviewer_id: profile.id,
          rating,
          title: title.trim(),
          comment: comment.trim()
        });

      if (error) throw error;

      if (Platform.OS === 'web') {
        alert('Review submitted successfully!');
      } else {
        Alert.alert('Success', 'Review submitted successfully!');
      }

      router.back();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      const message = error.message || 'Failed to submit review';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingEligibility) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Checking eligibility...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Write a Review</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.label}>Rating *</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Star
                  size={40}
                  color="#F59E0B"
                  fill={star <= rating ? '#F59E0B' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Review Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Sum up your experience"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            placeholderTextColor="#64748B"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Your Review</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Share your experience working with this company..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            placeholderTextColor="#64748B"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

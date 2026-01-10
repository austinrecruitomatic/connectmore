import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FileText, X, Check } from 'lucide-react-native';
import { useState } from 'react';

type Contract = {
  id: string;
  title: string;
  content: string;
};

type Props = {
  visible: boolean;
  contract: Contract | null;
  companyName: string;
  onAccept: () => Promise<void>;
  onDecline: () => void;
};

export default function ContractAcceptanceModal({
  visible,
  contract,
  companyName,
  onAccept,
  onDecline,
}: Props) {
  const [accepting, setAccepting] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAccept();
    } finally {
      setAccepting(false);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (isCloseToBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  if (!contract) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDecline}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <FileText size={24} color="#fff" />
            <Text style={styles.headerTitle}>Partnership Agreement</Text>
          </View>
          <TouchableOpacity onPress={onDecline} style={styles.closeButton}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.companySection}>
          <Text style={styles.companyLabel}>Partnership with</Text>
          <Text style={styles.companyName}>{companyName}</Text>
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          onScroll={handleScroll}
          scrollEventThrottle={400}
        >
          <View style={styles.contractCard}>
            <Text style={styles.contractTitle}>{contract.title}</Text>
            <Text style={styles.contractContent}>{contract.content}</Text>
          </View>

          {!hasScrolledToBottom && (
            <View style={styles.scrollHint}>
              <Text style={styles.scrollHintText}>Scroll to read the full contract</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By accepting, you agree to the terms and conditions outlined in this partnership
            agreement.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={onDecline}
              disabled={accepting}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.acceptButton,
                !hasScrolledToBottom && styles.acceptButtonDisabled,
              ]}
              onPress={handleAccept}
              disabled={!hasScrolledToBottom || accepting}
            >
              {accepting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check size={20} color="#fff" />
                  <Text style={styles.acceptButtonText}>Accept & Continue</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  companySection: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  companyLabel: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  contractCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contractTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  contractContent: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  scrollHint: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  scrollHintText: {
    fontSize: 14,
    color: '#854D0E',
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

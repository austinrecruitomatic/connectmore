import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

interface BackButtonProps {
  color?: string;
  size?: number;
  style?: ViewStyle;
  onPress?: () => void;
}

export default function BackButton({
  color = '#FFFFFF',
  size = 24,
  style,
  onPress
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.backButton, style]}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      activeOpacity={0.7}
    >
      <ArrowLeft size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    padding: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

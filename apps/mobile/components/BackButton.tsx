import { TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';

type BackButtonProps = {
  label?: string;
  onPress?: () => void;
};

export default function BackButton({ label = 'Back', onPress }: BackButtonProps) {
  const router = useRouter();

  function handlePress() {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  }

  return (
    <TouchableOpacity
      className="flex-row items-center self-start py-2 pr-3"
      onPress={handlePress}
      activeOpacity={0.6}
    >
      <Ionicons name="chevron-back" size={20} color={colors.accent} />
      <Text className="text-sm font-medium text-accent ml-0.5">{label}</Text>
    </TouchableOpacity>
  );
}

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  PLAYER_TYPES,
  BATTING_HANDS,
  BOWLING_TYPES,
  PLAYER_TYPE_LABELS,
  BATTING_HAND_LABELS,
  BOWLING_TYPE_LABELS,
} from '@cricket/shared';
import { apiFetch } from '../../../../../lib/api';
import { useClub } from '../../../../../lib/club-context';
import { colors } from '../../../../../lib/theme';
import BackButton from '../../../../../components/BackButton';

export default function JoinClubScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const { refresh } = useClub();

  const [club, setClub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [playerType, setPlayerType] = useState<string | null>(null);
  const [battingHand, setBattingHand] = useState<string | null>(null);
  const [bowlingType, setBowlingType] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId) return;
    apiFetch(`/clubs/${clubId}`)
      .then((data) => setClub(data))
      .catch(() => setClub(null))
      .finally(() => setLoading(false));
  }, [clubId]);

  async function handleJoin() {
    setSubmitting(true);
    try {
      await apiFetch(`/clubs/${clubId}/join`, {
        method: 'POST',
        body: JSON.stringify({
          player_type: playerType || undefined,
          batting_hand: battingHand || undefined,
          bowling_type: bowlingType || undefined,
        }),
      });
      await refresh();
      router.replace('/(app)/(tabs)/home');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join club');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <BackButton />

        <Text className="text-2xl font-bold text-ink mt-2">Join Club</Text>
        <Text className="text-base text-ink-soft mt-1 mb-6">
          {club?.name || 'this club'}
        </Text>

        <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2 ml-1">
          Your Cricket Profile (optional)
        </Text>
        <View className="bg-card border border-rule rounded-xl p-4 mb-5">
          <Text className="text-sm font-semibold text-ink mb-2">Player Type</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {PLAYER_TYPES.map((t) => {
              const selected = playerType === t;
              return (
                <TouchableOpacity
                  key={t}
                  className={`px-3 py-2 rounded-lg border ${
                    selected ? 'bg-accent-soft border-accent-rule' : 'bg-base border-rule'
                  }`}
                  onPress={() => setPlayerType(selected ? null : t)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selected ? 'text-accent-ink' : 'text-ink-soft'
                    }`}
                  >
                    {PLAYER_TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="text-sm font-semibold text-ink mb-2">Batting Hand</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {BATTING_HANDS.map((t) => {
              const selected = battingHand === t;
              return (
                <TouchableOpacity
                  key={t}
                  className={`px-3 py-2 rounded-lg border ${
                    selected ? 'bg-accent-soft border-accent-rule' : 'bg-base border-rule'
                  }`}
                  onPress={() => setBattingHand(selected ? null : t)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selected ? 'text-accent-ink' : 'text-ink-soft'
                    }`}
                  >
                    {BATTING_HAND_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="text-sm font-semibold text-ink mb-2">Bowling Type</Text>
          <View className="flex-row flex-wrap gap-2">
            {BOWLING_TYPES.map((t) => {
              const selected = bowlingType === t;
              return (
                <TouchableOpacity
                  key={t}
                  className={`px-3 py-2 rounded-lg border ${
                    selected ? 'bg-accent-soft border-accent-rule' : 'bg-base border-rule'
                  }`}
                  onPress={() => setBowlingType(selected ? null : t)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selected ? 'text-accent-ink' : 'text-ink-soft'
                    }`}
                  >
                    {BOWLING_TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          className="bg-accent rounded-xl items-center justify-center"
          style={{ height: 50 }}
          onPress={handleJoin}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-white text-base font-semibold">Join Club</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

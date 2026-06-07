import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../../../../../lib/api';
import { useClub } from '../../../../../lib/club-context';
import { colors } from '../../../../../lib/theme';
import BackButton from '../../../../../components/BackButton';

type TeamDetail = {
  id: string;
  name: string;
  year: { id: string; year: number; label: string | null };
  members: {
    user_id: string;
    is_captain: boolean;
    profile: { first_name: string | null; last_name: string | null } | null;
  }[];
};

type Game = {
  id: string;
  opponent: string;
  location: string | null;
  game_date: string;
  game_time: string | null;
  selection_count: number;
};

function formatGameDate(dateStr: string, timeStr: string | null): string {
  const d = new Date(dateStr + 'T00:00:00');
  const datePart = isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return timeStr ? `${datePart} · ${timeStr}` : datePart;
}

export default function TeamDetailScreen() {
  const { clubId, teamId } = useLocalSearchParams<{ clubId: string; teamId: string }>();
  const router = useRouter();
  const { isAdmin } = useClub();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add game modal
  const [showAddGame, setShowAddGame] = useState(false);
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [gameTime, setGameTime] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!clubId || !teamId) return;
    try {
      const [teamData, gamesData] = await Promise.all([
        apiFetch(`/clubs/${clubId}/teams/${teamId}`),
        apiFetch(`/clubs/${clubId}/teams/${teamId}/games`),
      ]);
      setTeam(teamData);
      setGames(gamesData || []);
    } catch {
      setTeam(null);
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [clubId, teamId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleAddGame() {
    if (!opponent.trim()) {
      Alert.alert('Opponent required', 'Enter the opponent name.');
      return;
    }
    if (!gameDate.trim()) {
      Alert.alert('Date required', 'Enter the game date as YYYY-MM-DD.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/clubs/${clubId}/teams/${teamId}/games`, {
        method: 'POST',
        body: JSON.stringify({
          opponent: opponent.trim(),
          location: location.trim() || undefined,
          game_date: gameDate.trim(),
          game_time: gameTime.trim() || undefined,
        }),
      });
      setShowAddGame(false);
      setOpponent('');
      setLocation('');
      setGameDate('');
      setGameTime('');
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add game');
    } finally {
      setSaving(false);
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
      {/* Add Game Modal */}
      <Modal visible={showAddGame} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowAddGame(false)}
        >
          <Pressable className="bg-card rounded-t-2xl px-5 pt-5 pb-10" onPress={() => {}}>
            <Text className="text-lg font-bold text-ink mb-4">Add Game</Text>

            <Text className="text-sm font-semibold text-ink mb-1">Opponent</Text>
            <TextInput
              className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base mb-3"
              value={opponent}
              onChangeText={setOpponent}
              placeholder="Riverside CC"
              placeholderTextColor={colors.inkMuted}
            />

            <Text className="text-sm font-semibold text-ink mb-1">Location (optional)</Text>
            <TextInput
              className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base mb-3"
              value={location}
              onChangeText={setLocation}
              placeholder="Home ground"
              placeholderTextColor={colors.inkMuted}
            />

            <Text className="text-sm font-semibold text-ink mb-1">Date</Text>
            <TextInput
              className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base mb-3"
              value={gameDate}
              onChangeText={setGameDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.inkMuted}
              autoCapitalize="none"
            />

            <Text className="text-sm font-semibold text-ink mb-1">Time (optional)</Text>
            <TextInput
              className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base mb-4"
              value={gameTime}
              onChangeText={setGameTime}
              placeholder="HH:MM (24h)"
              placeholderTextColor={colors.inkMuted}
              autoCapitalize="none"
            />

            <TouchableOpacity
              className="bg-accent rounded-lg py-3 items-center"
              onPress={handleAddGame}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white text-sm font-semibold">Add Game</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        <BackButton />

        {/* Header */}
        <Text className="text-2xl font-bold text-ink mt-2">{team?.name}</Text>
        {team?.year ? (
          <View className="flex-row items-center mt-1 mb-5">
            <Ionicons name="calendar-outline" size={14} color={colors.inkMuted} />
            <Text className="text-sm text-ink-muted ml-1">
              {team.year.label || team.year.year}
            </Text>
          </View>
        ) : (
          <View className="mb-5" />
        )}

        {/* Roster */}
        <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2 ml-1">
          Roster
        </Text>
        <View className="bg-card border border-rule rounded-xl p-4 mb-5">
          {!team?.members || team.members.length === 0 ? (
            <View className="items-center py-3">
              <Text className="text-sm text-ink-muted">No players assigned yet</Text>
            </View>
          ) : (
            team.members.map((m, idx) => (
              <View
                key={m.user_id}
                className={`flex-row items-center ${
                  idx < team.members.length - 1 ? 'mb-3 pb-3 border-b border-rule' : ''
                }`}
              >
                <View className="w-8 h-8 rounded-full bg-soft border border-rule items-center justify-center mr-3">
                  <Text className="text-[10px] font-bold text-ink-soft">
                    {`${(m.profile?.first_name?.[0] || '').toUpperCase()}${(m.profile?.last_name?.[0] || '').toUpperCase()}` || '—'}
                  </Text>
                </View>
                <Text className="text-sm font-medium text-ink flex-1" numberOfLines={1}>
                  {m.profile?.first_name} {m.profile?.last_name}
                </Text>
                {m.is_captain && (
                  <View className="bg-accent-soft px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-accent-ink">CAPTAIN</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Games */}
        <View className="flex-row items-center justify-between mb-2 ml-1">
          <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Games
          </Text>
          {isAdmin && (
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => setShowAddGame(true)}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.accent} />
              <Text className="text-xs font-semibold text-accent ml-0.5">Add Game</Text>
            </TouchableOpacity>
          )}
        </View>

        {games.length === 0 ? (
          <View className="bg-card border border-rule rounded-xl p-5 items-center">
            <Ionicons name="baseball-outline" size={28} color={colors.inkFaint} />
            <Text className="text-sm text-ink-muted mt-2">No games scheduled</Text>
            {isAdmin && (
              <TouchableOpacity
                className="mt-3 bg-accent rounded-lg px-4 py-2"
                onPress={() => setShowAddGame(true)}
              >
                <Text className="text-white text-sm font-semibold">Add First Game</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          games.map((g) => (
            <TouchableOpacity
              key={g.id}
              activeOpacity={0.7}
              onPress={() => router.push(`/(app)/club/${clubId}/game/${g.id}` as any)}
              className="bg-card border border-rule rounded-xl p-4 mb-3"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-base font-bold text-ink" numberOfLines={1}>
                    vs {g.opponent}
                  </Text>
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="calendar-outline" size={13} color={colors.inkMuted} />
                    <Text className="text-xs text-ink-muted ml-1">
                      {formatGameDate(g.game_date, g.game_time)}
                    </Text>
                  </View>
                  {g.location ? (
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="location-outline" size={13} color={colors.inkMuted} />
                      <Text className="text-xs text-ink-muted ml-1" numberOfLines={1}>
                        {g.location}
                      </Text>
                    </View>
                  ) : null}
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="people-outline" size={13} color={colors.inkMuted} />
                    <Text className="text-xs text-ink-muted ml-1">
                      {g.selection_count} selected
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

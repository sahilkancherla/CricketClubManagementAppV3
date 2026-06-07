import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../../../../../lib/api';
import { useClub } from '../../../../../lib/club-context';
import { colors } from '../../../../../lib/theme';
import BackButton from '../../../../../components/BackButton';

type Profile = { first_name: string | null; last_name: string | null } | null;

type GameDetail = {
  id: string;
  opponent: string;
  location: string | null;
  game_date: string;
  game_time: string | null;
  team: { id: string; name: string };
  selection: { user_id: string; batting_order: number; profile: Profile }[];
};

type RosterMember = {
  user_id: string;
  is_captain: boolean;
  profile: Profile;
};

function fullName(p: Profile): string {
  if (!p) return 'Unknown';
  return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown';
}

function formatGameDate(dateStr: string, timeStr: string | null): string {
  const d = new Date(dateStr + 'T00:00:00');
  const datePart = isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return timeStr ? `${datePart} at ${timeStr}` : datePart;
}

export default function GameDetailScreen() {
  const { clubId, gameId } = useLocalSearchParams<{ clubId: string; gameId: string }>();
  const { isAdmin } = useClub();

  const [game, setGame] = useState<GameDetail | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selection editor (admin)
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savingSelection, setSavingSelection] = useState(false);

  const loadGame = useCallback(async () => {
    if (!clubId || !gameId) return;
    try {
      const gameData: GameDetail = await apiFetch(`/clubs/${clubId}/games/${gameId}`);
      setGame(gameData);
      // Pre-fill selection editor order
      const ordered = [...(gameData.selection || [])].sort(
        (a, b) => a.batting_order - b.batting_order
      );
      setSelectedIds(ordered.map((s) => s.user_id));

      // Load roster for selection editing
      if (gameData.team?.id) {
        try {
          const teamData = await apiFetch(`/clubs/${clubId}/teams/${gameData.team.id}`);
          setRoster(teamData?.members || []);
        } catch {
          setRoster([]);
        }
      }
    } catch {
      setGame(null);
    } finally {
      setLoading(false);
    }
  }, [clubId, gameId]);

  useFocusEffect(
    useCallback(() => {
      loadGame();
    }, [loadGame])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadGame();
    setRefreshing(false);
  }

  function togglePlayer(userId: string) {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleSaveSelection() {
    setSavingSelection(true);
    try {
      await apiFetch(`/clubs/${clubId}/games/${gameId}/selection`, {
        method: 'PUT',
        body: JSON.stringify({ user_ids: selectedIds }),
      });
      setEditing(false);
      await loadGame();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save selection');
    } finally {
      setSavingSelection(false);
    }
  }

  function buildWhatsAppMessage(): string {
    if (!game) return '';
    const ordered = [...(game.selection || [])].sort(
      (a, b) => a.batting_order - b.batting_order
    );
    const lines: string[] = [];
    lines.push(`🏏 ${game.team?.name} vs ${game.opponent}`);
    lines.push(`📅 ${formatGameDate(game.game_date, game.game_time)}`);
    if (game.location) lines.push(`📍 ${game.location}`);
    lines.push('');
    lines.push('Playing XI:');
    if (ordered.length === 0) {
      lines.push('(selection not set)');
    } else {
      ordered.forEach((s, i) => {
        lines.push(`${i + 1}. ${fullName(s.profile)}`);
      });
    }
    return lines.join('\n');
  }

  async function handleShare() {
    try {
      await Share.share({ message: buildWhatsAppMessage() });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to share');
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

  if (!game) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <View className="px-5">
          <BackButton />
        </View>
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-base text-ink-muted">Game not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const orderedSelection = [...(game.selection || [])].sort(
    (a, b) => a.batting_order - b.batting_order
  );

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
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
        <Text className="text-2xl font-bold text-ink mt-2">
          {game.team?.name} vs {game.opponent}
        </Text>
        <View className="flex-row items-center mt-2">
          <Ionicons name="calendar-outline" size={14} color={colors.inkMuted} />
          <Text className="text-sm text-ink-muted ml-1">
            {formatGameDate(game.game_date, game.game_time)}
          </Text>
        </View>
        {game.location ? (
          <View className="flex-row items-center mt-1 mb-5">
            <Ionicons name="location-outline" size={14} color={colors.inkMuted} />
            <Text className="text-sm text-ink-muted ml-1">{game.location}</Text>
          </View>
        ) : (
          <View className="mb-5" />
        )}

        {/* WhatsApp share */}
        <TouchableOpacity
          className="flex-row items-center justify-center bg-accent rounded-xl py-3 mb-5"
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
          <Text className="text-white text-sm font-semibold ml-2">Share to WhatsApp</Text>
        </TouchableOpacity>

        {/* Selection */}
        <View className="flex-row items-center justify-between mb-2 ml-1">
          <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Playing XI
          </Text>
          {isAdmin && !editing && (
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => setEditing(true)}
            >
              <Ionicons name="create-outline" size={16} color={colors.accent} />
              <Text className="text-xs font-semibold text-accent ml-0.5">Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <View className="bg-card border border-rule rounded-xl p-4 mb-5">
            <Text className="text-sm text-ink-muted mb-3">
              Tap players to add or remove. Order of selection sets the batting order.
            </Text>
            {roster.length === 0 ? (
              <Text className="text-sm text-ink-muted py-2">No players on this team's roster.</Text>
            ) : (
              roster.map((m) => {
                const idx = selectedIds.indexOf(m.user_id);
                const selected = idx >= 0;
                return (
                  <TouchableOpacity
                    key={m.user_id}
                    className={`flex-row items-center p-3 rounded-lg mb-2 border ${
                      selected ? 'bg-accent-soft border-accent-rule' : 'bg-base border-rule'
                    }`}
                    onPress={() => togglePlayer(m.user_id)}
                    activeOpacity={0.7}
                  >
                    <View
                      className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
                        selected ? 'bg-accent' : 'bg-soft border border-rule'
                      }`}
                    >
                      {selected ? (
                        <Text className="text-[11px] font-bold text-white">{idx + 1}</Text>
                      ) : (
                        <Ionicons name="add" size={14} color={colors.inkMuted} />
                      )}
                    </View>
                    <Text
                      className={`text-sm font-medium flex-1 ${
                        selected ? 'text-accent-ink' : 'text-ink'
                      }`}
                    >
                      {fullName(m.profile)}
                    </Text>
                    {m.is_captain && (
                      <Text className="text-[10px] font-bold text-ink-muted">C</Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )}

            <View className="flex-row gap-2 mt-2">
              <TouchableOpacity
                className="flex-1 border border-rule rounded-lg py-3 items-center"
                onPress={() => {
                  setEditing(false);
                  const ordered = [...(game.selection || [])].sort(
                    (a, b) => a.batting_order - b.batting_order
                  );
                  setSelectedIds(ordered.map((s) => s.user_id));
                }}
              >
                <Text className="text-ink-soft text-sm font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-accent rounded-lg py-3 items-center"
                onPress={handleSaveSelection}
                disabled={savingSelection}
              >
                {savingSelection ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white text-sm font-semibold">Save Selection</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="bg-card border border-rule rounded-xl p-4 mb-5">
            {orderedSelection.length === 0 ? (
              <View className="items-center py-3">
                <Text className="text-sm text-ink-muted">No players selected yet</Text>
              </View>
            ) : (
              orderedSelection.map((s, idx) => (
                <View
                  key={s.user_id}
                  className={`flex-row items-center ${
                    idx < orderedSelection.length - 1 ? 'mb-3 pb-3 border-b border-rule' : ''
                  }`}
                >
                  <View className="w-7 h-7 rounded-full bg-accent-soft items-center justify-center mr-3">
                    <Text className="text-xs font-bold text-accent-ink">{idx + 1}</Text>
                  </View>
                  <Text className="text-sm font-medium text-ink flex-1" numberOfLines={1}>
                    {fullName(s.profile)}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

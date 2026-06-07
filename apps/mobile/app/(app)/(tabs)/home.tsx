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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../../../lib/api';
import { useClub } from '../../../lib/club-context';
import { colors } from '../../../lib/theme';

type Year = { id: string; year: number; label: string | null; is_active: boolean };

type Team = {
  id: string;
  name: string;
  description: string | null;
  year: { id: string; year: number; label: string | null };
  member_count: number;
};

export default function HomeScreen() {
  const { clubs, activeClub, setActiveClubId, loading: clubLoading, refresh, isAdmin } = useClub();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Seasons & teams state
  const [years, setYears] = useState<Year[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Join club state
  const [showJoin, setShowJoin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const clubId = activeClub?.club_id;

  const loadData = useCallback(async () => {
    if (!clubId) return;
    setLoadingTeams(true);
    try {
      const yearsData: Year[] = (await apiFetch(`/clubs/${clubId}/years`)) || [];
      const sortedYears = [...yearsData].sort((a, b) => b.year - a.year);
      setYears(sortedYears);

      const current = sortedYears.find((y) => y.is_active) || sortedYears[0];
      if (current) {
        const teamsData: Team[] =
          (await apiFetch(`/clubs/${clubId}/teams?year_id=${current.id}`)) || [];
        setTeams(teamsData);
      } else {
        setTeams([]);
      }
    } catch {
      setYears([]);
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  }, [clubId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      loadData();
    }, [loadData])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    await loadData();
    setRefreshing(false);
  }

  async function handleSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults(null);
    try {
      const results = await apiFetch(`/clubs/search?q=${encodeURIComponent(q)}`);
      const list = Array.isArray(results) ? results : [];
      setSearchResults(list);
      if (list.length === 0) {
        setSearchError('No clubs found. Check the name and try again.');
      }
    } catch (err: any) {
      setSearchError(err?.message || 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  function selectClubToJoin(club: any) {
    setShowJoin(false);
    setSearchQuery('');
    setSearchResults(null);
    setSearchError(null);
    router.push(`/(app)/club/${club.id}/join` as any);
  }

  const currentYear = years.find((y) => y.is_active) || years[0];

  // No clubs — empty state
  if (!clubLoading && clubs.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
        >
          <Text className="text-2xl font-bold text-ink mb-2">Welcome</Text>
          <Text className="text-base text-ink-soft mb-6">
            You haven't joined any clubs yet. Search for a club to get started.
          </Text>

          <View className="bg-card border border-rule rounded-xl p-5">
            <Text className="text-sm font-semibold text-ink mb-3">Join a Club</Text>
            <Text className="text-sm text-ink-muted mb-3">Search for a club by name</Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base"
                placeholder="Club name"
                placeholderTextColor={colors.inkMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity
                className="bg-accent rounded-lg px-4 justify-center"
                onPress={handleSearch}
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="search" size={18} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>

            {searchError && (
              <View className="mt-3 bg-danger-soft rounded-lg px-3 py-2.5">
                <Text className="text-danger text-sm">{searchError}</Text>
              </View>
            )}

            {searchResults && searchResults.length > 0 && (
              <View className="mt-3">
                {searchResults.map((club: any) => (
                  <TouchableOpacity
                    key={club.id}
                    className="flex-row items-center justify-between border border-rule rounded-lg px-3 py-3 mb-2 bg-base"
                    onPress={() => selectClubToJoin(club)}
                  >
                    <Text className="text-base font-semibold text-ink flex-shrink" numberOfLines={1}>
                      {club.name}
                    </Text>
                    <View className="flex-row items-center ml-2">
                      <Text className="text-sm font-medium text-accent mr-1">Join</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View className="mt-4 pt-4 border-t border-rule">
              <Text className="text-xs text-ink-muted leading-5">
                Want to start your own club? Create one from the web app — you'll
                become its admin automatically.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (clubLoading) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const hasMultipleClubs = clubs.length > 1;

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      {/* Club Switcher Modal */}
      <Modal visible={showSwitcher} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowSwitcher(false)}
        >
          <Pressable className="bg-card rounded-t-2xl px-5 pt-5 pb-10" onPress={() => {}}>
            <Text className="text-lg font-bold text-ink mb-4">Switch Club</Text>
            {clubs.map((c) => {
              const isActive = c.club_id === activeClub?.club_id;
              return (
                <TouchableOpacity
                  key={c.club_id}
                  className={`flex-row items-center p-3 rounded-xl mb-2 ${
                    isActive ? 'bg-accent-soft' : 'bg-base'
                  }`}
                  onPress={() => {
                    setActiveClubId(c.club_id);
                    setShowSwitcher(false);
                  }}
                >
                  <View className="flex-1">
                    <Text
                      className={`text-base font-semibold ${
                        isActive ? 'text-accent-ink' : 'text-ink'
                      }`}
                    >
                      {c.club.name}
                    </Text>
                    <Text className="text-xs text-ink-muted capitalize mt-0.5">
                      {c.roles.join(', ')}
                    </Text>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        {/* Header */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              className="flex-row items-center flex-shrink"
              onPress={() => hasMultipleClubs && setShowSwitcher(true)}
              activeOpacity={hasMultipleClubs ? 0.6 : 1}
            >
              <Text className="text-2xl font-bold text-ink" numberOfLines={1}>
                {activeClub?.club.name}
              </Text>
              {hasMultipleClubs && (
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={colors.inkSoft}
                  style={{ marginLeft: 4, marginTop: 2 }}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="ml-3"
              onPress={() => {
                setShowJoin(!showJoin);
                setSearchResults(null);
                setSearchError(null);
                setSearchQuery('');
              }}
            >
              <Ionicons
                name={showJoin ? 'close-circle-outline' : 'add-circle-outline'}
                size={26}
                color={colors.accent}
              />
            </TouchableOpacity>
          </View>

          {/* Role pills */}
          {activeClub && (
            <View className="flex-row flex-wrap gap-1.5 mt-2">
              {activeClub.roles.map((role) => (
                <View key={role} className="bg-accent-soft px-2.5 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-accent-ink capitalize">
                    {role}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Join Club Search (inline) */}
        {showJoin && (
          <View className="bg-card border border-rule rounded-xl p-4 mb-5">
            <Text className="text-sm text-ink-muted mb-2">Search for a club by name</Text>
            <View className="flex-row gap-2">
              <TextInput
                className="flex-1 border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base"
                placeholder="Club name"
                placeholderTextColor={colors.inkMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity
                className="bg-accent rounded-lg px-4 justify-center"
                onPress={handleSearch}
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white text-sm font-semibold">Go</Text>
                )}
              </TouchableOpacity>
            </View>

            {searchError && (
              <View className="mt-3 bg-danger-soft rounded-lg px-3 py-2.5">
                <Text className="text-danger text-sm">{searchError}</Text>
              </View>
            )}

            {searchResults && searchResults.length > 0 && (
              <View className="mt-3">
                {searchResults.map((club: any) => (
                  <TouchableOpacity
                    key={club.id}
                    className="flex-row items-center justify-between border border-rule rounded-lg px-3 py-3 mb-2 bg-base"
                    onPress={() => selectClubToJoin(club)}
                  >
                    <Text className="text-base font-semibold text-ink flex-shrink" numberOfLines={1}>
                      {club.name}
                    </Text>
                    <View className="flex-row items-center ml-2">
                      <Text className="text-sm font-medium text-accent mr-1">Join</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2 ml-1">
          Quick Actions
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
          className="mb-5"
        >
          <TouchableOpacity
            className="bg-card border border-rule rounded-xl p-4 items-center w-28"
            onPress={() => router.push('/(app)/(tabs)/teams' as any)}
          >
            <View className="bg-accent-soft w-11 h-11 rounded-full items-center justify-center mb-2">
              <Ionicons name="people-outline" size={22} color={colors.accent} />
            </View>
            <Text className="text-sm font-semibold text-ink">Teams</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-card border border-rule rounded-xl p-4 items-center w-28"
            onPress={() => router.push('/(app)/(tabs)/payments' as any)}
          >
            <View className="bg-accent-soft w-11 h-11 rounded-full items-center justify-center mb-2">
              <Ionicons name="wallet-outline" size={22} color={colors.accent} />
            </View>
            <Text className="text-sm font-semibold text-ink">Payments</Text>
          </TouchableOpacity>

          {isAdmin && clubId && (
            <TouchableOpacity
              className="bg-card border border-rule rounded-xl p-4 items-center w-28"
              onPress={() => router.push('/(app)/(tabs)/members' as any)}
            >
              <View className="bg-accent-soft w-11 h-11 rounded-full items-center justify-center mb-2">
                <Ionicons name="list-outline" size={22} color={colors.accent} />
              </View>
              <Text className="text-sm font-semibold text-ink">Members</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Seasons & Teams */}
        <View className="flex-row items-center justify-between mb-2 ml-1">
          <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Seasons & Teams
          </Text>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => router.push('/(app)/(tabs)/teams' as any)}
          >
            <Text className="text-xs font-semibold text-accent mr-0.5">View All</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {loadingTeams ? (
          <View className="bg-card border border-rule rounded-xl p-5 items-center mb-5">
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : !currentYear ? (
          <View className="bg-card border border-rule rounded-xl p-5 items-center mb-5">
            <Ionicons name="calendar-outline" size={28} color={colors.inkFaint} />
            <Text className="text-sm text-ink-muted mt-2">No seasons yet</Text>
            <TouchableOpacity
              className="mt-3 bg-accent rounded-lg px-4 py-2"
              onPress={() => router.push('/(app)/(tabs)/teams' as any)}
            >
              <Text className="text-white text-sm font-semibold">Go to Teams</Text>
            </TouchableOpacity>
          </View>
        ) : teams.length === 0 ? (
          <View className="bg-card border border-rule rounded-xl p-5 items-center mb-5">
            <Ionicons name="shirt-outline" size={28} color={colors.inkFaint} />
            <Text className="text-sm text-ink-muted mt-2">
              No teams for {currentYear.label || currentYear.year}
            </Text>
            <TouchableOpacity
              className="mt-3 bg-accent rounded-lg px-4 py-2"
              onPress={() => router.push('/(app)/(tabs)/teams' as any)}
            >
              <Text className="text-white text-sm font-semibold">Manage Teams</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mb-5">
            <Text className="text-xs text-ink-muted mb-2 ml-1">
              {currentYear.label || `Season ${currentYear.year}`}
            </Text>
            {teams.map((team) => (
              <TouchableOpacity
                key={team.id}
                activeOpacity={0.7}
                onPress={() =>
                  router.push(`/(app)/club/${clubId}/team/${team.id}` as any)
                }
                className="bg-card border border-rule rounded-xl p-4 mb-3"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="text-base font-bold text-ink" numberOfLines={1}>
                      {team.name}
                    </Text>
                    {team.description ? (
                      <Text className="text-sm text-ink-soft mt-0.5" numberOfLines={1}>
                        {team.description}
                      </Text>
                    ) : null}
                    <View className="flex-row items-center mt-1.5">
                      <Ionicons name="people-outline" size={13} color={colors.inkMuted} />
                      <Text className="text-xs text-ink-muted ml-1">
                        {team.member_count} {team.member_count === 1 ? 'player' : 'players'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

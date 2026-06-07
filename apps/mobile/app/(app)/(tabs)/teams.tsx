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

export default function TeamsScreen() {
  const { activeClub, loading: clubLoading, isAdmin } = useClub();
  const router = useRouter();
  const clubId = activeClub?.club_id;

  const [years, setYears] = useState<Year[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add season modal
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [newSeasonLabel, setNewSeasonLabel] = useState('');
  const [savingSeason, setSavingSeason] = useState(false);

  // Add team modal
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);

  const loadYears = useCallback(async () => {
    if (!clubId) return;
    try {
      const yearsData: Year[] = (await apiFetch(`/clubs/${clubId}/years`)) || [];
      const sorted = [...yearsData].sort((a, b) => b.year - a.year);
      setYears(sorted);
      setSelectedYearId((prev) => {
        if (prev && sorted.some((y) => y.id === prev)) return prev;
        const current = sorted.find((y) => y.is_active) || sorted[0];
        return current ? current.id : null;
      });
    } catch {
      setYears([]);
    }
  }, [clubId]);

  const loadTeams = useCallback(async () => {
    if (!clubId || !selectedYearId) {
      setTeams([]);
      setLoading(false);
      return;
    }
    try {
      const teamsData: Team[] =
        (await apiFetch(`/clubs/${clubId}/teams?year_id=${selectedYearId}`)) || [];
      setTeams(teamsData);
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [clubId, selectedYearId]);

  useFocusEffect(
    useCallback(() => {
      loadYears();
    }, [loadYears])
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadTeams();
    }, [loadTeams])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadYears();
    await loadTeams();
    setRefreshing(false);
  }

  async function handleAddSeason() {
    const yearNum = parseInt(newYear.trim(), 10);
    if (!yearNum || yearNum < 1900 || yearNum > 3000) {
      Alert.alert('Invalid year', 'Enter a valid 4-digit year, e.g. 2026.');
      return;
    }
    setSavingSeason(true);
    try {
      const created: Year = await apiFetch(`/clubs/${clubId}/years`, {
        method: 'POST',
        body: JSON.stringify({
          year: yearNum,
          label: newSeasonLabel.trim() || undefined,
        }),
      });
      setShowAddSeason(false);
      setNewYear('');
      setNewSeasonLabel('');
      await loadYears();
      if (created?.id) setSelectedYearId(created.id);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add season');
    } finally {
      setSavingSeason(false);
    }
  }

  async function handleAddTeam() {
    if (!newTeamName.trim()) {
      Alert.alert('Name required', 'Enter a team name.');
      return;
    }
    if (!selectedYearId) {
      Alert.alert('Season required', 'Select or create a season first.');
      return;
    }
    setSavingTeam(true);
    try {
      await apiFetch(`/clubs/${clubId}/teams`, {
        method: 'POST',
        body: JSON.stringify({
          year_id: selectedYearId,
          name: newTeamName.trim(),
          description: newTeamDesc.trim() || undefined,
        }),
      });
      setShowAddTeam(false);
      setNewTeamName('');
      setNewTeamDesc('');
      await loadTeams();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add team');
    } finally {
      setSavingTeam(false);
    }
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

  if (!activeClub) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <View className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-bold text-ink">Teams</Text>
        </View>
        <View className="flex-1 justify-center items-center px-8">
          <Ionicons name="people-outline" size={48} color={colors.inkMuted} />
          <Text className="text-base text-ink-muted text-center mt-3">
            Join a club to see teams
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      {/* Add Season Modal */}
      <Modal visible={showAddSeason} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowAddSeason(false)}
        >
          <Pressable className="bg-card rounded-t-2xl px-5 pt-5 pb-10" onPress={() => {}}>
            <Text className="text-lg font-bold text-ink mb-4">Add Season</Text>

            <Text className="text-sm font-semibold text-ink mb-1">Year</Text>
            <TextInput
              className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base mb-3"
              value={newYear}
              onChangeText={setNewYear}
              placeholder="2026"
              placeholderTextColor={colors.inkMuted}
              keyboardType="number-pad"
            />

            <Text className="text-sm font-semibold text-ink mb-1">Label (optional)</Text>
            <TextInput
              className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base mb-4"
              value={newSeasonLabel}
              onChangeText={setNewSeasonLabel}
              placeholder="2026 Summer Season"
              placeholderTextColor={colors.inkMuted}
            />

            <TouchableOpacity
              className="bg-accent rounded-lg py-3 items-center"
              onPress={handleAddSeason}
              disabled={savingSeason}
            >
              {savingSeason ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white text-sm font-semibold">Add Season</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Team Modal */}
      <Modal visible={showAddTeam} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowAddTeam(false)}
        >
          <Pressable className="bg-card rounded-t-2xl px-5 pt-5 pb-10" onPress={() => {}}>
            <Text className="text-lg font-bold text-ink mb-1">Add Team</Text>
            {(() => {
              const y = years.find((yr) => yr.id === selectedYearId);
              return y ? (
                <Text className="text-sm text-ink-muted mb-4">
                  Season: {y.label || y.year}
                </Text>
              ) : (
                <Text className="text-sm text-danger mb-4">Select a season first</Text>
              );
            })()}

            <Text className="text-sm font-semibold text-ink mb-1">Team Name</Text>
            <TextInput
              className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base mb-3"
              value={newTeamName}
              onChangeText={setNewTeamName}
              placeholder="1st XI"
              placeholderTextColor={colors.inkMuted}
            />

            <Text className="text-sm font-semibold text-ink mb-1">Description (optional)</Text>
            <TextInput
              className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base mb-4"
              value={newTeamDesc}
              onChangeText={setNewTeamDesc}
              placeholder="Senior competitive team"
              placeholderTextColor={colors.inkMuted}
            />

            <TouchableOpacity
              className="bg-accent rounded-lg py-3 items-center"
              onPress={handleAddTeam}
              disabled={savingTeam}
            >
              {savingTeam ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white text-sm font-semibold">Add Team</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-ink">Teams</Text>
        <Text className="text-sm text-ink-muted mt-0.5">{activeClub.club.name}</Text>
      </View>

      {/* Year selector */}
      <View className="mt-1 mb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {years.map((y) => {
            const active = y.id === selectedYearId;
            return (
              <TouchableOpacity
                key={y.id}
                onPress={() => setSelectedYearId(y.id)}
                className={`px-3.5 py-1.5 rounded-full border ${
                  active ? 'bg-ink border-ink' : 'bg-card border-rule'
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-xs font-semibold ${active ? 'text-white' : 'text-ink-soft'}`}
                >
                  {y.label || y.year}
                </Text>
              </TouchableOpacity>
            );
          })}
          {isAdmin && (
            <TouchableOpacity
              onPress={() => setShowAddSeason(true)}
              className="flex-row items-center px-3.5 py-1.5 rounded-full border border-accent-rule bg-accent-soft"
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={14} color={colors.accent} />
              <Text className="text-xs font-semibold text-accent ml-0.5">Season</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Admin add team */}
      {isAdmin && selectedYearId && (
        <View className="px-5 mb-3">
          <TouchableOpacity
            className="flex-row items-center justify-center bg-accent rounded-lg py-2.5"
            onPress={() => setShowAddTeam(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text className="text-white text-sm font-semibold ml-1">Add Team</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
        >
          {years.length === 0 ? (
            <View className="items-center py-16">
              <Ionicons name="calendar-outline" size={48} color={colors.inkMuted} />
              <Text className="text-base text-ink-muted text-center mt-3">
                No seasons yet
              </Text>
              {isAdmin && (
                <TouchableOpacity
                  className="mt-4 bg-accent rounded-lg px-4 py-2.5"
                  onPress={() => setShowAddSeason(true)}
                >
                  <Text className="text-white text-sm font-semibold">Add First Season</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : teams.length === 0 ? (
            <View className="items-center py-16">
              <Ionicons name="shirt-outline" size={48} color={colors.inkMuted} />
              <Text className="text-base text-ink-muted text-center mt-3">
                No teams in this season
              </Text>
            </View>
          ) : (
            teams.map((team) => (
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
                    <View className="flex-row items-center mt-1.5 gap-3">
                      <View className="flex-row items-center">
                        <Ionicons name="calendar-outline" size={13} color={colors.inkMuted} />
                        <Text className="text-xs text-ink-muted ml-1">
                          {team.year?.label || team.year?.year}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons name="people-outline" size={13} color={colors.inkMuted} />
                        <Text className="text-xs text-ink-muted ml-1">
                          {team.member_count} {team.member_count === 1 ? 'player' : 'players'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

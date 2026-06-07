import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  PLAYER_TYPES,
  BATTING_HANDS,
  BOWLING_TYPES,
  PLAYER_TYPE_LABELS,
  BATTING_HAND_LABELS,
  BOWLING_TYPE_LABELS,
} from '@cricket/shared';
import { apiFetch } from '../../../lib/api';
import { useClub } from '../../../lib/club-context';
import { colors } from '../../../lib/theme';

type Member = {
  id: string;
  user_id: string;
  status: string;
  join_date: string | null;
  player_type: string | null;
  batting_hand: string | null;
  bowling_type: string | null;
  roles: string[];
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

const ROLE_OPTIONS = ['player', 'captain', 'admin'] as const;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) {
    const d2 = new Date(dateStr);
    if (isNaN(d2.getTime())) return dateStr;
    return d2.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MembersScreen() {
  const { activeClub, loading: clubLoading, isAdmin } = useClub();
  const clubId = activeClub?.club_id;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  // Add member modal
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRoles, setNewRoles] = useState<string[]>(['player']);
  const [newPlayerType, setNewPlayerType] = useState<string | null>(null);
  const [newBattingHand, setNewBattingHand] = useState<string | null>(null);
  const [newBowlingType, setNewBowlingType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!clubId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    try {
      // The endpoint returns a plain array by default, or a paginated
      // `{ members, ... }` object when a page param is sent — tolerate both.
      const res = await apiFetch(`/clubs/${clubId}/members`);
      const data: Member[] = Array.isArray(res) ? res : res?.members || [];
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function toggleNewRole(role: string) {
    setNewRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function handleAddMember() {
    if (!newEmail.trim()) {
      Alert.alert('Email required', 'Enter the member email.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/clubs/${clubId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: newEmail.trim(),
          roles: newRoles.length > 0 ? newRoles : ['player'],
          player_type: newPlayerType || undefined,
          batting_hand: newBattingHand || undefined,
          bowling_type: newBowlingType || undefined,
        }),
      });
      setShowAdd(false);
      setNewEmail('');
      setNewRoles(['player']);
      setNewPlayerType(null);
      setNewBattingHand(null);
      setNewBowlingType(null);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  }

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = `${m.profile?.first_name ?? ''} ${m.profile?.last_name ?? ''}`.toLowerCase();
      const email = (m.profile?.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, query]);

  if (!clubLoading && (!activeClub || !isAdmin)) {
    return (
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
        <View className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-bold text-ink">Members</Text>
        </View>
        <View className="flex-1 justify-center items-center px-8">
          <Ionicons name="lock-closed-outline" size={48} color={colors.inkMuted} />
          <Text className="text-base text-ink-muted text-center mt-3">
            Admin access required
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  function renderCricketDetail(m: Member) {
    const parts: string[] = [];
    if (m.player_type) parts.push(PLAYER_TYPE_LABELS[m.player_type as keyof typeof PLAYER_TYPE_LABELS] || m.player_type);
    if (m.batting_hand) parts.push(BATTING_HAND_LABELS[m.batting_hand as keyof typeof BATTING_HAND_LABELS] || m.batting_hand);
    if (m.bowling_type) parts.push(BOWLING_TYPE_LABELS[m.bowling_type as keyof typeof BOWLING_TYPE_LABELS] || m.bowling_type);
    return parts.join(' · ');
  }

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      {/* Add Member Modal */}
      <Modal visible={showAdd} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowAdd(false)}
        >
          <Pressable className="bg-card rounded-t-2xl px-5 pt-5 pb-10" onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              <Text className="text-lg font-bold text-ink mb-4">Add Member</Text>

              <Text className="text-sm font-semibold text-ink mb-1">Email</Text>
              <TextInput
                className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base mb-4"
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="player@example.com"
                placeholderTextColor={colors.inkMuted}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text className="text-sm font-semibold text-ink mb-2">Roles</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {ROLE_OPTIONS.map((role) => {
                  const selected = newRoles.includes(role);
                  return (
                    <TouchableOpacity
                      key={role}
                      className={`px-3 py-2 rounded-lg border ${
                        selected ? 'bg-accent-soft border-accent-rule' : 'bg-base border-rule'
                      }`}
                      onPress={() => toggleNewRole(role)}
                    >
                      <Text
                        className={`text-sm font-medium capitalize ${
                          selected ? 'text-accent-ink' : 'text-ink-soft'
                        }`}
                      >
                        {role}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-sm font-semibold text-ink mb-2">Player Type</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {PLAYER_TYPES.map((t) => {
                  const selected = newPlayerType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      className={`px-3 py-2 rounded-lg border ${
                        selected ? 'bg-accent-soft border-accent-rule' : 'bg-base border-rule'
                      }`}
                      onPress={() => setNewPlayerType(selected ? null : t)}
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
                  const selected = newBattingHand === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      className={`px-3 py-2 rounded-lg border ${
                        selected ? 'bg-accent-soft border-accent-rule' : 'bg-base border-rule'
                      }`}
                      onPress={() => setNewBattingHand(selected ? null : t)}
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
              <View className="flex-row flex-wrap gap-2 mb-5">
                {BOWLING_TYPES.map((t) => {
                  const selected = newBowlingType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      className={`px-3 py-2 rounded-lg border ${
                        selected ? 'bg-accent-soft border-accent-rule' : 'bg-base border-rule'
                      }`}
                      onPress={() => setNewBowlingType(selected ? null : t)}
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

              <TouchableOpacity
                className="bg-accent rounded-lg py-3 items-center"
                onPress={handleAddMember}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white text-sm font-semibold">Add Member</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-ink">Members</Text>
          <TouchableOpacity
            className="flex-row items-center bg-accent rounded-lg px-3 py-2"
            onPress={() => setShowAdd(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#ffffff" />
            <Text className="text-white text-sm font-semibold ml-1">Add</Text>
          </TouchableOpacity>
        </View>
        {activeClub?.club?.name ? (
          <Text className="text-sm text-ink-muted mt-0.5">{activeClub.club.name}</Text>
        ) : null}
      </View>

      {/* Search */}
      <View className="px-5 mt-2 mb-3">
        <View className="flex-row items-center border border-rule rounded-lg px-3 bg-card">
          <Ionicons name="search" size={16} color={colors.inkMuted} />
          <TextInput
            className="flex-1 py-2.5 px-2 text-base text-ink"
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or email"
            placeholderTextColor={colors.inkMuted}
            autoCapitalize="none"
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : filteredMembers.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <Ionicons name="people-outline" size={48} color={colors.inkMuted} />
          <Text className="text-base text-ink-muted text-center mt-3">
            {members.length === 0 ? 'No members yet' : 'No members match search'}
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
        >
          {filteredMembers.map((item) => {
            const initials = `${(item.profile?.first_name?.[0] || '').toUpperCase()}${(item.profile?.last_name?.[0] || '').toUpperCase()}`;
            const isActive = item.status === 'active';
            const detail = renderCricketDetail(item);
            return (
              <View key={item.id} className="bg-card border border-rule rounded-xl p-4 mb-3">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-soft border border-rule items-center justify-center mr-3">
                    <Text className="text-xs font-bold text-ink-soft">{initials || '—'}</Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
                      {item.profile?.first_name} {item.profile?.last_name}
                    </Text>
                    <Text className="text-xs text-ink-muted mt-0.5" numberOfLines={1}>
                      {item.profile?.email || '—'}
                    </Text>
                  </View>
                  <View
                    className={`flex-row items-center px-2 py-0.5 rounded-full ${isActive ? 'bg-accent-soft' : 'bg-soft'}`}
                  >
                    <View
                      className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-accent' : 'bg-ink-faint'}`}
                    />
                    <Text
                      className={`text-[10px] font-semibold ${isActive ? 'text-accent-ink' : 'text-ink-muted'}`}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>

                {/* Roles + join date */}
                <View className="flex-row items-center justify-between mt-3">
                  <View className="flex-row flex-wrap gap-1">
                    {(item.roles || []).map((role) => (
                      <View key={role} className="bg-soft border border-rule rounded-full px-2 py-0.5">
                        <Text className="text-[10px] font-medium text-ink-soft capitalize">{role}</Text>
                      </View>
                    ))}
                  </View>
                  <Text className="text-[11px] text-ink-muted">
                    Joined {formatDate(item.join_date)}
                  </Text>
                </View>

                {/* Cricket details */}
                {detail ? (
                  <View className="flex-row items-center mt-2 pt-2 border-t border-rule">
                    <Ionicons name="baseball-outline" size={13} color={colors.inkMuted} />
                    <Text className="text-xs text-ink-soft ml-1.5">{detail}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

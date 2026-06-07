import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { apiFetch } from '../../../lib/api';
import { useClub } from '../../../lib/club-context';
import { colors } from '../../../lib/theme';

export default function ProfileScreen() {
  const { activeClub } = useClub();

  const [profile, setProfile] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await apiFetch('/profiles/me');
      setProfile(data);
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setPhone(data.phone || '');
      setPaypalEmail(data.paypal_email || '');
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = await apiFetch('/profiles/me', {
        method: 'PUT',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
          paypal_email: paypalEmail,
        }),
      });
      setProfile(data);
      Alert.alert('Success', 'Profile updated');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  function getInitials() {
    const f = firstName?.charAt(0)?.toUpperCase() || '';
    const l = lastName?.charAt(0)?.toUpperCase() || '';
    return f + l || '?';
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Name Header */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-accent-soft justify-center items-center">
            <Text className="text-2xl font-bold text-accent-ink">{getInitials()}</Text>
          </View>
          <Text className="text-xl font-bold text-ink mt-3">
            {firstName} {lastName}
          </Text>
          <Text className="text-sm text-ink-muted mt-0.5">{profile?.email || ''}</Text>
        </View>

        {/* Section: Personal Info */}
        <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2 ml-1">
          Personal Info
        </Text>
        <View className="bg-card border border-rule rounded-xl p-4 mb-5">
          <Text className="text-sm font-semibold text-ink mb-1">First Name</Text>
          <TextInput
            className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base mb-3"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor={colors.inkMuted}
          />

          <Text className="text-sm font-semibold text-ink mb-1">Last Name</Text>
          <TextInput
            className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base mb-3"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor={colors.inkMuted}
          />

          <Text className="text-sm font-semibold text-ink mb-1">Phone</Text>
          <TextInput
            className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base mb-3"
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            placeholderTextColor={colors.inkMuted}
            keyboardType="phone-pad"
          />

          <Text className="text-sm font-semibold text-ink mb-1">PayPal email</Text>
          <TextInput
            className="border border-rule rounded-lg px-3 py-2.5 text-base text-ink bg-base mb-4"
            value={paypalEmail}
            onChangeText={setPaypalEmail}
            placeholder="paypal@example.com"
            placeholderTextColor={colors.inkMuted}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TouchableOpacity
            className="bg-accent rounded-lg py-3 items-center"
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white text-sm font-semibold">Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Section: Club */}
        <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2 ml-1">
          Club
        </Text>
        <View className="bg-card border border-rule rounded-xl p-4 mb-5">
          {activeClub ? (
            <>
              <View className="flex-row items-center mb-2">
                <Ionicons name="people-outline" size={18} color={colors.accent} />
                <Text className="text-base font-semibold text-ink ml-2">
                  {activeClub.club.name}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-1.5">
                {activeClub.roles.map((role) => (
                  <View key={role} className="bg-accent-soft px-2.5 py-1 rounded-full">
                    <Text className="text-xs font-semibold text-accent-ink capitalize">
                      {role}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View className="items-center py-4">
              <Text className="text-sm text-ink-muted">No active club selected</Text>
            </View>
          )}
        </View>

        {/* Section: Account */}
        <Text className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2 ml-1">
          Account
        </Text>
        <View className="bg-card border border-rule rounded-xl p-4 mb-5">
          <TouchableOpacity
            className="border border-danger rounded-lg py-3 items-center"
            onPress={handleSignOut}
          >
            <Text className="text-danger text-sm font-semibold">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

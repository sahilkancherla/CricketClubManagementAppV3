import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { APP_NAME } from '@cricket/shared';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) setError(authError.message);
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-base">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          className="px-7"
        >
          {/* Brand */}
          <View className="items-center mb-12">
            <View className="w-14 h-14 rounded-2xl bg-accent-deep items-center justify-center mb-4">
              <Text className="text-white text-2xl font-bold">
                {APP_NAME.charAt(0)}
              </Text>
            </View>
            <Text className="text-2xl font-bold text-ink tracking-tight">
              {APP_NAME}
            </Text>
            <Text className="text-sm text-ink-muted mt-1">
              Sign in to your account
            </Text>
          </View>

          {/* Error */}
          {error && (
            <View className="bg-danger-soft rounded-xl px-4 py-3 mb-5">
              <Text className="text-danger text-sm">{error}</Text>
            </View>
          )}

          {/* Email */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-ink-soft mb-1.5 ml-1">
              EMAIL
            </Text>
            <TextInput
              className="border border-rule-strong bg-card rounded-xl px-4 text-base"
              style={{ color: colors.ink, height: 48 }}
              placeholder="you@example.com"
              placeholderTextColor={colors.inkMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          {/* Password */}
          <View className="mb-6">
            <Text className="text-xs font-semibold text-ink-soft mb-1.5 ml-1">
              PASSWORD
            </Text>
            <TextInput
              className="border border-rule-strong bg-card rounded-xl px-4 text-base"
              style={{ color: colors.ink, height: 48 }}
              placeholder="Enter your password"
              placeholderTextColor={colors.inkMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {/* Sign-in button */}
          <TouchableOpacity
            className="bg-accent rounded-xl items-center justify-center mb-8"
            style={{ height: 50 }}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text className="text-white text-base font-semibold">
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {/* Register link */}
          <View className="flex-row justify-center">
            <Text className="text-ink-muted text-sm">
              Don't have an account?{' '}
            </Text>
            <Link href="/(auth)/register">
              <Text className="text-accent text-sm font-semibold">Sign up</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

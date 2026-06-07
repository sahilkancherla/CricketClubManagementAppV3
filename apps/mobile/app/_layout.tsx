import '../global.css';
import { useEffect, useState } from 'react';
import { View, StatusBar } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ClubProvider } from '../lib/club-context';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(app)/(tabs)/home');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View className="flex-1 bg-base">
        <StatusBar barStyle="dark-content" />
      </View>
    );
  }

  return (
    <ClubProvider>
      <StatusBar barStyle="dark-content" />
      <Slot />
    </ClubProvider>
  );
}

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../../../lib/api';
import { useClub } from '../../../lib/club-context';
import { colors } from '../../../lib/theme';

type PaymentAssignment = {
  id: string;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
  payment: {
    id: string;
    title: string;
    description: string | null;
    amount_cents: number;
    due_date: string | null;
  };
};

function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

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

function statusStyle(status: string) {
  if (status === 'paid') {
    return { bg: 'bg-accent-soft', text: 'text-accent-ink', label: 'Paid' };
  }
  if (status === 'cancelled') {
    return { bg: 'bg-soft', text: 'text-ink-muted', label: 'Cancelled' };
  }
  return { bg: 'bg-warn-soft', text: 'text-warn', label: 'Pending' };
}

export default function PaymentsScreen() {
  const { activeClub, loading: clubLoading } = useClub();
  const clubId = activeClub?.club_id;

  const [payments, setPayments] = useState<PaymentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!clubId) {
      setPayments([]);
      setLoading(false);
      return;
    }
    try {
      const data: PaymentAssignment[] =
        (await apiFetch(`/clubs/${clubId}/my-payments`)) || [];
      setPayments(data);
    } catch {
      setPayments([]);
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
          <Text className="text-2xl font-bold text-ink">Payments</Text>
        </View>
        <View className="flex-1 justify-center items-center px-8">
          <Ionicons name="wallet-outline" size={48} color={colors.inkMuted} />
          <Text className="text-base text-ink-muted text-center mt-3">
            Join a club to see your payments
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-base" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-ink">Payments</Text>
        <Text className="text-sm text-ink-muted mt-0.5">{activeClub.club.name}</Text>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : payments.length === 0 ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
        >
          <View className="flex-1 justify-center items-center px-8 py-24">
            <Ionicons name="wallet-outline" size={48} color={colors.inkMuted} />
            <Text className="text-base text-ink-muted text-center mt-3">
              No payments yet
            </Text>
            <Text className="text-sm text-ink-muted text-center mt-1">
              When your club assigns fees, they'll appear here.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
        >
          {payments.map((p) => {
            const s = statusStyle(p.status);
            return (
              <View key={p.id} className="bg-card border border-rule rounded-xl p-4 mb-3">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="text-base font-bold text-ink" numberOfLines={1}>
                      {p.payment?.title}
                    </Text>
                    {p.payment?.description ? (
                      <Text className="text-sm text-ink-soft mt-0.5" numberOfLines={2}>
                        {p.payment.description}
                      </Text>
                    ) : null}
                  </View>
                  <View className={`px-2.5 py-1 rounded-full ${s.bg}`}>
                    <Text className={`text-[10px] font-bold ${s.text}`}>{s.label}</Text>
                  </View>
                </View>

                <View className="flex-row items-end justify-between mt-3 pt-3 border-t border-rule">
                  <View>
                    <Text className="text-xs text-ink-muted">Amount</Text>
                    <Text className="text-lg font-bold text-ink mt-0.5">
                      {formatMoney(p.payment?.amount_cents ?? 0)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs text-ink-muted">
                      {p.status === 'paid' ? 'Paid' : 'Due'}
                    </Text>
                    <Text className="text-sm font-semibold text-ink-soft mt-0.5">
                      {p.status === 'paid'
                        ? formatDate(p.paid_at)
                        : formatDate(p.payment?.due_date)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import type { FocusHistory, FocusSummary } from '../../domain/focus';
import { localDayKey, shiftLocalDay } from '../../domain/timeblocks';
import { getFocusSummary, listFocusHistory, listFocusHistorySince } from '../../storage/focus';
import { colors, radius, spacing } from '../../theme/tokens';

function duration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return ms > 0 ? '<1m' : '0m';
  const hours = Math.floor(minutes / 60);
  return hours ? hours + 'h ' + (minutes % 60) + 'm' : minutes + 'm';
}
function dateLabel(ms: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(ms));
}
type Palette = typeof colors.light | typeof colors.dark;
const EMPTY: FocusSummary = { sessions: 0, completed: 0, focusedMs: 0 };

export function InsightsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const palette: Palette = useColorScheme() === 'dark' ? colors.dark : colors.light;
  const [summary, setSummary] = useState<FocusSummary>(EMPTY);
  const [weekHistory, setWeekHistory] = useState<FocusHistory[]>([]);
  const [recent, setRecent] = useState<FocusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useFocusEffect(useCallback(() => {
    let live = true;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
    setLoading(true);
    void Promise.all([getFocusSummary(db), listFocusHistorySince(db, start), listFocusHistory(db)]).then(
      ([stats, week, entries]) => {
        if (!live) return;
        setSummary(stats);
        setWeekHistory(week);
        setRecent(entries);
        setError(null);
      },
    ).catch((reason: unknown) => {
      if (live) setError(reason instanceof Error ? reason.message : 'Could not load focus history.');
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [db, revision]));

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => shiftLocalDay(today, i - 6));
  const totals = days.map((d) => weekHistory
    .filter((entry) => localDayKey(new Date(entry.endedAtMs)) === localDayKey(d))
    .reduce((sum, entry) => sum + entry.focusedMs, 0));
  const max = Math.max(...totals, 60000);
  const weekMs = totals.reduce((sum, ms) => sum + ms, 0);

  return (
    <SafeAreaView edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.brand, { color: palette.accent }]}>EONWARD / INSIGHTS</Text>
            <Text style={[styles.title, { color: palette.foreground }]}>Make time visible.</Text>
            <Text style={[styles.subtitle, { color: palette.muted }]}>Focus that counts, not another checklist.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh focus insights"
            onPress={() => setRevision((n) => n + 1)}
            style={[styles.refresh, { borderColor: palette.border }]}>
            <Text style={{ color: palette.foreground, fontSize: 21 }}>↻</Text>
          </Pressable>
        </View>
        {loading ? <ActivityIndicator color={palette.accent} size="large" /> : error ? (
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={{ color: palette.foreground }}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => setRevision((n) => n + 1)}>
              <Text style={{ color: palette.accent, fontWeight: '700' }}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.stats}>
              <View style={[styles.stat, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[styles.statLabel, { color: palette.muted }]}>TOTAL FOCUS</Text>
                <Text style={[styles.statNumber, { color: palette.foreground }]}>{duration(summary.focusedMs)}</Text>
                <Text style={[styles.statHint, { color: palette.muted }]}>Finalized sessions only</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[styles.statLabel, { color: palette.muted }]}>SESSIONS</Text>
                <Text style={[styles.statNumber, { color: palette.foreground }]}>{summary.sessions}</Text>
                <Text style={[styles.statHint, { color: palette.muted }]}>{summary.completed} reached the limit</Text>
              </View>
            </View>
            <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.sectionLabel, { color: palette.accent }]}>PAST SEVEN DAYS</Text>
              <View style={styles.cardHeading}>
                <Text style={[styles.sectionTitle, { color: palette.foreground }]}>Your focus rhythm</Text>
                <Text style={[styles.total, { color: palette.accent }]}>{duration(weekMs)}</Text>
              </View>
              <View style={styles.chart}>
                {days.map((d, index) => (
                  <View key={localDayKey(d)} style={styles.day}>
                    <View style={styles.barTrack}
                      accessibilityLabel={localDayKey(d) + ': ' + duration(totals[index])}>
                      {totals[index] > 0 ? (
                        <View style={[styles.bar, {
                          height: Math.max(4, totals[index] / max * 94),
                          backgroundColor: index === 6 ? '#B58D60' : palette.accent,
                        }]} />
                      ) : <View style={[styles.zero, { backgroundColor: palette.border }]} />}
                    </View>
                    <Text style={[styles.dayLabel, { color: index === 6 ? palette.foreground : palette.muted }]}>
                      {new Intl.DateTimeFormat('en-US', { weekday: 'narrow' }).format(d)}
                    </Text>
                    <Text style={[styles.dayDate, { color: palette.muted }]}>{d.getDate()}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.historyHeader}>
              <View>
                <Text style={[styles.sectionLabel, { color: palette.accent }]}>YOUR LOG</Text>
                <Text style={[styles.sectionTitle, { color: palette.foreground }]}>Recent focus</Text>
              </View>
              <Text style={[styles.historyCount, { color: palette.muted }]}>Last 12</Text>
            </View>
            {recent.length ? recent.map((entry) => (
              <View key={entry.id}
                style={[styles.entry, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <View style={[styles.entryDot, {
                  backgroundColor: entry.outcome === 'completed' ? '#5E9579' : '#B58D60',
                }]} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text numberOfLines={2} style={[styles.entryTitle, { color: palette.foreground }]}>
                    {entry.goalTitle}
                  </Text>
                  <Text style={[styles.entryMeta, { color: palette.muted }]}>
                    {dateLabel(entry.endedAtMs)} · {
                      entry.outcome === 'completed' ? 'Completed' :
                        entry.outcome === 'replaced' ? 'Switched' : 'Stopped'
                    }
                  </Text>
                </View>
                <Text style={[styles.entryTime, { color: palette.foreground }]}>
                  {duration(entry.focusedMs)}
                </Text>
              </View>
            )) : (
              <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[styles.emptyTitle, { color: palette.foreground }]}>
                  Progress begins with one session.
                </Text>
                <Text style={[styles.emptyCopy, { color: palette.muted }]}>
                  Start a Timebox in Calendar. Once you finish or stop it, your real focus time appears here.
                </Text>
                <Pressable accessibilityRole="button" onPress={() => router.navigate('/calendar')}
                  style={[styles.cta, { backgroundColor: palette.accent }]}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Open Calendar</Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingTop: 23, paddingBottom: 44, gap: 19 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  brand: { fontWeight: '800', fontSize: 10, letterSpacing: 1.5, marginBottom: 12 },
  title: { fontWeight: '800', fontSize: 28, letterSpacing: -1, lineHeight: 35 },
  subtitle: { fontSize: 13, marginTop: 7 },
  refresh: { width: 44, height: 44, borderWidth: 1, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, minHeight: 136, borderWidth: 1, borderRadius: radius.xl, padding: 16, justifyContent: 'space-between' },
  statLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  statNumber: { fontSize: 27, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.6 },
  statHint: { fontSize: 11, lineHeight: 16 },
  card: { borderWidth: 1, borderRadius: radius.xl, padding: 19, gap: 7 },
  sectionLabel: { fontWeight: '800', fontSize: 10, letterSpacing: 1.3 },
  sectionTitle: { fontWeight: '700', fontSize: 19, letterSpacing: -0.4 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  total: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  chart: { flexDirection: 'row', height: 147, marginTop: 14, alignItems: 'flex-end', gap: 8 },
  day: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', maxWidth: 28, borderTopLeftRadius: 7, borderTopRightRadius: 7, minHeight: 4 },
  zero: { height: 3, width: '65%', borderRadius: 2 },
  dayLabel: { fontSize: 12, fontWeight: '700' },
  dayDate: { fontSize: 10 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  historyCount: { fontSize: 11 },
  entry: { borderWidth: 1, borderRadius: radius.lg, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 11 },
  entryDot: { height: 9, width: 9, borderRadius: 5 },
  entryTitle: { fontSize: 14, fontWeight: '700' },
  entryMeta: { fontSize: 11 },
  entryTime: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  empty: { borderWidth: 1, borderRadius: radius.xl, padding: 23, gap: 16 },
  emptyTitle: { fontWeight: '700', fontSize: 18 },
  emptyCopy: { fontSize: 13, lineHeight: 21 },
  cta: { minHeight: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
});

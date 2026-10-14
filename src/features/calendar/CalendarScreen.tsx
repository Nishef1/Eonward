import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import type { Goal } from '../../domain/goals';
import {
  layoutBlocks, localClock, localDayKey, parseLocalDay, shiftLocalDay,
  type BlockInput, type TimeBlock,
} from '../../domain/timeblocks';
import { getGoal, listAllGoals, setGoalCompleted } from '../../storage/goals';
import { listDayBlocks, removeBlock, saveBlock } from '../../storage/timeblocks';
import { colors, radius, spacing } from '../../theme/tokens';
import { TimeBlockEditor } from './TimeBlockEditor';

const HOUR_HEIGHT = 64;
const HOURS = Array.from({ length: 25 }, (_, hour) => hour);
type Palette = typeof colors.light | typeof colors.dark;

function formatDay(day: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  }).format(day);
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export function CalendarScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const isDark = useColorScheme() === 'dark';
  const palette: Palette = isDark ? colors.dark : colors.light;
  const [day, setDay] = useState(() => new Date());
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [chosenGoal, setChosenGoal] = useState<string | null>(null);
  const usedGoalParam = useRef<string | null>(null);
  const key = localDayKey(day);

  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([listDayBlocks(db, day), listAllGoals(db)]).then(([saved, all]) => {
      if (!active) return;
      setBlocks(saved);
      setGoals(all);
      setFailure(null);
    }).catch((error: unknown) => {
      if (active) setFailure(error instanceof Error ? error.message : 'Could not load your schedule.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [db, key, revision]);

  useEffect(() => {
    if (!goalId) { usedGoalParam.current = null; return; }
    if (usedGoalParam.current === goalId) return;
    let active = true;
    void getGoal(db, goalId).then((goal) => {
      if (!active) return;
      usedGoalParam.current = goalId;
      if (goal) {
        setEditingBlock(null);
        setChosenGoal(goal.id);
        setEditorOpen(true);
      } else {
        Alert.alert('Goal unavailable', 'Only active goals can be scheduled.');
      }
    }).catch(() => {
      if (active) Alert.alert('Could not open goal', 'Try opening Calendar again.');
    });
    return () => { active = false; };
  }, [db, goalId]);

  const positioned = useMemo(() => layoutBlocks(blocks, HOUR_HEIGHT), [blocks]);
  const plannedMinutes = blocks.reduce((sum, block) =>
    sum + (new Date(block.endAt).getTime() - new Date(block.startAt).getTime()) / 60000, 0);
  const plannedLabel = plannedMinutes < 60 ? `${Math.round(plannedMinutes)}m` :
    `${Math.floor(plannedMinutes / 60)}h ${Math.round(plannedMinutes % 60)}m`;
  const completed = blocks.filter((block) => block.goalCompleted).length;

  async function write(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      refresh();
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function startNew() {
    setEditingBlock(null);
    setChosenGoal(null);
    setEditorOpen(true);
  }
  function edit(block: TimeBlock) {
    setEditingBlock(block);
    setChosenGoal(block.goalId);
    setEditorOpen(true);
  }
  function save(input: BlockInput) {
    return write(async () => {
      await saveBlock(db, input, editingBlock?.id);
      setDay(parseLocalDay(input.date) ?? day);
      setEditorOpen(false);
      setEditingBlock(null);
      setChosenGoal(null);
    });
  }
  function remove(block: TimeBlock) {
    Alert.alert('Remove this time block?', 'The goal will remain in Horizons and Boards.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove time', style: 'destructive', onPress: () => void write(async () => {
        await removeBlock(db, block.id);
      }) },
    ]);
  }
  function openGoal(id: string) {
    router.push({ pathname: '/', params: { goalId: id } });
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]} edges={['top','bottom','left','right']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.navigation}>
          <Pressable style={[styles.back, { backgroundColor: palette.surface, borderColor: palette.border }]}
            accessibilityRole="button" accessibilityLabel="Back to previous page" onPress={() => router.back()}>
            <Text style={[styles.backIcon, { color: palette.foreground }]}>‹</Text>
          </Pressable>
          <Text style={[styles.wordmark, { color: palette.foreground }]}>EONWARD  /  CALENDAR</Text>
          <Pressable style={[styles.today, { borderColor: palette.border }]}
            accessibilityRole="button" onPress={() => setDay(new Date())}>
            <Text style={[styles.todayText, { color: palette.accent }]}>Today</Text>
          </Pressable>
        </View>
        <Text style={[styles.eyebrow, { color: palette.accent }]}>YOUR TIME, GIVEN PURPOSE</Text>
        <Text style={[styles.title, { color: palette.foreground }]}>Time, protected<Text style={{ color: palette.accent }}>.</Text></Text>
        <Text style={[styles.subtitle, { color: palette.muted }]}>Give your goals a place in the day.</Text>

        <View style={[styles.datePanel, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous day" style={styles.arrowButton}
            onPress={() => setDay((date) => shiftLocalDay(date, -1))}>
            <Text style={[styles.arrow, { color: palette.foreground }]}>‹</Text>
          </Pressable>
          <View style={styles.dateCopy}>
            <Text style={[styles.dateCaption, { color: palette.muted }]}>DAILY PLAN</Text>
            <Text style={[styles.dateText, { color: palette.foreground }]}>{formatDay(day)}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Next day" style={styles.arrowButton}
            onPress={() => setDay((date) => shiftLocalDay(date, 1))}>
            <Text style={[styles.arrow, { color: palette.foreground }]}>›</Text>
          </Pressable>
        </View>
        <View style={styles.summary}>
          <View style={styles.metrics}>
            <Text style={[styles.metricValue, { color: palette.foreground }]}>{blocks.length} <Text style={[styles.metricLabel, { color: palette.muted }]}>blocks</Text></Text>
            <Text style={[styles.metricValue, { color: palette.foreground }]}>{plannedLabel} <Text style={[styles.metricLabel, { color: palette.muted }]}>planned</Text></Text>
            <Text style={[styles.metricValue, { color: palette.foreground }]}>{completed} <Text style={[styles.metricLabel, { color: palette.muted }]}>done</Text></Text>
          </View>
          <Pressable disabled={busy} onPress={startNew} accessibilityRole="button"
            accessibilityLabel="Schedule a goal" style={[styles.primary, { backgroundColor: palette.accent }]}>
            <Text style={styles.primaryText}>＋  Plan time</Text>
          </Pressable>
        </View>

        {loading ? <ActivityIndicator color={palette.accent} style={{ marginTop: 40 }} /> : failure ? (
          <View style={[styles.notice, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={{ color: palette.foreground }}>{failure}</Text>
            <Pressable onPress={refresh} style={styles.retry} accessibilityRole="button">
              <Text style={{ color: palette.accent, fontWeight: '700' }}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {blocks.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[styles.emptyTitle, { color: palette.foreground }]}>
                  Make space for what matters.
                </Text>
                <Text style={[styles.emptyCopy, { color: palette.muted }]}>
                  {goals.length ? 'Select a goal and reserve a time for it. Your goal will still appear in Horizons and Boards.' :
                    'Create a goal in Horizons or Boards, then give it a place on your calendar.'}
                </Text>
                {!goals.length ? (
                  <Pressable onPress={() => router.push('/')} accessibilityRole="button" style={styles.goToGoals}>
                    <Text style={{ color: palette.accent, fontWeight: '700' }}>Open Horizons →</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View style={styles.agenda}>
                <Text style={[styles.agendaHeading, { color: palette.foreground }]}>Today's intentions</Text>
                {blocks.map((block) => (
                  <View key={block.id} style={[styles.agendaRow, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                    <View style={[styles.agendaMarker, { backgroundColor: block.kind === 'box' ? '#B07B42' : palette.accent }]} />
                    <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${block.goalTitle} time`}
                      onPress={() => edit(block)} style={styles.agendaContent}>
                      <Text numberOfLines={1} style={[styles.agendaGoal, {
                        color: palette.foreground, textDecorationLine: block.goalCompleted ? 'line-through' : 'none',
                      }]}>{block.goalTitle}</Text>
                      <Text style={[styles.agendaTime, { color: palette.muted }]}>
                        {formatTime(block.startAt)}–{formatTime(block.endAt)} · {block.kind === 'box' ? 'Timebox' : 'Time block'}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.agendaGo} accessibilityRole="button"
                      accessibilityLabel={`Open ${block.goalTitle} goal`} onPress={() => openGoal(block.goalId)}>
                      <Text style={[styles.agendaArrow, { color: palette.accent }]}>↗</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove scheduled time for ${block.goalTitle}`}
                      onPress={() => remove(block)} style={styles.agendaGo}>
                      <Text style={[styles.removeText, { color: palette.muted }]}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.timelineHeading}>
              <Text style={[styles.timelineTitle, { color: palette.foreground }]}>Daily timeline</Text>
              <Text style={[styles.timelineHint, { color: palette.muted }]}>Tap a block to edit</Text>
            </View>
            <View style={[styles.timeline, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              {HOURS.map((hour) => (
                <View key={hour} style={[styles.hour, { top: hour * HOUR_HEIGHT }]}>
                  <Text style={[styles.hourText, { color: palette.muted }]}>{String(hour).padStart(2, '0')}:00</Text>
                  <View style={[styles.hourLine, { backgroundColor: palette.border }]} />
                </View>
              ))}
              <View style={styles.eventLayer}>
                {positioned.map(({ block, top, height, lane, lanes }) => (
                  <Pressable key={block.id} onPress={() => edit(block)} accessibilityRole="button"
                    accessibilityLabel={`Edit ${block.goalTitle} scheduled ${formatTime(block.startAt)} to ${formatTime(block.endAt)}`}
                    style={[styles.event, {
                      top, height, left: `${lane / lanes * 100}%`, width: `${100 / lanes}%`,
                      backgroundColor: block.kind === 'box' ? '#98683B' : isDark ? '#385D50' : '#587A6D',
                    }]}>
                    <Text style={styles.eventTime} numberOfLines={1}>{localClock(new Date(block.startAt))}–{localClock(new Date(block.endAt))}</Text>
                    <Text style={[styles.eventName, { textDecorationLine: block.goalCompleted ? 'line-through' : 'none' }]}
                      numberOfLines={height < 60 ? 1 : 3}>{block.goalTitle}</Text>
                    {height > 75 && block.intention ? <Text numberOfLines={2} style={styles.eventIntention}>{block.intention}</Text> : null}
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <TimeBlockEditor
        visible={editorOpen}
        date={day}
        goals={goals}
        initial={editingBlock}
        suggestedGoalId={chosenGoal}
        palette={palette}
        saving={busy}
        onCancel={() => { if (!busy) { setEditorOpen(false); setEditingBlock(null); } }}
        onSave={save}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { paddingHorizontal: spacing.lg, paddingBottom: 45, paddingTop: 12 },
  navigation: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 29 },
  back: { width: 46, height: 46, borderWidth: 1, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 30 },
  wordmark: { flex: 1, fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  today: { borderWidth: 1, borderRadius: radius.full, minHeight: 46, paddingHorizontal: 14, justifyContent: 'center' },
  todayText: { fontSize: 12, fontWeight: '700' },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginBottom: 6 },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -1 },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 28 },
  datePanel: { borderWidth: 1, borderRadius: radius.xl, minHeight: 89, flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 19 },
  arrowButton: { width: 48, minHeight: 66, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 30 },
  dateCopy: { flex: 1, alignItems: 'center', gap: 5 },
  dateCaption: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  dateText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 20 },
  metrics: { flex: 1, gap: 6 },
  metricValue: { fontSize: 13, fontWeight: '700' },
  metricLabel: { fontSize: 12, fontWeight: '400' },
  primary: { minHeight: 53, borderRadius: radius.full, paddingHorizontal: 17, justifyContent: 'center', alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  empty: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: 9, marginBottom: 21 },
  emptyTitle: { fontWeight: '700', fontSize: 17 },
  emptyCopy: { fontSize: 13, lineHeight: 22 },
  goToGoals: { minHeight: 44, justifyContent: 'center', marginTop: 7 },
  notice: { borderWidth: 1, borderRadius: radius.lg, padding: 16, gap: 9 },
  retry: { minHeight: 48, justifyContent: 'center' },
  agenda: { marginBottom: 19, gap: 8 },
  agendaHeading: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  agendaRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.lg, minHeight: 78, padding: 9, gap: 8 },
  agendaMarker: { width: 5, height: 43, borderRadius: 3 },
  agendaContent: { flex: 1, justifyContent: 'center', gap: 5, minHeight: 56 },
  agendaGoal: { fontSize: 14, fontWeight: '700' },
  agendaTime: { fontSize: 11 },
  agendaGo: { minWidth: 33, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  agendaArrow: { fontSize: 20 },
  removeText: { fontSize: 24 },
  timelineHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  timelineTitle: { fontSize: 19, fontWeight: '700' },
  timelineHint: { fontSize: 11 },
  timeline: { borderWidth: 1, borderRadius: radius.lg, height: HOUR_HEIGHT * 24 + 4, overflow: 'hidden' },
  hour: { position: 'absolute', height: 25, width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 9 },
  hourText: { width: 40, fontSize: 10, fontWeight: '600' },
  hourLine: { flex: 1, height: 1 },
  eventLayer: { position: 'absolute', top: 0, bottom: 0, left: 60, right: 6 },
  event: { position: 'absolute', borderRadius: 9, paddingVertical: 5, paddingHorizontal: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  eventTime: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  eventName: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginTop: 3 },
  eventIntention: { color: '#FFFFFF', opacity: .83, fontSize: 10, marginTop: 4 },
});

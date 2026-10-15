import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, AppState, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEonwardDatabase } from '../../storage/use-database';
import type { Goal, GoalInput } from '../../domain/goals';
import {
  analyzeDayLoad, localDayBounds, localDayKey, monthGridDays, parseLocalDay, shiftLocalDay, type BlockInput, type TimeBlock,
} from '../../domain/timeblocks';
import { createGoal, getGoal, listAllGoals } from '../../storage/goals';
import { listDayBlocks, listRangeBlocks, removeBlock, saveBlock } from '../../storage/timeblocks';
import { colors, depth, radius, spacing } from '../../theme/tokens';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ListPlus from 'lucide-react-native/icons/list-plus';
import Plus from 'lucide-react-native/icons/plus';
import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right';
import X from 'lucide-react-native/icons/x';
import { DayTimeline } from './DayTimeline';
import { RecoverySheet } from './RecoverySheet';
import { applyReplan, canUndoReplan, undoReplan } from '../../storage/replan';
import type { ReplanPreview } from '../../domain/replan';
import { listFocusHistoryBetween } from '../../storage/focus';
import { WeekOverview } from './WeekOverview';
import { MonthOverview } from './MonthOverview';
import { useFocusSession } from '../focus/FocusProvider';
import { TimeBlockEditor } from './TimeBlockEditor';
import { GoalEditor } from '../horizons/GoalEditor';
import { DateTimeField } from '../shared/DateTimeField';

type Palette = typeof colors.light | typeof colors.dark;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
function dateHeading(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }).format(date);
}
function weekOf(day: Date): Date[] {
  const weekday = (day.getDay() + 6) % 7;
  const start = shiftLocalDay(day, -weekday);
  return Array.from({ length: 7 }, (_, i) => shiftLocalDay(start, i));
}
function timeLabel(value: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60), m = Math.round(minutes % 60);
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
}

export function CalendarScreen() {
  const db = useEonwardDatabase();
  const focus = useFocusSession();
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const palette: Palette = useColorScheme() === 'dark' ? colors.dark : colors.light;
  const [day, setDay] = useState(() => new Date());
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [actualByBlock, setActualByBlock] = useState<Record<string, number>>({});
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [hasUndo, setHasUndo] = useState(false);
  const [weekBlocks, setWeekBlocks] = useState<TimeBlock[]>([]);
  const [monthBlocks, setMonthBlocks] = useState<TimeBlock[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const writeLock = useRef(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [chosenGoal, setChosenGoal] = useState<string | null>(null);
  const [suggestedHour, setSuggestedHour] = useState<number | null>(null);
  const [mode, setMode] = useState<'timeline' | 'week' | 'month' | 'list'>('timeline');
  const usedGoalParam = useRef<string | null>(null);
  const key = localDayKey(day);
  const week = useMemo(() => weekOf(day), [key]);
  const [todayKey, setTodayKey] = useState(() => localDayKey(new Date()));
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    const updateToday = () => setTodayKey(localDayKey(new Date()));
    const interval = setInterval(updateToday, 60000);
    const listener = AppState.addEventListener('change', (state) => {
      // A timezone change can alter day boundaries without changing the visible date key.
      if (state === 'active') { updateToday(); refresh(); }
    });
    return () => { clearInterval(interval); listener.remove(); };
  }, [refresh]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => {
    if (!hasUndo) return;
    // Keep the ephemeral Undo action aligned with the five-minute SQLite safety window.
    const timer = setInterval(() => {
      void canUndoReplan(db).then(setHasUndo).catch(() => setHasUndo(false));
    }, 30000);
    return () => clearInterval(timer);
  }, [db, hasUndo]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const weekFrom = localDayBounds(week[0]).from;
    const weekTo = localDayBounds(week[6]).to;
    const grid = monthGridDays(day);
    const monthFrom = localDayBounds(grid[0]).from;
    const monthTo = localDayBounds(grid[grid.length - 1]).to;
    void Promise.all([listDayBlocks(db, day), listRangeBlocks(db, weekFrom, weekTo),
      listRangeBlocks(db, monthFrom, monthTo), listAllGoals(db),
      listFocusHistoryBetween(db, Date.parse(localDayBounds(day).from), Date.parse(localDayBounds(day).to)),
      canUndoReplan(db)])
      .then(([saved, weekSaved, monthSaved, all, sessions, undo]) => {
      if (!active) return;
      setBlocks(saved);
      const totals: Record<string, number> = {};
      for (const session of sessions) if (session.blockId) {
        totals[session.blockId] = (totals[session.blockId] ?? 0) + session.focusedMs;
      }
      setActualByBlock(totals);
      setHasUndo(undo);
      setWeekBlocks(weekSaved);
      setMonthBlocks(monthSaved);
      setGoals(all);
      setFailure(null);
    }).catch((error: unknown) => {
      if (active) setFailure(error instanceof Error ? error.message : 'Could not load your schedule.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [db, key, revision, focus.session?.blockId, focus.session?.status]);

  useEffect(() => {
    if (!goalId) { usedGoalParam.current = null; return; }
    if (usedGoalParam.current === goalId) return;
    let active = true;
    void getGoal(db, goalId).then((goal) => {
      if (!active) return;
      usedGoalParam.current = goalId;
      // Consume this deep-link parameter so opening the same goal again works.
      router.setParams({ goalId: undefined });
      if (goal) {
        setEditingBlock(null);
        setChosenGoal(goal.id);
        setSuggestedHour(null);
        setEditorOpen(true);
      } else Alert.alert('Goal unavailable', 'Only active goals can be scheduled.');
    }).catch(() => {
      if (active) Alert.alert('Could not open goal', 'Try opening Calendar again.');
    });
    return () => { active = false; };
  }, [db, goalId, router]);

  const ordered = useMemo(() => [...blocks].sort((a, b) => a.startAt.localeCompare(b.startAt)), [blocks]);
  const dayBounds = localDayBounds(day);
  const localDayHours = (Date.parse(dayBounds.to) - Date.parse(dayBounds.from)) / 3_600_000;
  const dayLoad = useMemo(() => analyzeDayLoad(blocks, day), [blocks, key]);
  const totalMinutes = dayLoad.reservedMinutes;
  const weekFromMs = Date.parse(localDayBounds(week[0]).from);
  const weekToMs = Date.parse(localDayBounds(week[6]).to);
  const weekTotalMinutes = weekBlocks.reduce((sum, block) => sum + Math.max(0,
    Math.min(Date.parse(block.endAt), weekToMs) - Math.max(Date.parse(block.startAt), weekFromMs),
  ) / 60000, 0);
  const monthFromMs = new Date(day.getFullYear(), day.getMonth(), 1).getTime();
  const monthToMs = new Date(day.getFullYear(), day.getMonth() + 1, 1).getTime();
  const monthTotalMinutes = monthBlocks.reduce((sum, block) => sum + Math.max(0,
    Math.min(Date.parse(block.endAt), monthToMs) - Math.max(Date.parse(block.startAt), monthFromMs),
  ) / 60000, 0);
  const monthBlockCount = monthBlocks.filter((block) =>
    Date.parse(block.startAt) < monthToMs && Date.parse(block.endAt) > monthFromMs).length;
  const weekBlockCount = weekBlocks.filter((block) =>
    Date.parse(block.startAt) < weekToMs && Date.parse(block.endAt) > weekFromMs).length;
  const untimed = goals.filter((goal) => !goal.inbox && !goal.completed && goal.horizon === 'day' && goal.periodKey === key && !blocks.some((block) => block.goalId === goal.id));
  const completedGoals = new Set(blocks.filter((block) => block.goalCompleted)
    .map((block) => block.goalId)).size;
  async function write(action: () => Promise<void>) {
    // React state updates are asynchronous: guard rapid double-taps synchronously.
    if (writeLock.current) return;
    writeLock.current = true;
    setBusy(true);
    try { await action(); refresh(); }
    catch (error) { Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.'); }
    finally {
      writeLock.current = false;
      setBusy(false);
    }
  }
  function createAt(hour: number | null = null) {
    if (!goals.length) {
      setSuggestedHour(hour);
      setNewGoalOpen(true);
      return;
    }
    setEditingBlock(null);
    setChosenGoal(null);
    setSuggestedHour(hour);
    setEditorOpen(true);
  }
  async function saveNewGoal(input: GoalInput): Promise<void> {
    if (writeLock.current) return;
    writeLock.current = true;
    setBusy(true);
    try {
      const id = await createGoal(db, input);
      const updated = await listAllGoals(db);
      setGoals(updated);
      setNewGoalOpen(false);
      refresh();
      Alert.alert('Goal created', 'This goal is now available across Eonward.', [
        { text: 'Keep planning', style: 'cancel' },
        { text: 'Schedule time', onPress: () => {
          setEditingBlock(null);
          setChosenGoal(id);
          setEditorOpen(true);
        } },
      ]);
    } catch (error) {
      Alert.alert('Could not create goal', error instanceof Error ? error.message : 'Try again.');
    } finally {
      writeLock.current = false;
      setBusy(false);
    }
  }
  function edit(block: TimeBlock) {
    setEditingBlock(block);
    setChosenGoal(block.goalId);
    setSuggestedHour(null);
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
    Alert.alert('Remove this time block?', 'The linked goal will remain in Horizons and Boards.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove time', style: 'destructive', onPress: () => void write(async () => {
        await removeBlock(db, block.id);
        await focus.refresh();
      }) },
    ]);
  }
  function startFocus(block: TimeBlock) {
    if (focus.busy) return;
    const begin = (replace = false) => {
      void focus.begin(block.id, replace).then(() => setEditorOpen(false))
        .catch((error: unknown) => {
          Alert.alert('Could not start focus', error instanceof Error ? error.message : 'Try again.');
        });
    };
    if (focus.session) {
      Alert.alert('Replace current focus?', 'Starting this Timebox will end your existing focus session. Its goal remains unchanged.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start new timebox', onPress: () => begin(true) },
      ]);
    } else begin();
  }
  function applyPreview(preview: ReplanPreview) {
    return write(async () => { await applyReplan(db, preview, blocks); setRecoveryOpen(false); });
  }
  function undoPreview() { return write(async () => { await undoReplan(db); }); }
  const foreground = palette.foreground;
  return (
    <SafeAreaView edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: palette.background }]}>
      <View style={styles.top}>
        <View style={styles.navigation}>

          <View style={styles.brandGroup}>
            <Text style={[styles.brandLabel, { color: palette.muted }]}>EONWARD</Text>
            <Text style={[styles.brand, { color: foreground }]}>Calendar</Text>
          </View>
          <Pressable onPress={() => setNewGoalOpen(true)} accessibilityRole="button"
            accessibilityLabel="Create a new goal from calendar"
            style={styles.newGoal}>
            <ListPlus size={22} color={palette.foreground} strokeWidth={1.8} />
          </Pressable>
          <Pressable onPress={() => { setDay(new Date()); setMode('timeline'); }} accessibilityRole="button"
            accessibilityLabel="Go to today's timeline" style={[styles.todayPill, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.todayLabel, { color: palette.accent }]}>Today</Text>
          </Pressable>
          <Pressable onPress={() => createAt()} accessibilityRole="button"
            accessibilityLabel="Plan a time block" style={[styles.create, { backgroundColor: palette.accent }]}>
            <Plus size={23} color={palette.onAccent} strokeWidth={1.8} />
          </Pressable>
        </View>
        <View style={styles.dateTitleRow}>
          <View style={styles.dateTitleGroup}>
            <DateTimeField value={key} label="Calendar date" variant="inline"
              displayValue={mode === 'month'
                ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(day)
                : dateHeading(day)} onChange={(value) => { const selected = parseLocalDay(value); if (selected) setDay(selected); }} />
          </View>
          <View style={styles.weekArrows}>
            <Pressable style={styles.weekArrow} accessibilityRole="button" accessibilityLabel={mode === "month" ? "Previous month" : "Previous week"}
              onPress={() => setDay((current) => mode === 'month'
                ? new Date(current.getFullYear(), current.getMonth() - 1, 1, 12)
                : shiftLocalDay(current, -7))}>
              <ChevronLeft size={21} color={foreground} strokeWidth={1.8} />
            </Pressable>
            <Pressable style={styles.weekArrow} accessibilityRole="button" accessibilityLabel={mode === "month" ? "Next month" : "Next week"}
              onPress={() => setDay((current) => mode === 'month'
                ? new Date(current.getFullYear(), current.getMonth() + 1, 1, 12)
                : shiftLocalDay(current, 7))}>
              <ChevronRight size={21} color={foreground} strokeWidth={1.8} />
            </Pressable>
          </View>
        </View>
        {mode !== 'month' ? <View style={styles.weekStrip}>
          {week.map((date, index) => {
            const selected = localDayKey(date) === key;
            const today = localDayKey(date) === todayKey;
            return (
              <Pressable key={localDayKey(date)} accessibilityRole="button"
                accessibilityLabel={dateHeading(date)}
                accessibilityState={{ selected }}
                onPress={() => setDay(date)} style={styles.weekDay}>
                <Text style={[styles.weekName, { color: selected ? foreground : palette.muted }]}>{WEEKDAYS[index]}</Text>
                <View style={[styles.dayCircle, selected && { backgroundColor: palette.accentSoft }]}>
                  <Text style={[styles.dayNumber, { color: selected ? palette.accent : foreground }]}>
                    {date.getDate()}
                  </Text>
                </View>
                <View style={[styles.todayDot, { backgroundColor: today ? palette.accent : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View> : null}
        <View style={[styles.summaryRow, { borderColor: palette.border }]}>
          <View style={styles.summaryStats}>
            <Text style={[styles.summaryValue, { color: foreground }]}>{durationLabel(mode === 'month' ? monthTotalMinutes
                : mode === 'week' ? weekTotalMinutes : totalMinutes)}
              <Text style={[styles.summaryLabel, { color: palette.muted }]}> planned</Text>
            </Text>
            <Text style={[styles.summarySecond, { color: palette.muted }]}>
              {mode === 'month' ? monthBlockCount : mode === 'week' ? weekBlockCount : blocks.length} {
                (mode === 'month' ? monthBlockCount : mode === 'week' ? weekBlockCount : blocks.length) === 1 ? 'block' : 'blocks'
              } · {mode === 'month' ? 'this month' : mode === 'week' ? 'this week' :
                dayLoad.overlapMinutes ? durationLabel(dayLoad.overlapMinutes) + ' overlapping' :
                  completedGoals + ' linked goals done'}
            </Text>
          </View>
          <View style={[styles.viewToggle, { backgroundColor: palette.inset }]}>
            {(['timeline', 'week', 'month', 'list'] as const).map((item) => (
              <Pressable key={item} accessibilityRole="button"
                accessibilityState={{ selected: mode === item }}
                onPress={() => setMode(item)}
                style={[styles.modeButton, mode === item && { backgroundColor: palette.surface, boxShadow: palette === colors.dark ? depth.dark.control : depth.light.control }]}>
                <Text style={[styles.modeText, { color: mode === item ? foreground : palette.muted }]}>
                  {item === 'timeline' ? 'Day' : item === 'week' ? 'Week' : item === 'month' ? 'Month' : 'List'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {mode === 'timeline' && key === todayKey ? <View
          style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Pressable accessibilityRole="button" onPress={() => setRecoveryOpen(true)}
            style={{ minHeight: 48, justifyContent: 'center', flex: 1 }}>
            <Text style={{ color: palette.accent, fontWeight: '700', fontSize: 13 }}>↝  Preview day recovery</Text>
          </Pressable>
          {hasUndo ? <Pressable accessibilityRole="button" disabled={busy}
            onPress={() => { void undoPreview(); }} style={{ minHeight: 48, justifyContent: 'center' }}>
            <Text style={{ color: palette.foreground, fontSize: 13 }}>Undo replan ↶</Text>
          </Pressable> : null}
        </View> : null}
        {untimed.length > 0 && (mode === 'timeline' || mode === 'list') ? <Pressable accessibilityRole="button"
          accessibilityLabel="View goals without a time" onPress={() => setMode('list')} style={{ minHeight: 48, justifyContent: 'center' }}>
          <Text style={{ color: palette.accent, fontSize: 12 }}>{untimed.length} goal{untimed.length === 1 ? '' : 's'} without a time · Plan when ready →</Text>
        </Pressable> : null}
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={palette.accent} /></View>
      ) : failure ? (
        <View style={[styles.error, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={{ color: foreground }}>{failure}</Text>
          <Pressable onPress={refresh} accessibilityRole="button" style={styles.retry}>
            <Text style={{ color: palette.accent, fontWeight: '700' }}>Try again</Text>
          </Pressable>
        </View>
      ) : mode === 'timeline' ? (
        <View style={styles.timelineArea}>
          {localDayHours !== 24 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="View schedule list for daylight saving time change"
              onPress={() => setMode('list')}
              style={[styles.clockChangeNotice, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.clockChangeText, { color: palette.foreground }]}>
                Clock change today · This day has {localDayHours} actual hours. The timeline uses wall-clock positions; open List for exact times →
              </Text>
            </Pressable>
          ) : null}
          <DayTimeline date={day} blocks={ordered} palette={palette}
            actualByBlock={actualByBlock} activeSession={focus.session}
            isDark={palette === colors.dark} onEdit={edit} onQuickAdd={(hour) => createAt(hour)}
            onOpenGoal={(id) => router.push({ pathname: '/', params: { goalId: id } })} />
        </View>
      ) : mode === 'week' ? (
        <WeekOverview days={week} blocks={weekBlocks} selectedDay={key} palette={palette}
          onSelectDay={(selected) => { setDay(selected); setMode('timeline'); }} />
      ) : mode === 'month' ? (
        <MonthOverview month={day} blocks={monthBlocks} todayKey={todayKey} selectedKey={key}
          palette={palette} onSelectDay={(selected) => { setDay(selected); setMode('timeline'); }} />
      ) : (
        <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
          {untimed.length > 0 ? <>
            <Text style={[styles.listHeading, { color: foreground }]}>Without a time</Text>
            {untimed.map((goal) => <Pressable key={goal.id} accessibilityRole="button" accessibilityLabel={`Plan time for ${goal.title}`}
              onPress={() => { setEditingBlock(null); setChosenGoal(goal.id); setSuggestedHour(null); setEditorOpen(true); }}
              style={[styles.listCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              <Text style={{ flex: 1, color: foreground, fontSize: 14 }}>{goal.title}</Text>
              <Text style={{ color: palette.accent, fontSize: 12 }}>Plan time →</Text>
            </Pressable>)}
          </> : null}
          <Text style={[styles.listHeading, { color: foreground }]}>Reserved time</Text>
          {!ordered.length ? (
            <View style={[styles.empty, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              <Text style={[styles.emptyTitle, { color: foreground }]}>A clear day ahead.</Text>
              <Text style={[styles.emptyCopy, { color: palette.muted }]}>
                Reserve an hour for any goal. It will appear here and in the timeline.
              </Text>
              <Pressable onPress={() => createAt()} accessibilityRole="button" style={styles.emptyAction}>
                <Text style={[styles.emptyActionLabel, { color: palette.accent }]}>＋ Plan your first block</Text>
              </Pressable>
            </View>
          ) : ordered.map((block) => (
            <View key={block.id} style={[styles.listCard, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              <View style={[styles.listStripe, { backgroundColor: block.kind === 'box' ? '#B38850' : palette.accent }]} />
              <Pressable onPress={() => edit(block)} accessibilityRole="button" style={styles.listCopy}
                accessibilityLabel={`Edit time for ${block.goalTitle}`}>
                <Text numberOfLines={1} style={[styles.listTitle, { color: foreground }]}>{block.goalTitle}</Text>
                <Text style={[styles.listTime, { color: palette.accent }]}>
                  {timeLabel(block.startAt)} – {timeLabel(block.endAt)}{
                    localDayKey(new Date(block.endAt)) !== localDayKey(new Date(block.startAt)) ? ' (+1 day)' : ''
                  } ·
                  {' '}{durationLabel((new Date(block.endAt).getTime() - new Date(block.startAt).getTime()) / 60000)}
                </Text>
                {block.intention ? <Text numberOfLines={2} style={[styles.listIntention, { color: palette.muted }]}>{block.intention}</Text> : null}
                <Text style={[styles.listType, { color: palette.muted }]}>
                  {block.kind === 'box' ? 'TIMEBOX' : 'TIME BLOCK'} · {block.flexible ? 'FLEXIBLE' : 'PROTECTED'}{block.goalCompleted ? '  ·  COMPLETE' : ''}
                  {localDayKey(new Date(block.startAt)) !== key ? '  ·  CONTINUED FROM PREVIOUS DAY' : ''}
                </Text>
              </Pressable>
              <View style={styles.listActions}>
                {block.kind === 'box' && !block.goalCompleted ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Start focus timer for ${block.goalTitle}`}
                    disabled={focus.busy} onPress={() => startFocus(block)} style={styles.startFocus}>
                    <Text style={[styles.startFocusLabel, { color: palette.accent }]}>Start</Text>
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" accessibilityLabel={`Open ${block.goalTitle}`}
                  onPress={() => router.push({ pathname: '/', params: { goalId: block.goalId } })} style={styles.action}>
                  <ArrowUpRight size={20} color={palette.accent} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${block.goalTitle} time block`}
                  onPress={() => remove(block)} style={styles.action}>
                  <X size={20} color={palette.muted} />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      <RecoverySheet visible={recoveryOpen} day={day} blocks={ordered} palette={palette}
        busy={busy} activeBlockId={focus.session?.blockId ?? null}
        onClose={() => { if (!busy) setRecoveryOpen(false); }}
        onApply={(preview) => { void applyPreview(preview); }} />
      <GoalEditor visible={newGoalOpen} initial={null} parent={null} parentOptions={goals}
        defaultHorizon="day" anchorDate={day} palette={palette} saving={busy}
        onDismiss={() => { if (!busy) setNewGoalOpen(false); }} onSave={saveNewGoal} />
      <TimeBlockEditor visible={editorOpen} date={day} goals={goals}
        initial={editingBlock} suggestedGoalId={chosenGoal}
        suggestedStartHour={suggestedHour}
        palette={palette} saving={busy} activeBlockId={focus.session?.blockId ?? null}
        onCancel={() => { if (!busy) { setEditorOpen(false); setEditingBlock(null); } }}
        onSave={save} onStartFocus={startFocus} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { paddingHorizontal: 20, paddingTop: 20 },
  navigation: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandGroup: { flex: 1, gap: 10 },
  brandLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 2.3 },
  brand: { fontSize: 28, fontWeight: '700', letterSpacing: -1 },
  newGoal: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' },
  todayPill: { borderRadius: radius.md, minHeight: 48, paddingHorizontal: 12, borderWidth: 1, justifyContent: 'center' },
  todayLabel: { fontSize: 12, fontWeight: '700' },
  create: { width: 48, height: 48, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  dateTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2, paddingBottom: 2 },
  dateTitleGroup: { flex: 1, gap: 4 },
  weekArrows: { flexDirection: 'row', gap: 2 },
  weekArrow: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  weekStrip: { flexDirection: 'row', marginBottom: 8 },
  weekDay: { flex: 1, minHeight: 64, alignItems: 'center', gap: 5, justifyContent: 'center' },
  weekName: { fontSize: 11, fontWeight: '600' },
  dayCircle: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dayNumber: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  todayDot: { width: 4, height: 4, borderRadius: 2 },
  summaryRow: { flexDirection: 'column', alignItems: 'stretch', gap: 8, paddingVertical: 7, borderBottomWidth: 1 },
  summaryStats: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  summaryValue: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  summaryLabel: { fontSize: 12, fontWeight: '400' },
  summarySecond: { fontSize: 11 },
  viewToggle: { flexDirection: 'row', padding: 4, gap: 3, borderRadius: 14 },
  modeButton: { flex: 1, paddingHorizontal: 9, minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modeText: { fontSize: 12, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { borderWidth: 1, borderRadius: radius.lg, margin: 16, padding: 22, gap: 12 },
  retry: { minHeight: 46, justifyContent: 'center' },
  timelineArea: { flex: 1, paddingHorizontal: spacing.md, paddingBottom: 8 },
  clockChangeNotice: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 13, paddingVertical: 9, justifyContent: 'center' },
  clockChangeText: { fontSize: 11, fontWeight: '600', lineHeight: 16 },
  listScroll: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingTop: 21, paddingBottom: 36, gap: 11 },
  listHeading: { fontSize: 19, fontWeight: '700', marginBottom: 9 },
  empty: { borderWidth: 1, borderRadius: radius.xl, padding: 22, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyCopy: { fontSize: 14, lineHeight: 23 },
  emptyAction: { minHeight: 50, justifyContent: 'center' },
  emptyActionLabel: { fontSize: 14, fontWeight: '700' },
  listCard: { flexDirection: 'row', alignItems: 'center', minHeight: 90, borderWidth: 1, borderRadius: radius.lg, padding: 12, gap: 11 },
  listStripe: { alignSelf: 'stretch', width: 4, borderRadius: 2 },
  listCopy: { flex: 1, gap: 5, paddingVertical: 6 },
  listTitle: { fontSize: 15, fontWeight: '700' },
  listTime: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  listIntention: { fontSize: 12, lineHeight: 18 },
  listType: { fontSize: 9, fontWeight: '700', letterSpacing: 0.9 },
  listActions: { gap: 2, alignItems: 'center' },
  startFocus: { minHeight: 43, minWidth: 50, justifyContent: 'center', alignItems: 'center' },
  startFocusLabel: { fontSize: 12, fontWeight: '800' },
  action: { width: 43, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  actionGlyph: { fontSize: 21 },
});

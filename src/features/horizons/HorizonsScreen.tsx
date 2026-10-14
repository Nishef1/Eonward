import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { HORIZONS, HORIZON_TITLES, periodKey, periodLabel, shiftPeriod, type Horizon } from '../../domain/horizons';
import type { Goal, GoalInput } from '../../domain/goals';
import { createGoal, editGoal, listChildGoals, listGoals, removeGoal, setGoalCompleted } from '../../storage/goals';
import { colors, radius, spacing } from '../../theme/tokens';
import { GoalDetails } from './GoalDetails';
import { GoalEditor } from './GoalEditor';

type Palette = typeof colors.light | typeof colors.dark;

function GoalCard({
  goal, palette, onOpen, onToggle, disabled,
}: {
  goal: Goal;
  palette: Palette;
  onOpen: () => void;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <View style={[styles.goalCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: goal.completed, disabled }}
        accessibilityLabel={`${goal.completed ? 'Reopen' : 'Complete'} ${goal.title}`}
        disabled={disabled}
        onPress={onToggle}
        style={styles.checkboxTouch}
        hitSlop={4}
      >
        <View style={[styles.checkbox, { borderColor: goal.completed ? palette.accent : palette.muted, backgroundColor: goal.completed ? palette.accent : 'transparent' }]}>
          {goal.completed ? <Text style={styles.checkboxTick}>✓</Text> : null}
        </View>
      </Pressable>
      <Pressable style={styles.cardContent} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${goal.title}`}>
        <Text
          numberOfLines={2}
          style={[styles.goalTitle, { color: palette.foreground, textDecorationLine: goal.completed ? 'line-through' : 'none', opacity: goal.completed ? 0.56 : 1 }]}
        >
          {goal.title}
        </Text>
        {goal.notes || goal.childrenCount > 0 ? (
          <Text numberOfLines={1} style={[styles.goalSubtitle, { color: palette.muted }]}>
            {goal.childrenCount > 0 ? `${goal.childrenCount} next step${goal.childrenCount === 1 ? '' : 's'}` : goal.notes}
          </Text>
        ) : null}
      </Pressable>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`View details for ${goal.title}`} style={styles.chevronTouch}>
        <Text style={[styles.chevron, { color: palette.muted }]}>›</Text>
      </Pressable>
    </View>
  );
}

export function HorizonsScreen() {
  const db = useSQLiteContext();
  const palette = useColorScheme() === 'dark' ? colors.dark : colors.light;
  const [horizon, setHorizon] = useState<Horizon>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [working, setWorking] = useState(false);
  const [details, setDetails] = useState<Goal | null>(null);
  const [children, setChildren] = useState<Goal[]>([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [parent, setParent] = useState<Goal | null>(null);
  const key = periodKey(horizon, anchor);
  const caption = periodLabel(horizon, anchor);
  const doneCount = useMemo(() => goals.filter((g) => g.completed).length, [goals]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listGoals(db, horizon, key);
      setGoals(result);
      setFailure(null);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Unable to load your goals.');
    } finally {
      setLoading(false);
    }
  }, [db, horizon, key]);

  useEffect(() => {
    // The revision token refreshes the current horizon after a write.
    void load();
  }, [load, revision]);

  async function perform(action: () => Promise<void>): Promise<void> {
    if (working) return;
    setWorking(true);
    try {
      await action();
      setRevision((value) => value + 1);
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setWorking(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setParent(null);
    setEditorVisible(true);
  }

  async function openDetails(goal: Goal) {
    setDetails(goal);
    setChildren([]);
    try {
      const nextSteps = await listChildGoals(db, goal.id);
      setChildren(nextSteps);
    } catch (error) {
      Alert.alert('Could not load steps', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  async function saveGoal(input: GoalInput) {
    if (working) return;
    await perform(async () => {
      if (editing) {
        await editGoal(db, editing.id, input);
      } else {
        await createGoal(db, input);
      }
      setEditorVisible(false);
      setEditing(null);
      setParent(null);
    });
  }

  function editSelected() {
    setEditing(details);
    setParent(null);
    setDetails(null);
    setEditorVisible(true);
  }

  function addChild() {
    setParent(details);
    setEditing(null);
    setDetails(null);
    setEditorVisible(true);
  }

  async function toggle(goal: Goal) {
    if (working) return;
    const completed = !goal.completed;
    await perform(async () => {
      await setGoalCompleted(db, goal.id, completed);
      setDetails((current) => current?.id === goal.id ? { ...current, completed } : current);
      setChildren((items) => items.map((item) => item.id === goal.id ? { ...item, completed } : item));
    });
  }

  function confirmRemove() {
    if (!details) return;
    const id = details.id;
    Alert.alert(
      'Delete this goal?',
      'This cannot be undone. Existing next steps will remain as independent goals.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void perform(async () => {
            await removeGoal(db, id);
            setDetails(null);
            setChildren([]);
          }),
        },
      ],
    );
  }

  const header = (
    <View>
      <View style={styles.brandRow}>
        <View style={styles.brandBlock}>
          <View style={[styles.brandMark, { backgroundColor: palette.accent }]} />
          <Text style={[styles.brand, { color: palette.foreground }]}>EONWARD</Text>
        </View>
        <Text style={[styles.today, { color: palette.muted }]}>
          {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date())}
        </Text>
      </View>
      <Text style={[styles.eyebrow, { color: palette.accent }]}>YOUR TIME, IN PERSPECTIVE</Text>
      <Text style={[styles.heroTitle, { color: palette.foreground }]}>Horizons<Text style={{ color: palette.accent }}>.</Text></Text>
      <Text style={[styles.heroSubtitle, { color: palette.muted }]}>
        Make room for what matters, today and beyond.
      </Text>

      <FlatList
        data={HORIZONS}
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        style={styles.horizonList}
        contentContainerStyle={styles.horizonItems}
        renderItem={({ item }) => {
          const selected = item === horizon;
          return (
            <Pressable
              onPress={() => setHorizon(item)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.horizonChip, { backgroundColor: selected ? palette.foreground : palette.surface, borderColor: selected ? palette.foreground : palette.border }]}
            >
              <Text style={[styles.horizonChipText, { color: selected ? palette.background : palette.foreground }]}>{HORIZON_TITLES[item]}</Text>
            </Pressable>
          );
        }}
      />

      <View style={[styles.periodPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.periodLine}>
          <View style={styles.periodCopy}>
            <Text style={[styles.periodEyebrow, { color: palette.muted }]}>YOUR {HORIZON_TITLES[horizon].toUpperCase()}</Text>
            <Text style={[styles.periodText, { color: palette.foreground }]} numberOfLines={2}>{caption}</Text>
          </View>
          {horizon !== 'life' ? (
            <View style={styles.periodActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous period"
                onPress={() => setAnchor((date) => shiftPeriod(horizon, date, -1))}
                style={[styles.periodButton, { borderColor: palette.border }]}
              >
                <Text style={[styles.periodArrow, { color: palette.foreground }]}>‹</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next period"
                onPress={() => setAnchor((date) => shiftPeriod(horizon, date, 1))}
                style={[styles.periodButton, { borderColor: palette.border }]}
              >
                <Text style={[styles.periodArrow, { color: palette.foreground }]}>›</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
          <View style={[styles.progressFill, { backgroundColor: palette.accent, width: goals.length ? `${doneCount / goals.length * 100}%` : '0%' }]} />
        </View>
        <View style={styles.progressRow}>
          <Text style={[styles.progressLabel, { color: palette.muted }]}>{goals.length === 0 ? 'Start with one meaningful goal' : `${goals.length - doneCount} open · ${doneCount} completed`}</Text>
          <Pressable onPress={() => setAnchor(new Date())} accessibilityRole="button" accessibilityLabel="Return to current period">
            <Text style={[styles.jumpToday, { color: palette.accent }]}>NOW ↗</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.foreground }]}>Your intentions</Text>
        <Text style={[styles.sectionCount, { color: palette.muted }]}>{goals.length}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <FlatList
        data={loading || failure ? [] : goals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GoalCard
            goal={item}
            palette={palette}
            disabled={working}
            onOpen={() => void openDetails(item)}
            onToggle={() => void toggle(item)}
          />
        )}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={palette.accent} size="large" style={styles.wait} />
          ) : failure ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: palette.foreground }]}>Couldn't load this horizon</Text>
              <Text style={[styles.emptyBody, { color: palette.muted }]}>{failure}</Text>
              <Pressable onPress={() => void load()} accessibilityRole="button">
                <Text style={[styles.retry, { color: palette.accent }]}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={[styles.emptySymbol, { borderColor: palette.border }]}>
                <Text style={[styles.emptySpark, { color: palette.accent }]}>✳</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: palette.foreground }]}>Space for something good.</Text>
              <Text style={[styles.emptyBody, { color: palette.muted }]}>
                Every meaningful plan begins with a single intention.
              </Text>
            </View>
          )
        }
      />
      <View style={[styles.footer, { borderColor: palette.border, backgroundColor: palette.background }]}>
        <View style={styles.footerCopy}>
          <Text style={[styles.footerStrong, { color: palette.foreground }]}>One step at a time</Text>
          <Text style={[styles.footerHint, { color: palette.muted }]}>Your plans stay on this device.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create new goal"
          onPress={openCreate}
          style={[styles.newButton, { backgroundColor: palette.accent }]}
        >
          <Text style={styles.newButtonText}>＋  New goal</Text>
        </Pressable>
      </View>
      <GoalDetails
        goal={details}
        children={children}
        palette={palette}
        onClose={() => setDetails(null)}
        onEdit={editSelected}
        onAddStep={addChild}
        onToggle={(goal) => void toggle(goal)}
        onRemove={confirmRemove}
      />
      <GoalEditor
        visible={editorVisible}
        initial={editing}
        parent={parent}
        defaultHorizon={parent ? 'day' : horizon}
        anchorDate={parent ? new Date() : anchor}
        palette={palette}
        saving={working}
        onDismiss={() => { if (!working) setEditorVisible(false); }}
        onSave={saveGoal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 32 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 35 },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { height: 15, width: 15, borderTopLeftRadius: 8, borderBottomRightRadius: 8, transform: [{ rotate: '45deg' }] },
  brand: { fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  today: { fontSize: 12, fontWeight: '600' },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, marginBottom: 6 },
  heroTitle: { fontSize: 42, fontWeight: '700', letterSpacing: -2, lineHeight: 52 },
  heroSubtitle: { fontSize: 14, lineHeight: 22, marginTop: 2 },
  horizonList: { marginTop: 30, marginHorizontal: -spacing.lg, marginBottom: spacing.lg },
  horizonItems: { paddingHorizontal: spacing.lg, gap: 8 },
  horizonChip: { minHeight: 43, minWidth: 61, paddingHorizontal: 15, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  horizonChipText: { fontSize: 13, fontWeight: '600' },
  periodPanel: { borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1 },
  periodLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  periodCopy: { flex: 1, gap: 5 },
  periodEyebrow: { fontSize: 10, letterSpacing: 1.2, fontWeight: '700' },
  periodText: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  periodActions: { flexDirection: 'row', gap: 6 },
  periodButton: { borderWidth: 1, borderRadius: radius.md, height: 40, width: 38, justifyContent: 'center', alignItems: 'center' },
  periodArrow: { fontSize: 29, lineHeight: 32 },
  progressTrack: { height: 5, borderRadius: 3, marginTop: 22, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 12 },
  progressLabel: { fontSize: 11 },
  jumpToday: { fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 29, marginBottom: 13 },
  sectionTitle: { fontSize: 19, fontWeight: '700', letterSpacing: -0.5 },
  sectionCount: { fontSize: 12 },
  goalCard: { borderWidth: 1, borderRadius: radius.lg, marginBottom: 10, flexDirection: 'row', alignItems: 'center', minHeight: 76, padding: 11 },
  checkboxTouch: { height: 48, width: 42, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  checkboxTick: { color: '#FFFFFF', fontWeight: '700' },
  cardContent: { flex: 1, paddingVertical: 9, gap: 6 },
  goalTitle: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  goalSubtitle: { fontSize: 12 },
  chevronTouch: { width: 33, height: 48, alignItems: 'center', justifyContent: 'center' },
  chevron: { fontSize: 29 },
  empty: { paddingTop: 45, alignItems: 'center', gap: 13, paddingHorizontal: spacing.md },
  emptySymbol: { height: 68, width: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptySpark: { fontSize: 28 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', letterSpacing: -0.4 },
  emptyBody: { fontSize: 13, lineHeight: 22, textAlign: 'center', maxWidth: 240 },
  wait: { marginTop: 60 },
  retry: { padding: 10, fontWeight: '700', fontSize: 14 },
  footer: { borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerCopy: { flex: 1, gap: 4 },
  footerStrong: { fontSize: 12, fontWeight: '700' },
  footerHint: { fontSize: 11 },
  newButton: { height: 48, borderRadius: radius.full, paddingHorizontal: 21, alignItems: 'center', justifyContent: 'center' },
  newButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { dateFromPeriodKey, HORIZONS, HORIZON_TITLES, periodKey, periodLabel, shiftPeriod, type Horizon } from '../../domain/horizons';
import { availableGoalParents, type Goal, type GoalInput } from '../../domain/goals';
import { buildPerspectiveSections } from '../../domain/perspective';
import { archiveGoal, createGoal, editGoal, getGoal, listAllGoals, listArchivedGoals, listChildGoals, listGoalAncestors, listGoals, listPerspectiveGoals, moveGoal, restoreGoal, setGoalCompleted } from '../../storage/goals';
import { colors, radius, spacing } from '../../theme/tokens';
import { GoalDetails } from './GoalDetails';
import { GoalEditor } from './GoalEditor';
import { PerspectiveView } from './PerspectiveView';
import { ArchiveView } from './ArchiveView';

type Palette = typeof colors.light | typeof colors.dark;

function GoalCard({
  goal, palette, onOpen, onToggle, onOrganize, disabled,
}: {
  goal: Goal;
  palette: Palette;
  onOpen: () => void;
  onToggle: () => void;
  onOrganize: () => void;
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
        {goal.parentTitle || goal.notes || goal.childrenCount > 0 ? (
          <Text numberOfLines={1} style={[styles.goalSubtitle, { color: palette.muted }]}>
            {goal.parentTitle
              ? `↳ ${goal.parentTitle}`
              : goal.childrenCount > 0
                ? `${goal.childrenCount} next step${goal.childrenCount === 1 ? '' : 's'}`
                : goal.notes}
          </Text>
        ) : null}
      </Pressable>
      <Pressable onPress={onOrganize} disabled={disabled} accessibilityRole="button"
        accessibilityLabel={`Organize ${goal.title}`} style={styles.chevronTouch}>
        <Text style={[styles.chevron, { color: palette.muted }]}>⋯</Text>
      </Pressable>
    </View>
  );
}

export function HorizonsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const openedFromBoard = useRef<string | null>(null);
  const palette = useColorScheme() === 'dark' ? colors.dark : colors.light;
  const [horizon, setHorizon] = useState<Horizon>('week');
  const [view, setView] = useState<'focus' | 'perspective' | 'archive'>('focus');
  const [anchor, setAnchor] = useState(() => new Date());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [perspectiveRevision, setPerspectiveRevision] = useState(0);
  const [perspectiveGoals, setPerspectiveGoals] = useState<Goal[]>([]);
  const [perspectiveLoading, setPerspectiveLoading] = useState(false);
  const [perspectiveError, setPerspectiveError] = useState<string | null>(null);
  const [archivedGoals, setArchivedGoals] = useState<Goal[]>([]);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveRevision, setArchiveRevision] = useState(0);
  const [working, setWorking] = useState(false);
  const [organizing, setOrganizing] = useState<Goal | null>(null);
  const [detailStack, setDetailStack] = useState<Goal[]>([]);
  const detailRequest = useRef(0);
  const details = detailStack[detailStack.length - 1] ?? null;
  const [parentOptions, setParentOptions] = useState<Goal[]>([]);
  const [children, setChildren] = useState<Goal[]>([]);
  const [ancestors, setAncestors] = useState<Goal[]>([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [parent, setParent] = useState<Goal | null>(null);
  const [editorContext, setEditorContext] = useState<{ horizon: Horizon; anchor: Date }>(
    () => ({ horizon: 'week', anchor: new Date() }),
  );
  const key = periodKey(horizon, anchor);
  const caption = periodLabel(horizon, anchor);
  const doneCount = useMemo(() => goals.filter((g) => g.completed).length, [goals]);

  const perspectiveSections = useMemo(
    () => buildPerspectiveSections(
      HORIZONS.map((item) => ({
        horizon: item,
        key: periodKey(item, anchor),
        label: periodLabel(item, anchor),
      })),
      perspectiveGoals,
    ),
    [anchor, perspectiveGoals],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    void listGoals(db, horizon, key).then((result) => {
      if (!active) return;
      setGoals(result);
      setFailure(null);
    }).catch((error: unknown) => {
      if (!active) return;
      setFailure(error instanceof Error ? error.message : 'Unable to load your goals.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [db, horizon, key, revision]);

  useEffect(() => {
    if (view !== 'perspective') return;
    let active = true;
    setPerspectiveLoading(true);
    void listPerspectiveGoals(db, anchor).then((result) => {
      if (!active) return;
      setPerspectiveGoals(result);
      setPerspectiveError(null);
    }).catch((error: unknown) => {
      if (!active) return;
      setPerspectiveError(error instanceof Error ? error.message : 'Unable to load the bigger picture.');
    }).finally(() => {
      if (active) setPerspectiveLoading(false);
    });
    return () => { active = false; };
  }, [db, anchor, revision, perspectiveRevision, view]);

  useEffect(() => {
    if (view !== 'archive') return;
    let active = true;
    setArchiveLoading(true);
    void listArchivedGoals(db).then((items) => {
      if (!active) return;
      setArchivedGoals(items);
      setArchiveError(null);
    }).catch((error: unknown) => {
      if (active) setArchiveError(error instanceof Error ? error.message : 'Unable to load your archive.');
    }).finally(() => {
      if (active) setArchiveLoading(false);
    });
    return () => { active = false; };
  }, [db, view, revision, archiveRevision]);

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

  async function openEditor(initial: Goal | null, selectedParent: Goal | null, targetHorizon: Horizon = horizon) {
    try {
      const options = await listAllGoals(db);
      setParentOptions(availableGoalParents(options, initial?.id ?? null));
      setEditing(initial);
      setParent(selectedParent);
      setEditorContext({ horizon: selectedParent ? 'day' : targetHorizon, anchor: new Date(anchor.getTime()) });
      detailRequest.current++;
      setDetailStack([]);
      setEditorVisible(true);
    } catch (error) {
      Alert.alert('Cannot open editor', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  function openCreate() {
    void openEditor(null, null, view === 'perspective' ? 'day' : horizon);
  }

  function openCreateForHorizon(target: Horizon) {
    void openEditor(null, null, target);
  }

  function focusHorizon(target: Horizon) {
    setHorizon(target);
    setView('focus');
  }

  async function openDetails(goal: Goal, nested = false) {
    const request = ++detailRequest.current;
    try {
      const [latest, nextSteps, parentPath] = await Promise.all([
        getGoal(db, goal.id),
        listChildGoals(db, goal.id),
        listGoalAncestors(db, goal.id),
      ]);
      if (request !== detailRequest.current) return;
      if (!latest) {
        Alert.alert('Goal unavailable', 'This goal may have been deleted.');
        return;
      }
      setDetailStack((current) => nested ? [...current, latest] : [latest]);
      setChildren(nextSteps);
      setAncestors(parentPath);
    } catch (error) {
      if (request === detailRequest.current) {
        Alert.alert('Could not load goal', error instanceof Error ? error.message : 'Please try again.');
      }
    }
  }

  // Board goals reuse the same original Goal detail sheet, not a copied board record.
  useEffect(() => {
    if (!goalId) {
      openedFromBoard.current = null;
      return;
    }
    if (openedFromBoard.current === goalId) return;
    openedFromBoard.current = goalId;
    void getGoal(db, goalId).then((goal) => {
      if (goal) void openDetails(goal);
    }).catch(() => {
      Alert.alert('Goal unavailable', 'This goal could not be opened.');
    });
  }, [db, goalId]);

  function closeDetails() {
    detailRequest.current++;
    setDetailStack([]);
    setAncestors([]);
    setChildren([]);
  }

  function backToParent() {
    const request = ++detailRequest.current;
    const parentGoal = detailStack[detailStack.length - 2];
    if (!parentGoal) {
      closeDetails();
      return;
    }
    setDetailStack((items) => items.slice(0, -1));
    void Promise.all([listChildGoals(db, parentGoal.id), listGoalAncestors(db, parentGoal.id)])
      .then(([steps, path]) => {
        if (request === detailRequest.current) {
          setChildren(steps);
          setAncestors(path);
        }
      })
      .catch(() => {
        if (request === detailRequest.current) Alert.alert('Could not load parent goal', 'Please try again.');
      });
  }

  async function saveGoal(input: GoalInput) {
    if (working) return;
    await perform(async () => {
      if (editing) {
        await editGoal(db, editing.id, input);
      } else {
        await createGoal(db, input);
      }
      // When a goal moves to a different period, show its destination
      // instead of leaving the user with an apparently missing goal.
      if (view === 'focus' && (input.horizon !== horizon || input.periodKey !== key)) {
        setAnchor(dateFromPeriodKey(input.horizon, input.periodKey, anchor));
        setHorizon(input.horizon);
      }
      setEditorVisible(false);
      setEditing(null);
      setParent(null);
    });
  }

  function editSelected() {
    if (details) void openEditor(details, null);
  }

  function addChild() {
    if (details) void openEditor(null, details);
  }

  async function toggle(goal: Goal) {
    if (working) return;
    const completed = !goal.completed;
    await perform(async () => {
      await setGoalCompleted(db, goal.id, completed);
      setDetailStack((items) => items.map((item) => item.id === goal.id ? { ...item, completed } : item));
      setChildren((items) => items.map((item) => item.id === goal.id ? { ...item, completed } : item));
    });
  }

  function confirmArchive(goal: Goal = details!) {
    if (!goal) return;
    Alert.alert(
      'Archive this goal?',
      'The goal and its active next steps will be saved in Archive. You can restore them later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: () => void perform(async () => {
            await archiveGoal(db, goal.id);
            closeDetails();
          }),
        },
      ],
    );
  }

  const organizeIndex = organizing ? goals.findIndex((item) => item.id === organizing.id) : -1;
  const canMoveUp = organizeIndex > 0 && goals[organizeIndex - 1].completed === organizing?.completed;
  const canMoveDown = organizeIndex >= 0 && organizeIndex < goals.length - 1
    && goals[organizeIndex + 1].completed === organizing?.completed;

  function moveSelected(direction: -1 | 1) {
    const goal = organizing;
    setOrganizing(null);
    if (!goal) return;
    void perform(async () => { await moveGoal(db, goal.id, direction); });
  }

  function archiveSelectedFromMenu() {
    const goal = organizing;
    setOrganizing(null);
    if (!goal) return;
    void perform(async () => { await archiveGoal(db, goal.id); });
  }

  function restoreSelected(goal: Goal) {
    void perform(async () => { await restoreGoal(db, goal.id); });
  }

  const header = (
    <View>
      <View style={styles.brandRow}>
        <View style={styles.brandBlock}>
          <View style={[styles.brandMark, { backgroundColor: palette.accent }]} />
          <Text style={[styles.brand, { color: palette.foreground }]}>EONWARD</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Boards"
          style={[styles.boardsShortcut, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={() => router.push('/boards')}>
          <Text style={[styles.boardsShortcutText, { color: palette.accent }]}>Boards  ↗</Text>
        </Pressable>
      </View>
      <Text style={[styles.eyebrow, { color: palette.accent }]}>YOUR TIME, IN PERSPECTIVE</Text>
      <Text style={[styles.heroTitle, { color: palette.foreground }]}>Horizons<Text style={{ color: palette.accent }}>.</Text></Text>
      <Text style={[styles.heroSubtitle, { color: palette.muted }]}>
        Make room for what matters, today and beyond.
      </Text>

      <View style={styles.modeRow}>
        <View style={[styles.modeSwitch, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          {(['focus', 'perspective'] as const).map((item) => {
            const selected = view === item;
            return (
              <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }}
                accessibilityLabel={item === 'focus' ? 'Focus view' : 'Perspective view'}
                onPress={() => setView(item)}
                style={[styles.modeButton, selected && { backgroundColor: palette.foreground }]}>
                <Text style={[styles.modeText, { color: selected ? palette.background : palette.muted }]}>
                  {item === 'focus' ? 'Focus' : 'Perspective'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: view === 'archive' }}
          accessibilityLabel="Archived goals"
          onPress={() => setView(view === 'archive' ? 'focus' : 'archive')}
          style={[styles.archiveShortcut, { backgroundColor: view === 'archive' ? palette.foreground : palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.archiveShortcutText, { color: view === 'archive' ? palette.background : palette.muted }]}>
            Archive
          </Text>
        </Pressable>
      </View>

      {view === 'focus' ? (
      <>
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
        {goals.length > 0 ? (
          <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
            <View style={[styles.progressFill, { backgroundColor: palette.accent, width: `${doneCount / goals.length * 100}%` }]} />
          </View>
        ) : null}
        <View style={[styles.progressRow, goals.length === 0 && { marginTop: 18 }]}>
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
      </>
      ) : view === 'perspective' ? (
        <PerspectiveView
          sections={perspectiveSections}
          palette={palette}
          loading={perspectiveLoading}
          error={perspectiveError}
          onRetry={() => setPerspectiveRevision((value) => value + 1)}
          onOpenHorizon={focusHorizon}
          onOpenGoal={(goal) => void openDetails(goal)}
          onAddGoal={openCreateForHorizon}
        />
      ) : (
        <ArchiveView
          items={archivedGoals}
          palette={palette}
          loading={archiveLoading}
          error={archiveError}
          disabled={working}
          onRestore={restoreSelected}
          onRetry={() => setArchiveRevision((value) => value + 1)}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <FlatList
        data={view === 'focus' && !loading && !failure ? goals : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GoalCard
            goal={item}
            palette={palette}
            disabled={working}
            onOpen={() => void openDetails(item)}
            onToggle={() => void toggle(item)}
            onOrganize={() => setOrganizing(item)}
          />
        )}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={view !== 'focus' ? null : (
          loading ? (
            <ActivityIndicator color={palette.accent} size="large" style={styles.wait} />
          ) : failure ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: palette.foreground }]}>Couldn't load this horizon</Text>
              <Text style={[styles.emptyBody, { color: palette.muted }]}>{failure}</Text>
              <Pressable onPress={() => setRevision((value) => value + 1)} accessibilityRole="button">
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
                A small intention today can change the bigger picture.
              </Text>
              <Text style={[styles.emptyHint, { color: palette.accent }]}>
                Use New goal below to begin.
              </Text>
            </View>
          )
        )}
      />
      {view === 'focus' ? (
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
      ) : null}
      <Modal visible={organizing !== null} transparent statusBarTranslucent navigationBarTranslucent animationType="fade"
        onRequestClose={() => setOrganizing(null)}>
        <SafeAreaProvider>
        <View style={styles.organizeOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOrganizing(null)}
            accessibilityLabel="Close organization menu" />
          <SafeAreaView edges={['bottom']} style={[styles.organizePanel, { backgroundColor: palette.background }]}>
            <Text style={[styles.organizeTitle, { color: palette.foreground }]}>Organize goal</Text>
            <Text numberOfLines={2} style={[styles.organizeSubtitle, { color: palette.muted }]}>
              {organizing?.title}
            </Text>
            {canMoveUp ? (
              <Pressable accessibilityRole="button" onPress={() => moveSelected(-1)}
                style={[styles.organizeAction, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[styles.organizeActionText, { color: palette.foreground }]}>↑  Move up</Text>
              </Pressable>
            ) : null}
            {canMoveDown ? (
              <Pressable accessibilityRole="button" onPress={() => moveSelected(1)}
                style={[styles.organizeAction, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={[styles.organizeActionText, { color: palette.foreground }]}>↓  Move down</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={archiveSelectedFromMenu}
              style={[styles.organizeAction, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.organizeActionText, { color: '#B34F4F' }]}>↘  Archive goal and next steps</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setOrganizing(null)}
              style={styles.organizeCancel}>
              <Text style={[styles.organizeCancelText, { color: palette.muted }]}>Cancel</Text>
            </Pressable>
          </SafeAreaView>
        </View>
        </SafeAreaProvider>
      </Modal>
      <GoalDetails
        goal={details}
        children={children}
        ancestors={ancestors}
        palette={palette}
        onClose={closeDetails}
        onBack={backToParent}
        canGoBack={detailStack.length > 1}
        onOpenChild={(child) => void openDetails(child, true)}
        onOpenAncestor={(goal) => void openDetails(goal)}
        onEdit={editSelected}
        onAddStep={addChild}
        onToggle={(goal) => void toggle(goal)}
        onArchive={() => confirmArchive()}
      />
      <GoalEditor
        visible={editorVisible}
        initial={editing}
        parent={parent}
        parentOptions={parentOptions}
        defaultHorizon={editorContext.horizon}
        anchorDate={editorContext.anchor}
        palette={palette}
        saving={working}
        onDismiss={() => { if (!working) setEditorVisible(false); }}
        onSave={saveGoal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  organizeOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(9, 22, 18, 0.43)' },
  organizePanel: { padding: spacing.lg, paddingBottom: 35, borderTopLeftRadius: 27, borderTopRightRadius: 27, gap: 10 },
  organizeTitle: { fontSize: 21, fontWeight: '700', letterSpacing: -0.4 },
  organizeSubtitle: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  organizeAction: { minHeight: 55, justifyContent: 'center', paddingHorizontal: 18, borderRadius: radius.lg, borderWidth: 1 },
  organizeActionText: { fontSize: 15, fontWeight: '600' },
  organizeCancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  organizeCancelText: { fontSize: 14, fontWeight: '600' },
  screen: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 28, flexGrow: 1 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, marginBottom: 22 },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boardsShortcut: { borderWidth: 1, minHeight: 46, paddingHorizontal: 16, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  boardsShortcutText: { fontSize: 12, fontWeight: '700' },
  brandMark: { height: 15, width: 15, borderTopLeftRadius: 8, borderBottomRightRadius: 8, transform: [{ rotate: '45deg' }] },
  brand: { fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  today: { fontSize: 12, fontWeight: '600' },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, marginBottom: 6 },
  heroTitle: { fontSize: 38, fontWeight: '700', letterSpacing: -1.5, lineHeight: 46 },
  heroSubtitle: { fontSize: 14, lineHeight: 22, marginTop: 2 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 20 },
  modeSwitch: { flex: 1, flexDirection: 'row', gap: 5, padding: 5, borderWidth: 1, borderRadius: radius.full },
  archiveShortcut: { minHeight: 54, paddingHorizontal: 16, borderWidth: 1, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  archiveShortcutText: { fontSize: 12, fontWeight: '700' },
  modeButton: { flex: 1, minHeight: 46, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  modeText: { fontSize: 12, fontWeight: '700' },
  horizonList: { marginTop: 20, marginHorizontal: -spacing.lg, marginBottom: spacing.lg },
  horizonItems: { paddingHorizontal: spacing.lg, gap: 8 },
  horizonChip: { minHeight: 48, minWidth: 64, paddingHorizontal: 15, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  horizonChipText: { fontSize: 13, fontWeight: '600' },
  periodPanel: { borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1 },
  periodLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  periodCopy: { flex: 1, gap: 5 },
  periodEyebrow: { fontSize: 10, letterSpacing: 1.2, fontWeight: '700' },
  periodText: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  periodActions: { flexDirection: 'row', gap: 6 },
  periodButton: { borderWidth: 1, borderRadius: radius.md, height: 48, width: 48, justifyContent: 'center', alignItems: 'center' },
  periodArrow: { fontSize: 29, lineHeight: 32 },
  progressTrack: { height: 5, borderRadius: 3, marginTop: 22, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 12 },
  progressLabel: { fontSize: 11 },
  jumpToday: { fontSize: 12, fontWeight: '800', letterSpacing: 0.7, paddingVertical: 8, paddingLeft: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 19, fontWeight: '700', letterSpacing: -0.5 },
  sectionCount: { fontSize: 12 },
  goalCard: { borderWidth: 1, borderRadius: radius.lg, marginBottom: 10, flexDirection: 'row', alignItems: 'center', minHeight: 76, padding: 11 },
  checkboxTouch: { height: 48, width: 42, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  checkboxTick: { color: '#FFFFFF', fontWeight: '700' },
  cardContent: { flex: 1, paddingVertical: 9, gap: 6 },
  goalTitle: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  goalSubtitle: { fontSize: 12 },
  chevronTouch: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  chevron: { fontSize: 29 },
  empty: { paddingTop: 29, paddingBottom: 25, alignItems: 'center', gap: 13, paddingHorizontal: spacing.md },
  emptySymbol: { height: 68, width: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptySpark: { fontSize: 28 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', letterSpacing: -0.4 },
  emptyBody: { fontSize: 13, lineHeight: 22, textAlign: 'center', maxWidth: 240 },
  emptyHint: { fontSize: 12, lineHeight: 20, fontWeight: '600', textAlign: 'center', marginTop: 3 },
  wait: { marginTop: 60 },
  retry: { padding: 10, fontWeight: '700', fontSize: 14 },
  footer: { borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerCopy: { flex: 1, gap: 4 },
  footerStrong: { fontSize: 12, fontWeight: '700' },
  footerHint: { fontSize: 11 },
  newButton: { height: 48, borderRadius: radius.full, paddingHorizontal: 21, alignItems: 'center', justifyContent: 'center' },
  newButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, AppState, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { dateFromPeriodKey, HORIZONS, HORIZON_TITLES, periodKey, periodLabel, shiftPeriod, type Horizon } from '../../domain/horizons';
import { availableGoalParents, type Goal, type GoalInput } from '../../domain/goals';
import { buildPerspectiveSections } from '../../domain/perspective';
import { archiveGoal, createGoal, editGoal, getGoal, listAllGoals, listArchivedGoals, listChildGoals, listGoalAncestors, listGoals, listInboxGoals, listPerspectiveGoals, moveGoal, restoreGoal, setGoalCompleted } from '../../storage/goals';
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
          {goal.completed ? <Text style={[styles.checkboxTick, { color: palette.onAccent }]}>✓</Text> : null}
        </View>
      </Pressable>
      <Pressable style={styles.cardContent} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${goal.title}`}>
        <Text
          numberOfLines={2}
          style={[styles.goalTitle, { color: palette.foreground, textDecorationLine: goal.completed ? 'line-through' : 'none', opacity: 1 }]}
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
        {goal.dueDate ? <Text style={[styles.goalSchedule, { color: palette.muted }]}>Deadline · {goal.dueDate}</Text> : null}
        {goal.inbox ? <Text style={[styles.goalSchedule, { color: palette.muted }]}>Inbox · not yet planned</Text> : null}
        {goal.repeatRule !== 'none' ? <Text style={[styles.goalSchedule, { color: palette.accent }]}>↻ {goal.repeatRule}</Text> : null}
        {goal.nextBlockAt ? (
          <Text style={[styles.goalSchedule, { color: palette.accent }]} numberOfLines={1}>
            ◷ {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(goal.nextBlockAt))}
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
  const [horizon, setHorizon] = useState<Horizon>('day');
  const [view, setView] = useState<'focus' | 'perspective' | 'archive' | 'inbox'>('focus');
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
  const writeLock = useRef(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const quickInput = useRef<TextInput>(null);
  const [clockDay, setClockDay] = useState(() => periodKey('day', new Date()));
  useEffect(() => {
    const update = () => { setClockDay(periodKey('day', new Date())); setRevision((n) => n + 1); };
    const timer = setInterval(() => setClockDay(periodKey('day', new Date())), 60000);
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') update(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
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

  // The same goal can be rescheduled or completed in Calendar or Boards.
  // Re-read SQLite when returning to Horizons instead of showing stale cards.
  useFocusEffect(useCallback(() => {
    setRevision((value) => value + 1);
  }, []));

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
    const read = searching ? listAllGoals(db) : view === 'inbox' ? listInboxGoals(db) : listGoals(db, horizon, key);
    void read.then((result) => {
      const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
      const query = normalize(search.trim());
      if (searching && query) result = result.filter((goal) => normalize(goal.title + ' ' + goal.notes + ' ' + (goal.parentTitle ?? '')).includes(query));
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
  }, [db, horizon, key, revision, view, searching, search, clockDay]);

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
    if (writeLock.current) return;
    writeLock.current = true;
    setWorking(true);
    try {
      await action();
      setRevision((value) => value + 1);
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      writeLock.current = false;
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
    setSearching(false);
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
      router.setParams({ goalId: undefined });
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
      if (input.inbox) setView('inbox');
      else if (view === 'inbox' || (view === 'focus' && (input.horizon !== horizon || input.periodKey !== key))) {
        setView('focus');
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

  async function quickCreate() {
    if (!quickTitle.trim() || writeLock.current) return;
    const capturedTitle = quickTitle;
    await perform(async () => {
      await createGoal(db, { title: capturedTitle, notes: '', horizon, periodKey: view === 'inbox' ? '' : key, inbox: view === 'inbox' });
      setQuickTitle((current) => current === capturedTitle ? '' : current);
      quickInput.current?.focus();
    });
  }

  function tools() {
    Alert.alert('Plan tools', undefined, [
      { text: 'Archive', onPress: () => { setSearching(false); setView('archive'); } },
      { text: 'Your data & settings', onPress: () => router.push('/settings') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }
  const showingList = searching || view === 'focus' || view === 'inbox';
  const header = (
    <View>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { color: palette.foreground }]}>
            {searching ? 'Search your plans' : view === 'inbox' ? 'Inbox' : view === 'perspective' ? 'Your horizons' : view === 'archive' ? 'Archive' : horizon === 'day' && key === clockDay ? 'Today' : HORIZON_TITLES[horizon]}
          </Text>
          {!searching && view === 'inbox' ? <Text style={[styles.caption, { color: palette.muted }]}>Capture now. Decide when later.</Text> : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={searching ? 'Close search' : 'Search all goals and notes'}
          onPress={() => { setSearching(!searching); setSearch(''); }} style={styles.utility}>
          <Text style={{ color: palette.accent, fontSize: 25 }}>{searching ? '×' : '⌕'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Plan tools, archive and data settings" onPress={tools} style={styles.utility}>
          <Text style={{ color: palette.foreground, fontSize: 24 }}>⋯</Text>
        </Pressable>
      </View>
      {searching ? <TextInput autoFocus value={search} onChangeText={setSearch} placeholder="Search goals, notes or parent goals"
        accessibilityLabel="Search goals and notes" placeholderTextColor={palette.muted}
        style={[styles.searchInput, { color: palette.foreground, backgroundColor: palette.surface, borderColor: palette.border }]} /> : <>
        <View style={[styles.modes, { borderBottomColor: palette.border }]}>
          {(['focus', 'perspective', 'inbox'] as const).map((mode) => <Pressable key={mode} accessibilityRole="tab"
            accessibilityState={{ selected: view === mode }} onPress={() => setView(mode)}
            style={[styles.modeTab, { borderBottomColor: view === mode ? palette.accent : 'transparent' }]}>
            <Text style={{ color: view === mode ? palette.foreground : palette.muted, fontWeight: view === mode ? '700' : '500' }}>
              {mode === 'focus' ? 'Your plan' : mode === 'perspective' ? 'Overview' : 'Inbox'}
            </Text>
          </Pressable>)}
        </View>
        {view === 'focus' ? <>
          <FlatList data={HORIZONS} horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item} style={styles.horizonList} contentContainerStyle={styles.horizonItems}
            renderItem={({ item }) => <Pressable onPress={() => setHorizon(item)} accessibilityRole="button"
              accessibilityState={{ selected: item === horizon }}
              style={[styles.horizonChip, { backgroundColor: item === horizon ? palette.foreground : palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.horizonChipText, { color: item === horizon ? palette.background : palette.foreground }]}>{HORIZON_TITLES[item]}</Text>
            </Pressable>} />
          <View style={styles.periodRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous period" disabled={horizon === 'life'}
              onPress={() => setAnchor((date) => shiftPeriod(horizon, date, -1))} style={styles.utility}>
              <Text style={{ color: palette.foreground, fontSize: 26 }}>‹</Text>
            </Pressable>
            <Text style={[styles.periodCaption, { color: palette.foreground }]}>{caption}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Next period" disabled={horizon === 'life'}
              onPress={() => setAnchor((date) => shiftPeriod(horizon, date, 1))} style={styles.utility}>
              <Text style={{ color: palette.foreground, fontSize: 26 }}>›</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Return to current period" onPress={() => setAnchor(new Date())} style={styles.utility}>
              <Text style={{ color: palette.accent, fontSize: 12, fontWeight: '700' }}>Now</Text>
            </Pressable>
          </View>
        </> : null}
      </>}
      {showingList ? <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.foreground }]}>{searching ? 'Matching goals' : 'Your intentions'}</Text>
        <Text style={[styles.sectionCount, { color: palette.muted }]}>{goals.length - doneCount} open · {doneCount} done</Text>
      </View> : view === 'perspective' ? <PerspectiveView sections={perspectiveSections} palette={palette}
        loading={perspectiveLoading} error={perspectiveError} onRetry={() => setPerspectiveRevision((n) => n + 1)}
        onOpenHorizon={focusHorizon} onOpenGoal={(goal) => void openDetails(goal)} onAddGoal={openCreateForHorizon} />
      : <ArchiveView items={archivedGoals} palette={palette} loading={archiveLoading} error={archiveError} disabled={working}
        onRestore={restoreSelected} onRetry={() => setArchiveRevision((n) => n + 1)} />}
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
      <FlatList
        data={showingList && !loading && !failure ? goals : []}
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
        ListEmptyComponent={!showingList ? null : (
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
              <Text style={[styles.emptyTitle, { color: palette.foreground }]}>{searching ? 'No matching goals.' : view === 'inbox' ? 'A place for your next idea.' : 'A clear space to begin.'}</Text>
              <Text style={[styles.emptyBody, { color: palette.muted }]}>{searching ? 'Try another word from a title or note.' : 'Add one goal below. You can add the details later.'}</Text>
            </View>
          )
        )}
      />
      {showingList && !searching ? <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.quickBar, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
          <TextInput ref={quickInput} value={quickTitle} onChangeText={setQuickTitle} maxLength={180}
            placeholder={view === 'inbox' ? 'Capture an idea…' : 'Add a goal…'}
            placeholderTextColor={palette.muted} accessibilityLabel="Quick goal title" returnKeyType="done" blurOnSubmit={false}
            onSubmitEditing={() => { void quickCreate(); }} style={[styles.quickField, { color: palette.foreground }]} />
          <Pressable accessibilityRole="button" accessibilityLabel="Save quick goal" disabled={working || !quickTitle.trim()}
            onPress={() => { void quickCreate(); }} style={styles.utility}>
            <Text style={{ color: quickTitle.trim() && !working ? palette.accent : palette.muted, fontSize: 27 }}>＋</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Create goal with details" onPress={openCreate} style={styles.utility}>
            <Text style={{ color: palette.accent, fontSize: 13, fontWeight: '700' }}>Details</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView> : null}
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
        onSchedule={() => {
          if (!details) return;
          const goalId = details.id;
          closeDetails();
          router.push({ pathname: '/calendar', params: { goalId } });
        }}
      />
      <GoalEditor
        visible={editorVisible}
        initial={editing}
        parent={parent}
        parentOptions={parentOptions}
        defaultInbox={view === 'inbox'}
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
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 64 },
  pageTitle: { fontSize: 27, fontWeight: '700', letterSpacing: -.7 },
  caption: { fontSize: 12, marginTop: 5 },
  utility: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  modes: { flexDirection: 'row', gap: 22, borderBottomWidth: 1, marginBottom: 12 },
  modeTab: { minHeight: 48, justifyContent: 'center', borderBottomWidth: 2 },
  horizonList: { marginHorizontal: -spacing.lg, marginBottom: 4 },
  horizonItems: { paddingHorizontal: spacing.lg, gap: 6 },
  horizonChip: { minHeight: 48, minWidth: 58, paddingHorizontal: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  horizonChipText: { fontSize: 13, fontWeight: '600' },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 2 },
  periodCaption: { flex: 1, fontSize: 14, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  sectionCount: { fontSize: 11 },
  searchInput: { borderWidth: 1, borderRadius: radius.md, minHeight: 50, paddingHorizontal: 14, marginBottom: 8 },
  quickBar: { flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 6 },
  quickField: { flex: 1, minHeight: 48, fontSize: 14 },
  goalCard: { borderWidth: 1, borderRadius: radius.md, marginBottom: 7, flexDirection: 'row', alignItems: 'center', minHeight: 76, padding: 11 },
  checkboxTouch: { height: 48, width: 48, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  checkboxTick: { fontWeight: '700' },
  cardContent: { flex: 1, paddingVertical: 9, gap: 6 },
  goalTitle: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  goalSubtitle: { fontSize: 12 },
  goalSchedule: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  chevronTouch: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  chevron: { fontSize: 29 },
  empty: { paddingTop: 29, paddingBottom: 25, alignItems: 'center', gap: 13, paddingHorizontal: spacing.md },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyBody: { fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 270 },
  wait: { marginTop: 60 },
  retry: { padding: 10, fontWeight: '700', fontSize: 14 },
});

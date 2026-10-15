import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, AppState, FlatList, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { dateFromPeriodKey, HORIZONS, HORIZON_TITLES, periodKey, periodLabel, shiftPeriod, type Horizon } from '../../domain/horizons';
import { availableGoalParents, type Goal, type GoalInput } from '../../domain/goals';
import { buildPerspectiveSections } from '../../domain/perspective';
import { archiveGoal, createGoal, editGoal, getGoal, listAllGoals, listArchivedGoals, listChildGoals, listGoalAncestors, listGoals, listInboxGoals, listPerspectiveGoals, moveGoal, planGoal, restoreGoal, setGoalCompleted } from '../../storage/goals';
import { colors, depth, radius, spacing } from '../../theme/tokens';
import Archive from 'lucide-react-native/icons/archive';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Clock3 from 'lucide-react-native/icons/clock-3';
import Inbox from 'lucide-react-native/icons/inbox';
import Layers3 from 'lucide-react-native/icons/layers';
import MoreHorizontal from 'lucide-react-native/icons/ellipsis';
import Plus from 'lucide-react-native/icons/plus';
import Search from 'lucide-react-native/icons/search';
import Settings2 from 'lucide-react-native/icons/settings-2';
import X from 'lucide-react-native/icons/x';
import { GoalDetails } from './GoalDetails';
import { GoalEditor } from './GoalEditor';
import { PerspectiveView } from './PerspectiveView';
import { ArchiveView } from './ArchiveView';
import { useFocusSession } from '../focus/FocusProvider';
import { useReducedMotion } from '../../theme/useReducedMotion';

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
    <View style={[styles.goalCard, { backgroundColor: palette.surface, borderColor: palette.border, boxShadow: palette === colors.dark ? depth.dark.card : depth.light.card }]}>
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
          {goal.completed ? <Check size={14} color={palette.onAccent} strokeWidth={2.5} /> : null}
        </View>
      </Pressable>
      <Pressable style={styles.cardContent} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${goal.title}`}>
        {goal.parentTitle ? <View style={[styles.parentBadge, { backgroundColor: palette.accentSoft }]}>
          <Layers3 size={11} color={palette.accent} strokeWidth={1.8} />
          <Text numberOfLines={1} style={[styles.parentLabel, { color: palette.accent }]}>{goal.parentTitle}</Text>
        </View> : null}
        <Text
          numberOfLines={2}
          style={[styles.goalTitle, { color: goal.completed ? palette.muted : palette.foreground, textDecorationLine: goal.completed ? 'line-through' : 'none' }]}
        >
          {goal.title}
        </Text>
        {goal.childrenCount > 0 || (!goal.parentTitle && goal.notes) ? (
          <Text numberOfLines={1} style={[styles.goalSubtitle, { color: palette.muted }]}>
            {goal.childrenCount > 0
                ? `${goal.childrenCount} next step${goal.childrenCount === 1 ? '' : 's'}`
                : goal.notes}
          </Text>
        ) : null}
        {goal.dueDate ? <Text style={[styles.goalSchedule, { color: palette.muted }]}>Deadline · {goal.dueDate}</Text> : null}
        {goal.inbox ? <Text style={[styles.goalSchedule, { color: palette.muted }]}>Inbox · not yet planned</Text> : null}
        {goal.repeatRule !== 'none' ? <Text style={[styles.goalSchedule, { color: palette.accent }]}>↻ {goal.repeatRule}</Text> : null}
        {goal.nextBlockAt ? (
          <View style={styles.scheduleRow}><Clock3 size={12} color={palette.accent} />
            <Text style={[styles.goalSchedule, { color: palette.accent }]} numberOfLines={1}>
              {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(goal.nextBlockAt))}
            </Text></View>
        ) : null}
      </Pressable>
      <Pressable onPress={onOrganize} disabled={disabled} accessibilityRole="button"
        accessibilityLabel={`Organize ${goal.title}`} style={styles.chevronTouch}>
        <MoreHorizontal size={20} color={palette.muted} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}

export function HorizonsScreen() {
  const reducedMotion = useReducedMotion();
  const db = useSQLiteContext();
  const router = useRouter();
  const focus = useFocusSession();
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
  const [toolsVisible, setToolsVisible] = useState(false);
  const [horizonsVisible, setHorizonsVisible] = useState(false);
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
  const [editorDraftTitle, setEditorDraftTitle] = useState('');
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

  async function openEditor(initial: Goal | null, selectedParent: Goal | null, targetHorizon: Horizon = horizon, draftTitle = '') {
    try {
      const options = await listAllGoals(db);
      setParentOptions(availableGoalParents(options, initial?.id ?? null));
      setEditing(initial);
      setEditorDraftTitle(draftTitle);
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
    Keyboard.dismiss();
    void openEditor(null, null, view === 'perspective' ? 'day' : horizon, quickTitle);
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

  function focusSelected(minutes: number) {
    if (!details || focus.busy) return;
    startGoalFocus(details, minutes);
  }

  function startGoalFocus(goal: Goal, minutes: number) {
    if (focus.busy) return;
    const start = (replace = false) => {
      void focus.beginQuick(goal.id, minutes, replace).then(() => {
        setOrganizing(null); closeDetails(); setRevision((n) => n + 1);
      }).catch((error: unknown) => Alert.alert('Could not start focus', error instanceof Error ? error.message : 'Please try again.'));
    };
    if (focus.session) Alert.alert('Switch your focus?', 'The current session will be recorded before this one starts.', [
      { text: 'Keep focusing', style: 'cancel' }, { text: 'Switch', onPress: () => start(true) },
    ]);
    else start();
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
        setQuickTitle((current) => current === editorDraftTitle ? '' : current);
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
            void focus.refresh().catch(() => {});
            closeDetails();
          }),
        },
      ],
    );
  }

  const organizeIndex = organizing ? goals.findIndex((item) => item.id === organizing.id) : -1;
  const canReorder = !searching && view === 'focus';
  const canMoveUp = canReorder && organizeIndex > 0 && goals[organizeIndex - 1].completed === organizing?.completed;
  const canMoveDown = canReorder && organizeIndex >= 0 && organizeIndex < goals.length - 1
    && goals[organizeIndex + 1].completed === organizing?.completed;

  const today = new Date();
  const tomorrow = shiftPeriod('day', today, 1);
  const planningChoices = organizing && !organizing.completed ? [
    { label: 'Today', horizon: 'day' as Horizon, periodKey: periodKey('day', today), inbox: false },
    { label: 'Tomorrow', horizon: 'day' as Horizon, periodKey: periodKey('day', tomorrow), inbox: false },
    ...(organizing.repeatRule === 'none' ? [
      { label: 'This week', horizon: 'week' as Horizon, periodKey: periodKey('week', today), inbox: false },
      { label: 'Inbox · no date', horizon: organizing.horizon, periodKey: '', inbox: true },
    ] : []),
  ].filter((choice) => choice.inbox !== organizing.inbox || (!choice.inbox
    && (choice.horizon !== organizing.horizon || choice.periodKey !== organizing.periodKey))) : [];

  function planSelected(destination: (typeof planningChoices)[number]) {
    const goal = organizing;
    if (!goal) return;
    void perform(async () => {
      await planGoal(db, goal.id, destination);
      setOrganizing(null);
      setSearching(false);
      setView(destination.inbox ? 'inbox' : 'focus');
      setHorizon(destination.horizon);
      if (!destination.inbox) setAnchor(dateFromPeriodKey(destination.horizon, destination.periodKey, new Date()));
    });
  }

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
    void perform(async () => { await archiveGoal(db, goal.id); void focus.refresh().catch(() => {}); });
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
    setToolsVisible(true);
  }
  const showingList = searching || view === 'focus' || view === 'inbox';
  const header = (
    <View>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.brandLabel, { color: palette.muted }]}>EONWARD</Text>
          <Text style={[styles.pageTitle, { color: palette.foreground }]}>
            {searching ? 'Search your plans' : view === 'inbox' ? 'Inbox' : view === 'perspective' ? 'Your horizons' : view === 'archive' ? 'Archive' : horizon === 'day' && key === clockDay ? 'Today' : HORIZON_TITLES[horizon]}
          </Text>
          {!searching ? <Text style={[styles.caption, { color: palette.muted }]}>
            {view === 'inbox' ? 'Capture now. Decide when later.' : view === 'perspective' ? 'Daily steps. Longer-term direction.' : view === 'archive' ? 'Saved for another season.' : caption}
          </Text> : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={searching ? 'Close search' : 'Search all goals and notes'}
          onPress={() => { setSearching(!searching); setSearch(''); }} style={styles.utility}>
          {searching ? <X size={21} color={palette.foreground} strokeWidth={1.8} /> : <Search size={21} color={palette.foreground} strokeWidth={1.8} />}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Plan tools, archive and data settings" onPress={tools} style={styles.utility}>
          <MoreHorizontal size={23} color={palette.foreground} strokeWidth={1.8} />
        </Pressable>
      </View>
      {searching ? <TextInput autoFocus value={search} onChangeText={setSearch} placeholder="Search goals, notes or parent goals"
        accessibilityLabel="Search goals and notes" placeholderTextColor={palette.muted}
        style={[styles.searchInput, { color: palette.foreground, backgroundColor: palette.surface, borderColor: palette.border }]} /> : <>
        <View style={[styles.modes, { backgroundColor: palette.inset }]}>
          {(['focus', 'perspective', 'inbox'] as const).map((mode) => <Pressable key={mode} accessibilityRole="tab"
            accessibilityState={{ selected: view === mode }} onPress={() => setView(mode)}
            style={[styles.modeTab, view === mode && { backgroundColor: palette.surface, boxShadow: palette === colors.dark ? depth.dark.control : depth.light.control }]}>
            <Text style={{ color: view === mode ? palette.foreground : palette.muted, fontSize: 13, fontWeight: view === mode ? '600' : '500' }}>
              {mode === 'focus' ? 'Your plan' : mode === 'perspective' ? 'Horizons' : 'Inbox'}
            </Text>
          </Pressable>)}
        </View>
        {view === 'focus' ? <>
          <View style={styles.periodRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Planning horizon: ${HORIZON_TITLES[horizon]}. Change horizon`}
              onPress={() => setHorizonsVisible(true)} style={[styles.horizonSelect, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Layers3 size={15} color={palette.accent} strokeWidth={1.8} />
              <Text style={[styles.horizonChipText, { color: palette.foreground }]}>{HORIZON_TITLES[horizon]}</Text>
              <ChevronDown size={14} color={palette.muted} />
            </Pressable>
            <View style={{ flex: 1 }} />
            {horizon !== 'life' ? <><Pressable accessibilityRole="button" accessibilityLabel="Previous period"
              onPress={() => setAnchor((date) => shiftPeriod(horizon, date, -1))} style={styles.utility}>
              <ChevronLeft size={21} color={palette.foreground} strokeWidth={1.8} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next period"
              onPress={() => setAnchor((date) => shiftPeriod(horizon, date, 1))} style={styles.utility}>
              <ChevronRight size={21} color={palette.foreground} strokeWidth={1.8} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Return to current period" onPress={() => setAnchor(new Date())} style={styles.utility}>
              <Text style={{ color: palette.accent, fontSize: 12, fontWeight: '700' }}>Now</Text>
            </Pressable></> : null}
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
            onOrganize={() => { Keyboard.dismiss(); setOrganizing(item); }}
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
              {!searching ? <View style={[styles.emptyEmblem, { backgroundColor: palette.accentSoft }]}>
                {view === 'inbox' ? <Inbox size={27} color={palette.accent} strokeWidth={1.4} /> : <Layers3 size={27} color={palette.accent} strokeWidth={1.4} />}
              </View> : null}
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
      {showingList && !searching ? <View>
        <View style={[styles.quickBar, { borderColor: palette.border, backgroundColor: palette.surface, boxShadow: palette === colors.dark ? depth.dark.control : depth.light.control }]}>
          <TextInput ref={quickInput} value={quickTitle} onChangeText={setQuickTitle} maxLength={180}
            placeholder={view === 'inbox' ? 'Capture an idea…' : 'Add a goal…'}
            placeholderTextColor={palette.muted} accessibilityLabel="Quick goal title" returnKeyType="done" blurOnSubmit={false}
            onSubmitEditing={() => { void quickCreate(); }} style={[styles.quickField, { color: palette.foreground }]} />
          <Pressable accessibilityRole="button" accessibilityLabel="Save quick goal" disabled={working || !quickTitle.trim()}
            onPress={() => { void quickCreate(); }} style={styles.quickSave}>
            <View style={[styles.quickSaveIcon, { backgroundColor: quickTitle.trim() && !working ? palette.accent : palette.inset }]}>
              <Plus size={21} color={quickTitle.trim() && !working ? palette.onAccent : palette.muted} strokeWidth={1.8} />
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Create goal with details" onPress={openCreate} style={styles.utility}>
            <Text style={{ color: palette.accent, fontSize: 12, fontWeight: '600' }}>Details</Text>
          </Pressable>
        </View>
      </View> : null}
      <Modal visible={horizonsVisible} transparent statusBarTranslucent navigationBarTranslucent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={() => setHorizonsVisible(false)}>
        <SafeAreaProvider><View style={styles.organizeOverlay}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close horizon selection" onPress={() => setHorizonsVisible(false)} />
          <SafeAreaView edges={['bottom']} style={[styles.organizePanel, { backgroundColor: palette.background }]}>
            <View style={[styles.grabber, { backgroundColor: palette.border }]} />
            <Text style={[styles.organizeTitle, { color: palette.foreground }]}>Choose your horizon</Text>
            {HORIZONS.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: horizon === item }}
              onPress={() => { setHorizon(item); setHorizonsVisible(false); }}
              style={[styles.horizonOption, { backgroundColor: horizon === item ? palette.accentSoft : palette.surface, borderColor: horizon === item ? palette.accent : palette.border }]}>
              <Text style={{ color: palette.foreground, fontSize: 15, fontWeight: '600', minWidth: 70 }}>{HORIZON_TITLES[item]}</Text>
              <Text style={{ color: palette.muted, fontSize: 12, flex: 1 }}>{periodLabel(item, anchor)}</Text>
              {horizon === item ? <Check size={18} color={palette.accent} /> : <ChevronRight size={17} color={palette.muted} />}
            </Pressable>)}
          </SafeAreaView>
        </View></SafeAreaProvider>
      </Modal>
      <Modal visible={toolsVisible} transparent statusBarTranslucent navigationBarTranslucent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={() => setToolsVisible(false)}>
        <SafeAreaProvider><View style={styles.organizeOverlay}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close Plan tools" onPress={() => setToolsVisible(false)} />
          <SafeAreaView edges={['bottom']} style={[styles.organizePanel, { backgroundColor: palette.background }]}>
            <View style={[styles.grabber, { backgroundColor: palette.border }]} />
            <Text style={[styles.organizeTitle, { color: palette.foreground }]}>Your workspace</Text>
            <Pressable accessibilityRole="button" onPress={() => { setToolsVisible(false); router.push('/settings'); }} style={[styles.organizeAction, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Settings2 size={20} color={palette.accent} strokeWidth={1.8} />
              <Text style={[styles.organizeActionText, { color: palette.foreground }]}>Your data & settings</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setToolsVisible(false); setSearching(false); setView('archive'); }} style={[styles.organizeAction, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Archive size={20} color={palette.muted} strokeWidth={1.8} />
              <Text style={[styles.organizeActionText, { color: palette.foreground }]}>Archived goals</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setToolsVisible(false)} style={styles.organizeCancel}><Text style={[styles.organizeCancelText, { color: palette.muted }]}>Close</Text></Pressable>
          </SafeAreaView>
        </View></SafeAreaProvider>
      </Modal>
      <Modal visible={organizing !== null} transparent statusBarTranslucent navigationBarTranslucent animationType={reducedMotion ? 'none' : 'fade'}
        onRequestClose={() => setOrganizing(null)}>
        <SafeAreaProvider>
        <View style={styles.organizeOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOrganizing(null)}
            accessibilityLabel="Close organization menu" />
          <SafeAreaView edges={['bottom']} style={[styles.organizePanel, { backgroundColor: palette.background, maxHeight: '90%' }]}>
            <ScrollView contentContainerStyle={{ gap: 10 }}>
            <Text style={[styles.organizeTitle, { color: palette.foreground }]}>Organize goal</Text>
            <Text numberOfLines={2} style={[styles.organizeSubtitle, { color: palette.muted }]}>
              {organizing?.title}
            </Text>
            {planningChoices.length ? <>
              <Text style={{ color: palette.muted, fontSize: 13 }}>Move plan · deadlines and calendar times stay as set</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {planningChoices.map((choice) => <Pressable key={choice.label} accessibilityRole="button"
                  accessibilityLabel={`Move plan to ${choice.label}`} disabled={working}
                  onPress={() => planSelected(choice)} style={[styles.organizeAction, { flexBasis: '47%', flexGrow: 1,
                    backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <Text style={[styles.organizeActionText, { color: palette.foreground }]}>{choice.label}</Text>
                </Pressable>)}
              </View>
            </> : null}
            {organizing && !organizing.completed ? <Pressable accessibilityRole="button" disabled={working || focus.busy}
              onPress={() => { if (organizing) startGoalFocus(organizing, 25); }}
              style={[styles.organizeAction, { backgroundColor: palette.accentSoft, borderColor: palette.border }]}>
              <Clock3 size={20} color={palette.accent} /><Text style={[styles.organizeActionText, { color: palette.accent }]}>Focus · 25 min</Text>
            </Pressable> : null}
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
            </ScrollView>
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
        onFocus={focusSelected}
        focusing={focus.busy}
      />
      <GoalEditor
        visible={editorVisible}
        initial={editing}
        draftTitle={editorDraftTitle}
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
  organizePanel: { padding: spacing.lg, paddingBottom: 35, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: 10 },
  grabber: { width: 36, height: 4, borderRadius: 4, alignSelf: 'center', marginBottom: 10 },
  horizonOption: { minHeight: 54, borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  organizeTitle: { fontSize: 21, fontWeight: '700', letterSpacing: -0.4 },
  organizeSubtitle: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  organizeAction: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1 },
  organizeActionText: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  organizeCancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  organizeCancelText: { fontSize: 14, fontWeight: '600' },
  screen: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 28, flexGrow: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 0, paddingTop: 20, paddingBottom: 22 },
  brandLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 2.3, marginBottom: 12 },
  pageTitle: { fontSize: 32, fontWeight: '700', letterSpacing: -1.2 },
  caption: { fontSize: 13, lineHeight: 20, marginTop: 6 },
  utility: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  modes: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, marginBottom: 16 },
  modeTab: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 8 },
  horizonSelect: { minHeight: 48, paddingHorizontal: 12, borderRadius: radius.md, alignItems: 'center', flexDirection: 'row', gap: 8, borderWidth: 1 },
  horizonChipText: { fontSize: 13, fontWeight: '600' },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 0, paddingVertical: 2, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 14, marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  sectionCount: { fontSize: 12 },
  searchInput: { borderWidth: 1, borderRadius: radius.md, minHeight: 50, paddingHorizontal: 14, marginBottom: 8 },
  quickBar: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderRadius: radius.lg, marginHorizontal: 20, marginBottom: 12, marginTop: 8, paddingLeft: 16, paddingRight: 5, paddingVertical: 4 },
  quickField: { flex: 1, minHeight: 48, fontSize: 14 },
  quickSave: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  quickSaveIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  goalCard: { borderWidth: 1, borderRadius: radius.lg, marginBottom: 10, flexDirection: 'row', alignItems: 'center', minHeight: 88, paddingVertical: 8, paddingLeft: 6, paddingRight: 2 },
  checkboxTouch: { height: 48, width: 48, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 21, height: 21, borderRadius: 7, borderWidth: 1.3, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1, paddingVertical: 9, gap: 6 },
  goalTitle: { fontSize: 15, lineHeight: 22, fontWeight: '600', letterSpacing: -.15 },
  goalSubtitle: { fontSize: 12, lineHeight: 18 },
  parentBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, maxWidth: '100%' },
  parentLabel: { fontSize: 10, lineHeight: 15, flexShrink: 1 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  goalSchedule: { fontSize: 11, fontWeight: '500', lineHeight: 16, flexShrink: 1 },
  chevronTouch: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingTop: 36, paddingBottom: 25, alignItems: 'center', gap: 13, paddingHorizontal: spacing.md },
  emptyEmblem: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyBody: { fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 270 },
  wait: { marginTop: 60 },
  retry: { padding: 10, fontWeight: '700', fontSize: 14 },
});

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { AppState, Alert, Modal, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getFocusRemainingMs, formatFocusTime } from '../../domain/focus';
import { useFocusSession } from '../focus/FocusProvider';
import { colors, radius } from '../../theme/tokens';

const routes = [
  { path: '/', label: 'Horizons', glyph: '◈' },
  { path: '/calendar', label: 'Calendar', glyph: '◷' },
  { path: '/boards', label: 'Boards', glyph: '▦' },
  { path: '/insights', label: 'Insights', glyph: '▥' },
] as const;

export function AppDock() {
  const router = useRouter();
  const pathname = usePathname();
  const palette = useColorScheme() === 'dark' ? colors.dark : colors.light;
  const { session, busy, error, pause, resume, finish, refresh } = useFocusSession();
  const [clock, setClock] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    setClock(Date.now());
    if (!session || session.status !== 'running') return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') setClock(Date.now());
    });
    return () => { clearInterval(timer); listener.remove(); };
  }, [session?.status, session?.deadlineMs, session?.blockId]);
  useEffect(() => { if (!session) setExpanded(false); }, [session]);
  // A block may be removed or its goal archived from another page.
  useEffect(() => {
    void refresh().catch(() => {});
  }, [pathname, refresh]);
  const remaining = session ? getFocusRemainingMs(session, clock) : 0;
  const finished = !!session && remaining <= 0;

  function onStop() {
    Alert.alert('End this focus session?', 'This stops the timer. Your original goal and scheduled Timebox stay unchanged.', [
      { text: 'Keep focusing', style: 'cancel' },
      { text: 'End session', style: 'destructive', onPress: () => {
        void finish().then(() => setExpanded(false))
          .catch((error: unknown) => Alert.alert('Could not end session', error instanceof Error ? error.message : 'Try again.'));
      } },
    ]);
  }
  function run(action: () => Promise<void>) {
    void action().catch((error: unknown) =>
      Alert.alert('Focus timer', error instanceof Error ? error.message : 'Try again.'));
  }

  return (
    <>
      <SafeAreaView edges={['bottom']} style={[styles.dock, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        {error ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Retry loading focus timer"
            onPress={() => { void refresh().catch(() => {}); }}
            style={[styles.loadError, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text numberOfLines={1} style={[styles.loadErrorText, { color: palette.foreground }]}>
              Focus unavailable · Tap to retry
            </Text>
          </Pressable>
        ) : null}
        {!error && session ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Open focus timer for ${session.goalTitle}`}
            onPress={() => setExpanded(true)}
            style={[styles.miniTimer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.sessionCopy}>
              <Text numberOfLines={1} style={[styles.miniTitle, { color: palette.foreground }]}>
                {finished ? "Time's up · " : session.status === 'paused' ? 'Paused · ' : 'Focusing · '}{session.goalTitle}
              </Text>
              <Text numberOfLines={1} style={[styles.miniCaption, { color: palette.muted }]}>
                {finished ? 'Review your progress' : session.status === 'paused' ? 'Tap to resume or end' : 'Tap to pause or end'}
              </Text>
            </View>
            <Text style={[styles.miniClock, { color: finished ? '#BE8353' : palette.accent }]}>
              {formatFocusTime(remaining)}
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.navigation}>
          {routes.map((route) => {
            const selected = pathname === route.path;
            return (
              <Pressable key={route.path} accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={route.label}
                onPress={() => { if (!selected) router.navigate(route.path); }}
                style={styles.navItem}>
                <View style={[styles.navIndicator, selected && { backgroundColor: palette.surface }]}>
                  <Text style={[styles.navGlyph, { color: selected ? palette.accent : palette.muted }]}>{route.glyph}</Text>
                </View>
                <Text style={[styles.navLabel, { color: selected ? palette.foreground : palette.muted, fontWeight: selected ? '700' : '500' }]}>
                  {route.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
      <Modal visible={expanded && !!session} transparent animationType="fade"
        statusBarTranslucent navigationBarTranslucent onRequestClose={() => setExpanded(false)}>
        <SafeAreaProvider>
          <View style={styles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close focus details" onPress={() => setExpanded(false)} />
            <SafeAreaView edges={['bottom']} style={[styles.panel, { backgroundColor: palette.background }]}>
              <View style={[styles.grabber, { backgroundColor: palette.border }]} />
              <Text style={[styles.eyebrow, { color: palette.accent }]}>YOUR FOCUS SESSION</Text>
              <Text numberOfLines={2} style={[styles.goalTitle, { color: palette.foreground }]}>{session?.goalTitle}</Text>
              <Text style={[styles.clock, { color: finished ? '#BA7C4A' : palette.foreground }]}>
                {formatFocusTime(remaining)}
              </Text>
              <Text style={[styles.explainer, { color: palette.muted }]}>
                {finished ? 'Your timebox has ended. Decide whether to mark the goal complete in Horizons.' :
                  session?.status === 'paused' ? 'Time is paused. Resume when you are ready.' :
                    'A focused window for this goal. The countdown stays accurate when you switch pages or return to the app.'}
              </Text>
              <View style={styles.controls}>
                {!finished ? (
                  <Pressable disabled={busy} accessibilityRole="button"
                    accessibilityLabel={session?.status === 'paused' ? 'Resume focus timer' : 'Pause focus timer'}
                    onPress={() => run(session?.status === 'paused' ? resume : pause)}
                    style={[styles.primary, { backgroundColor: palette.accent }]}>
                    <Text style={styles.primaryText}>{session?.status === 'paused' ? 'Resume' : 'Pause'}</Text>
                  </Pressable>
                ) : null}
                <Pressable disabled={busy} accessibilityRole="button" onPress={finished ? () => run(finish) : onStop}
                  style={[styles.secondary, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                  <Text style={[styles.secondaryText, { color: palette.foreground }]}>
                    {finished ? 'Finish session' : 'End'}
                  </Text>
                </Pressable>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setExpanded(false)} style={styles.close}>
                <Text style={[styles.closeText, { color: palette.muted }]}>Back to planning</Text>
              </Pressable>
            </SafeAreaView>
          </View>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  dock: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
  loadError: { marginHorizontal: 13, marginBottom: 6, borderRadius: radius.md, minHeight: 44,
    paddingHorizontal: 13, borderWidth: 1, justifyContent: 'center' },
  loadErrorText: { fontSize: 12, fontWeight: '600' },
  miniTimer: { minHeight: 58, marginHorizontal: 13, marginBottom: 6, paddingHorizontal: 14, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionCopy: { flex: 1, gap: 4 },
  miniTitle: { fontSize: 13, fontWeight: '700' },
  miniCaption: { fontSize: 11 },
  miniClock: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  navigation: { minHeight: 63, flexDirection: 'row', alignItems: 'center' },
  navItem: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 3 },
  navIndicator: { width: 64, height: 29, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  navGlyph: { fontSize: 24, fontWeight: '600', lineHeight: 27 },
  navLabel: { fontSize: 10 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(6,15,12,0.55)' },
  panel: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 25, paddingTop: 15, paddingBottom: 12 },
  grabber: { width: 38, height: 4, alignSelf: 'center', borderRadius: 3, marginBottom: 24 },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, fontWeight: '800', marginBottom: 10 },
  goalTitle: { fontSize: 20, fontWeight: '700', lineHeight: 27 },
  clock: { fontSize: 58, fontWeight: '800', textAlign: 'center', marginTop: 24, fontVariant: ['tabular-nums'], letterSpacing: -1.4 },
  explainer: { fontSize: 13, lineHeight: 21, textAlign: 'center', marginVertical: 21 },
  controls: { flexDirection: 'row', gap: 10 },
  primary: { flex: 1, minHeight: 55, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondary: { flex: 1, minHeight: 55, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '700' },
  close: { minHeight: 49, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  closeText: { fontSize: 13, fontWeight: '600' },
});

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { HORIZON_TITLES, type Horizon } from '../../domain/horizons';
import type { Goal } from '../../domain/goals';
import type { PerspectiveSection } from '../../domain/perspective';
import { colors, radius, spacing } from '../../theme/tokens';

type Palette = typeof colors.light | typeof colors.dark;

interface Props {
  sections: readonly PerspectiveSection[];
  palette: Palette;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenHorizon: (horizon: Horizon) => void;
  onOpenGoal: (goal: Goal) => void;
  onAddGoal: (horizon: Horizon) => void;
}

export function PerspectiveView({
  sections, palette, loading, error, onRetry, onOpenHorizon, onOpenGoal, onAddGoal,
}: Props) {
  const total = sections.reduce((sum, section) => sum + section.total, 0);
  const active = sections.filter((section) => section.total > 0).length;

  return (
    <View style={styles.container}>
      <View style={styles.introRow}>
        <View style={styles.introCopy}>
          <Text style={[styles.heading, { color: palette.foreground }]}>The bigger picture</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            Seven horizons. One direction.
          </Text>
        </View>
        {!loading && !error ? (
          <View style={[styles.summary, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.summaryValue, { color: palette.foreground }]}>{active}/7</Text>
            <Text style={[styles.summaryLabel, { color: palette.muted }]}>active</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.spinner} size="large" color={palette.accent} />
      ) : error ? (
        <View style={[styles.errorPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.errorText, { color: palette.foreground }]}>Could not load your horizons.</Text>
          <Text style={[styles.errorSubtext, { color: palette.muted }]}>{error}</Text>
          <Pressable onPress={onRetry} style={styles.retryButton} accessibilityRole="button">
            <Text style={[styles.retryText, { color: palette.accent }]}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {total === 0 ? (
            <View style={[styles.welcome, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.welcomeTitle, { color: palette.foreground }]}>Your plans, all in one place.</Text>
              <Text style={[styles.welcomeBody, { color: palette.muted }]}>
                Begin with a horizon that feels meaningful. You can connect smaller steps later.
              </Text>
            </View>
          ) : null}
          {sections.map((section, index) => (
            <View key={section.horizon} style={styles.sectionFrame}>
              {index !== 0 ? <View style={[styles.rail, { backgroundColor: palette.border }]} /> : null}
              <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${HORIZON_TITLES[section.horizon]} horizon, ${section.total} goals`}
                  onPress={() => onOpenHorizon(section.horizon)}
                  style={styles.cardHeader}
                >
                  <View style={[styles.marker, { backgroundColor: section.total ? palette.accent : palette.border }]} />
                  <View style={styles.headerCopy}>
                    <Text style={[styles.horizonTitle, { color: palette.foreground }]}>{HORIZON_TITLES[section.horizon]}</Text>
                    <Text numberOfLines={1} style={[styles.periodLabel, { color: palette.muted }]}>{section.label}</Text>
                  </View>
                  <View style={[styles.count, { backgroundColor: palette.background }]}>
                    <Text style={[styles.countText, { color: palette.foreground }]}>{section.total}</Text>
                  </View>
                  <Text style={[styles.chevron, { color: palette.muted }]}>›</Text>
                </Pressable>

                {section.preview.length ? (
                  <View style={[styles.preview, { borderTopColor: palette.border }]}>
                    {section.preview.map((goal) => (
                      <Pressable
                        key={goal.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${goal.title}`}
                        onPress={() => onOpenGoal(goal)}
                        style={styles.goalRow}
                      >
                        <Text style={[styles.goalMark, { color: goal.completed ? palette.accent : palette.muted }]}>
                          {goal.completed ? '✓' : '○'}
                        </Text>
                        <View style={styles.goalCopy}>
                          <Text numberOfLines={1} style={[styles.goalTitle, {
                            color: palette.foreground,
                            opacity: goal.completed ? 0.6 : 1,
                            textDecorationLine: goal.completed ? 'line-through' : 'none',
                          }]}>{goal.title}</Text>
                          {goal.parentTitle ? (
                            <Text numberOfLines={1} style={[styles.parentHint, { color: palette.muted }]}>
                              ↳ {goal.parentTitle}
                            </Text>
                          ) : null}
                        </View>
                        {goal.childrenCount ? (
                          <Text style={[styles.stepCount, { color: palette.muted }]}>{goal.childrenCount} ↳</Text>
                        ) : null}
                      </Pressable>
                    ))}
                    {section.total > section.preview.length ? (
                      <Pressable accessibilityRole="button" onPress={() => onOpenHorizon(section.horizon)} style={styles.showAll}>
                        <Text style={[styles.showAllText, { color: palette.accent }]}>
                          View all {section.total} goals →
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add goal to ${HORIZON_TITLES[section.horizon]}`}
                  onPress={() => onAddGoal(section.horizon)}
                  style={[styles.addRow, { borderTopColor: palette.border }]}
                >
                  <Text style={[styles.addText, { color: palette.accent }]}>＋  Add goal</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}
      <Text style={[styles.bottomNote, { color: palette.muted }]}>
        Your goals appear in their saved time horizon. Tap any card to focus on it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 26, paddingBottom: 20 },
  introRow: { flexDirection: 'row', gap: 14, justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  introCopy: { flex: 1, gap: 6 },
  heading: { fontSize: 22, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { fontSize: 13, lineHeight: 19 },
  summary: { paddingVertical: 10, paddingHorizontal: 13, minWidth: 67, alignItems: 'center', borderWidth: 1, borderRadius: radius.lg },
  summaryValue: { fontSize: 17, fontWeight: '700' },
  summaryLabel: { fontSize: 10, marginTop: 2 },
  spinner: { marginTop: 36, marginBottom: 40 },
  errorPanel: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: 8 },
  errorText: { fontSize: 15, fontWeight: '600' },
  errorSubtext: { fontSize: 13 },
  retryButton: { minHeight: 48, justifyContent: 'center' },
  retryText: { fontSize: 14, fontWeight: '700' },
  welcome: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: 14, gap: 9 },
  welcomeTitle: { fontSize: 16, fontWeight: '700' },
  welcomeBody: { fontSize: 13, lineHeight: 21 },
  sectionFrame: { marginBottom: 11 },
  rail: { position: 'absolute', left: 20, top: -13, width: 2, height: 14 },
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  cardHeader: { minHeight: 77, flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 16 },
  marker: { width: 9, height: 9, borderRadius: 5 },
  headerCopy: { flex: 1, gap: 5 },
  horizonTitle: { fontSize: 16, fontWeight: '700' },
  periodLabel: { fontSize: 12 },
  count: { minWidth: 33, minHeight: 30, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center', borderRadius: radius.full },
  countText: { fontSize: 12, fontWeight: '700' },
  chevron: { fontSize: 26 },
  preview: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 4 },
  goalRow: { minHeight: 45, flexDirection: 'row', gap: 11, alignItems: 'center' },
  goalMark: { fontSize: 18, width: 21, textAlign: 'center' },
  goalCopy: { flex: 1, gap: 3, paddingVertical: 8 },
  goalTitle: { fontSize: 13, fontWeight: '500' },
  parentHint: { fontSize: 11 },
  stepCount: { fontSize: 12 },
  showAll: { minHeight: 44, justifyContent: 'center', paddingLeft: 31 },
  showAllText: { fontSize: 12, fontWeight: '700' },
  addRow: { borderTopWidth: 1, minHeight: 47, justifyContent: 'center', paddingHorizontal: 18 },
  addText: { fontSize: 13, fontWeight: '700' },
  bottomNote: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 15, paddingHorizontal: 20 },
});

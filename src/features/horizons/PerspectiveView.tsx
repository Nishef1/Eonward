import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { HORIZON_TITLES, type Horizon } from '../../domain/horizons';
import type { Goal } from '../../domain/goals';
import type { PerspectiveSection } from '../../domain/perspective';
import { colors, radius } from '../../theme/tokens';

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

export function PerspectiveView({ sections, palette, loading, error, onRetry, onOpenHorizon, onOpenGoal, onAddGoal }: Props) {
  if (loading) return <ActivityIndicator style={{ marginVertical: 28 }} color={palette.accent} />;
  if (error) return <View style={styles.error}>
    <Text style={{ color: palette.foreground }}>Could not load your horizons.</Text>
    <Text style={{ color: palette.muted }}>{error}</Text>
    <Pressable accessibilityRole="button" onPress={onRetry} style={styles.action}><Text style={{ color: palette.accent }}>Try again</Text></Pressable>
  </View>;
  return <View style={styles.container}>
    <Text style={[styles.intro, { color: palette.muted }]}>Your daily steps and longer-term direction, together.</Text>
    {sections.map((section) => <View key={section.horizon} style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${HORIZON_TITLES[section.horizon]}, ${section.total} goals`}
          onPress={() => onOpenHorizon(section.horizon)} style={styles.headerCopy}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: palette.foreground }]}>{HORIZON_TITLES[section.horizon]}</Text>
            {section.total ? <Text style={[styles.count, { color: palette.muted }]}>{section.total - section.completed} open</Text> : null}
          </View>
          <Text numberOfLines={1} style={[styles.caption, { color: palette.muted }]}>{section.label}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Add goal to ${HORIZON_TITLES[section.horizon]}`}
          onPress={() => onAddGoal(section.horizon)} style={styles.action}>
          <Text style={{ color: palette.accent, fontSize: 23 }}>＋</Text>
        </Pressable>
      </View>
      {section.preview.map((goal) => <Pressable key={goal.id} accessibilityRole="button" onPress={() => onOpenGoal(goal)}
        accessibilityLabel={`Open ${goal.title}`} style={[styles.preview, { borderTopColor: palette.border }]}>
        <Text style={{ color: palette.accent, fontSize: 16 }}>{goal.completed ? '✓' : '○'}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text numberOfLines={2} style={{ color: palette.foreground, fontSize: 14, textDecorationLine: goal.completed ? 'line-through' : 'none' }}>{goal.title}</Text>
          {goal.parentTitle ? <Text numberOfLines={1} style={[styles.caption, { color: palette.muted }]}>↳ {goal.parentTitle}</Text> : null}
        </View>
        <Text style={{ color: palette.muted }}>›</Text>
      </Pressable>)}
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  container: { paddingTop: 4, paddingBottom: 16, gap: 8 }, intro: { fontSize: 12, lineHeight: 19, marginBottom: 7 },
  card: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  headerCopy: { flex: 1, minHeight: 66, justifyContent: 'center', gap: 4, paddingVertical: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, title: { fontSize: 15, fontWeight: '700' },
  count: { fontSize: 11 }, caption: { fontSize: 11, lineHeight: 16 }, action: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  preview: { minHeight: 52, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', gap: 10, alignItems: 'center', borderTopWidth: 1 },
  error: { paddingVertical: 20, gap: 10 },
});

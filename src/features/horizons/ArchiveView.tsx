import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { HORIZON_TITLES } from '../../domain/horizons';
import type { Goal } from '../../domain/goals';
import { colors, radius, spacing } from '../../theme/tokens';

type Palette = typeof colors.light | typeof colors.dark;

interface ArchiveViewProps {
  items: Goal[];
  palette: Palette;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  onRestore: (goal: Goal) => void;
  onRetry: () => void;
}

export function ArchiveView({ items, palette, loading, error, disabled, onRestore, onRetry }: ArchiveViewProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: palette.foreground }]}>Archived goals</Text>
      <Text style={[styles.subtitle, { color: palette.muted }]}>
        Nothing is lost. Restore a goal whenever you need it.
      </Text>
      {loading ? <ActivityIndicator color={palette.accent} style={styles.loader} /> : error ? (
        <View style={[styles.notice, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.noticeText, { color: palette.foreground }]}>{error}</Text>
          <Pressable onPress={onRetry} accessibilityRole="button" style={styles.retry}>
            <Text style={[styles.restoreText, { color: palette.accent }]}>Try again</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.notice, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.noticeTitle, { color: palette.foreground }]}>Your archive is empty</Text>
          <Text style={[styles.noticeText, { color: palette.muted }]}>
            Move goals here when they are no longer part of your active plans.
          </Text>
        </View>
      ) : items.map((goal) => (
        <View key={goal.id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.info}>
            <Text style={[styles.horizon, { color: palette.muted }]}>
              {HORIZON_TITLES[goal.horizon]} · {goal.periodKey}
            </Text>
            <Text style={[styles.goalName, { color: palette.foreground }]} numberOfLines={2}>{goal.title}</Text>
            {goal.parentTitle ? (
              <Text style={[styles.parent, { color: palette.muted }]} numberOfLines={1}>
                ↳ {goal.parentTitle}
              </Text>
            ) : null}
          </View>
          <Pressable disabled={disabled} accessibilityRole="button"
            accessibilityLabel={`Restore ${goal.title}`}
            onPress={() => onRestore(goal)}
            style={[styles.restore, { backgroundColor: palette.background, borderColor: palette.border, opacity: disabled ? 0.5 : 1 }]}>
            <Text style={[styles.restoreText, { color: palette.accent }]}>Restore</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 26, gap: 12, paddingBottom: 24 },
  title: { fontSize: 23, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, lineHeight: 21, marginBottom: 12 },
  loader: { marginTop: 28 },
  notice: { padding: spacing.lg, borderWidth: 1, borderRadius: radius.lg, gap: 8 },
  noticeTitle: { fontSize: 16, fontWeight: '700' },
  noticeText: { fontSize: 13, lineHeight: 21 },
  retry: { minHeight: 48, justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1, gap: 5 },
  goalName: { fontWeight: '600', fontSize: 15, lineHeight: 21 },
  horizon: { fontSize: 11, fontWeight: '600' },
  parent: { fontSize: 12 },
  restore: { borderWidth: 1, minWidth: 86, minHeight: 46, paddingHorizontal: 13, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  restoreText: { fontSize: 13, fontWeight: '700' },
});

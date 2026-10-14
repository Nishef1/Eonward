import { useColorScheme, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/theme/tokens';

export default function Index() {
  const isDark = useColorScheme() === 'dark';
  const palette = isDark ? colors.dark : colors.light;

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: palette.background }]}>
      <View style={styles.content}>
        <View style={[styles.mark, { backgroundColor: palette.accent }]} accessibilityElementsHidden />
        <Text accessibilityRole="header" style={[styles.title, { color: palette.foreground }]}>
          Eonward
        </Text>
        <Text style={[styles.subtitle, { color: palette.muted }]}>
          A quieter place to plan.
        </Text>
        <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.caption, { color: palette.muted }]}>
            Foundation ready
          </Text>
          <Text style={[styles.body, { color: palette.foreground }]}>
            The first planning experience is coming next.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  mark: { width: 38, height: 6, borderRadius: radius.full },
  title: { fontSize: 38, fontWeight: '700', letterSpacing: -1.4 },
  subtitle: { fontSize: 17, lineHeight: 25 },
  panel: { marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, gap: spacing.sm },
  caption: { fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
});

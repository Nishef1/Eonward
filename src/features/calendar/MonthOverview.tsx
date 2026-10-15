import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { analyzeDayLoad, blockOverlapsRange, localDayBounds, localDayKey, monthGridDays, type TimeBlock } from '../../domain/timeblocks';
import { colors, radius, spacing } from '../../theme/tokens';

type Palette = typeof colors.light | typeof colors.dark;
interface Props {
  month: Date;
  blocks: TimeBlock[];
  todayKey: string;
  selectedKey: string;
  palette: Palette;
  onSelectDay: (day: Date) => void;
}
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
function minutesInsideDay(block: TimeBlock, day: Date): number {
  const { from, to } = localDayBounds(day);
  const lower = Date.parse(from), upper = Date.parse(to);
  return blockOverlapsRange(block, lower, upper)
    ? Math.max(0, Math.min(upper, Date.parse(block.endAt)) - Math.max(lower, Date.parse(block.startAt))) / 60000
    : 0;
}
export function MonthOverview({ month, blocks, todayKey, selectedKey, palette, onSelectDay }: Props) {
  const days = monthGridDays(month);
  const metrics = days.map((day) => {
    const key = localDayKey(day);
    const hours = analyzeDayLoad(blocks, day).occupiedMinutes / 60;
    const count = blocks.filter((block) => minutesInsideDay(block, day) > 0).length;
    return { day, key, hours, count, active: day.getMonth() === month.getMonth() };
  });
  const monthHours = metrics.reduce((sum, item) => sum + (item.active ? item.hours : 0), 0);
  const busyDays = metrics.filter((item) => item.active && item.count > 0).length;
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Text style={[styles.eyebrow, { color: palette.accent }]}>MONTH AT A GLANCE</Text>
        <Text style={[styles.heading, { color: palette.foreground }]}>
          {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(month)}
        </Text>
        <Text style={[styles.description, { color: palette.muted }]}>
          Each date shows occupied wall time. Open a date to see exact reservations, overlapping blocks and Focus.
        </Text>
      </View>
      <View style={[styles.calendar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.weekLabels}>
          {LETTERS.map((label, index) => (
            <Text key={index} style={[styles.weekLabel, { color: palette.muted }]}>{label}</Text>
          ))}
        </View>
        <View style={styles.grid}>
          {Array.from({ length: metrics.length / 7 }, (_, week) => <View key={week} style={styles.weekRow}>
          {metrics.slice(week * 7, week * 7 + 7).map(({ day, key, hours, count: events, active }) => {
            const today = key === todayKey;
            const selected = key === selectedKey;
            return (
              <Pressable key={key} accessibilityRole="button"
                accessibilityLabel={day.toDateString() + ', ' + events + ' scheduled blocks. Open timeline.'}
                onPress={() => onSelectDay(day)}
                style={[styles.dayCell, {
                  backgroundColor: today ? palette.accent : selected ? palette.background : 'transparent',
                  opacity: active ? 1 : 0.38,
                  borderColor: selected && !today ? palette.accent : 'transparent',
                }]}>
                <Text style={[styles.dateNumber, { color: today ? palette.onAccent : palette.foreground }]}>
                  {day.getDate()}
                </Text>
                {events ? (
                  <View style={[styles.activity, {
                    width: `${Math.min(80, Math.max(18, (hours / 8) * 80))}%` as const,
                    backgroundColor: today ? palette.onAccent : palette.accent,
                  }]} />
                ) : null}
                {events > 1 ? <Text style={[styles.eventCount, { color: today ? palette.onAccent : palette.muted }]}>
                  {events} plans
                </Text> : null}
              </Pressable>
            );
          })}
          </View>)}
        </View>
      </View>
      <View style={styles.statRow}>
        <View style={[styles.stat, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.statCaption, { color: palette.muted }]}>TIME OCCUPIED</Text>
          <Text style={[styles.statValue, { color: palette.foreground }]}>
            {monthHours >= 1 ? monthHours.toFixed(1) + 'h' : Math.round(monthHours * 60) + 'm'}
          </Text>
        </View>
        <View style={[styles.stat, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.statCaption, { color: palette.muted }]}>ACTIVE DAYS</Text>
          <Text style={[styles.statValue, { color: palette.foreground }]}>{busyDays}</Text>
        </View>
      </View>
      <Text style={[styles.note, { color: palette.muted }]}>
        Overlapping reservations are counted once in occupied time. Recorded Focus is independent and appears in Review.
      </Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingTop: 19, paddingBottom: 42, gap: 17 },
  head: { gap: 7 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  heading: { fontSize: 23, fontWeight: '800', letterSpacing: -0.8 },
  description: { fontSize: 12, lineHeight: 19 },
  calendar: { borderWidth: 1, borderRadius: radius.xl, padding: 12 },
  weekLabels: { flexDirection: 'row', marginBottom: 8 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800' },
  grid: { gap: 4 },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, minHeight: 70, paddingVertical: 7, borderWidth: 1,
    borderRadius: radius.md, alignItems: 'center', justifyContent: 'flex-start', gap: 7 },
  dateNumber: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  activity: { height: 5, borderRadius: 3 },
  eventCount: { fontSize: 8, fontWeight: '700' },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 18, borderRadius: radius.lg, borderWidth: 1, gap: 9 },
  statCaption: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  statValue: { fontSize: 22, fontWeight: '800' },
  note: { fontSize: 11, lineHeight: 18 },
});

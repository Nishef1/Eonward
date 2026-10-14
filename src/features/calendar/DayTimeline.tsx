import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { layoutBlocks, localClock, localDayKey, type TimeBlock } from '../../domain/timeblocks';
import { colors, radius } from '../../theme/tokens';

type Palette = typeof colors.light | typeof colors.dark;

export const TIMELINE_HOUR_HEIGHT = 76;
const ZOOM_LEVELS = [56, 76, 104] as const;
const GUTTER = 62;
const HOURS = Array.from({ length: 25 }, (_, i) => i);
const PALETTE = ['#426C64', '#486C89', '#685F90', '#816078', '#856846', '#4C7278'];

function blockTone(block: TimeBlock): string {
  if (block.kind === 'box') return '#956C3F';
  let hash = 0;
  for (let i = 0; i < block.goalId.length; i++) {
    hash = (hash * 31 + block.goalId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash % PALETTE.length)];
}
function clockLabel(iso: string) {
  return localClock(new Date(iso));
}
function minOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

interface Props {
  date: Date;
  blocks: TimeBlock[];
  palette: Palette;
  isDark: boolean;
  onEdit: (block: TimeBlock) => void;
  onQuickAdd: (hour: number) => void;
  onOpenGoal: (goalId: string) => void;
}
export function DayTimeline({ date, blocks, palette, isDark, onEdit, onQuickAdd, onOpenGoal }: Props) {
  const ref = useRef<ScrollView>(null);
  const didScroll = useRef<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [zoomIndex, setZoomIndex] = useState(1);
  const hourHeight = ZOOM_LEVELS[zoomIndex];
  const zoomedHeight = useRef<number>(hourHeight);
  const scrollOffset = useRef(0);
  const dateKey = localDayKey(date);
  const isToday = localDayKey(now) === dateKey;
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => { clearInterval(interval); listener.remove(); };
  }, []);

  const positioned = useMemo(
    () => layoutBlocks(blocks, hourHeight, date),
    [blocks, dateKey, hourHeight],
  );
  const firstHour = positioned.length
    ? Math.max(0, Math.floor(Math.min(...positioned.map((item) => item.top / hourHeight)) - 1))
    : isToday ? Math.max(0, Math.floor(minOfDay(now) / 60) - 2) : 8;

  function jumpToNow() {
    const minute = minOfDay(new Date());
    ref.current?.scrollTo({ y: Math.max(0, (minute / 60 - 1.25) * hourHeight), animated: true });
    setNow(new Date());
  }

  const shade = isDark ? 'rgba(130,180,159,0.055)' : 'rgba(88,122,109,0.055)';
  const gridLine = isDark ? 'rgba(174,191,179,0.12)' : 'rgba(100,121,111,0.13)';
  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarCopy}>
          <Text style={[styles.heading, { color: palette.foreground }]}>Day timeline</Text>
          <Text style={[styles.subheading, { color: palette.muted }]}>
            Tap an empty hour to plan · hold a block to open its goal
          </Text>
        </View>
        <View style={[styles.zoom, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom out of day timeline"
            accessibilityState={{ disabled: zoomIndex === 0 }}
            disabled={zoomIndex === 0}
            onPress={() => setZoomIndex((value) => Math.max(0, value - 1))}
            style={styles.zoomButton}>
            <Text style={[styles.zoomGlyph, { color: zoomIndex === 0 ? palette.muted : palette.foreground }]}>−</Text>
          </Pressable>
          <Text style={[styles.zoomCenter, { color: palette.muted }]}>{zoomIndex + 1}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Zoom in to day timeline"
            accessibilityState={{ disabled: zoomIndex === ZOOM_LEVELS.length - 1 }}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            onPress={() => setZoomIndex((value) => Math.min(ZOOM_LEVELS.length - 1, value + 1))}
            style={styles.zoomButton}>
            <Text style={[styles.zoomGlyph, { color: zoomIndex === ZOOM_LEVELS.length - 1 ? palette.muted : palette.foreground }]}>＋</Text>
          </Pressable>
        </View>
        {isToday ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Jump to the current time"
            onPress={jumpToNow} style={[styles.nowButton, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.nowDot, { backgroundColor: '#C5814D' }]} />
            <Text style={[styles.nowText, { color: palette.foreground }]}>Now</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.canvasFrame, { borderColor: palette.border, backgroundColor: palette.surface }]}>
        <ScrollView key={dateKey} ref={ref} nestedScrollEnabled showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.canvasScrollContent, { minHeight: hourHeight * 24 + 10 }]}
          scrollEventThrottle={100}
          onScroll={(event) => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}
          onContentSizeChange={() => {
            if (didScroll.current !== dateKey) {
              didScroll.current = dateKey;
              zoomedHeight.current = hourHeight;
              ref.current?.scrollTo({ y: firstHour * hourHeight, animated: false });
            } else if (zoomedHeight.current !== hourHeight) {
              const previous = zoomedHeight.current;
              zoomedHeight.current = hourHeight;
              ref.current?.scrollTo({ y: scrollOffset.current * hourHeight / previous, animated: false });
            }
          }}>
          <View style={[styles.canvas, { height: hourHeight * 24 + 10 }]}>
            <View pointerEvents="none" style={[styles.workHours, {
              top: 8 * hourHeight, height: 10 * hourHeight,
              backgroundColor: shade,
            }]} />
            {HOURS.map((hour) => (
              <View key={hour} pointerEvents="none"
                style={[styles.hourMark, { top: hour * hourHeight }]}>
                <Text style={[styles.hourLabel, { color: palette.muted }]}>
                  {String(hour).padStart(2, '0')}:00
                </Text>
                <View style={[styles.hourRule, { backgroundColor: gridLine }]} />
              </View>
            ))}
            {HOURS.slice(0, 24).map((hour) => (
              <View key={`half-${hour}`} pointerEvents="none"
                style={[styles.halfRule, {
                  top: (hour + 0.5) * hourHeight,
                  backgroundColor: gridLine,
                }]} />
            ))}
            {HOURS.slice(0, 24).map((hour) => (
              <Pressable key={`add-${hour}`} accessibilityRole="button"
                accessibilityLabel={`Plan time at ${String(hour).padStart(2, '0')}:00`}
                onPress={() => onQuickAdd(hour)}
                style={[styles.emptyHour, { top: hour * hourHeight }]}>
                <Text style={[styles.plusHint, { color: palette.muted }]}>+</Text>
              </Pressable>
            ))}
            <View pointerEvents="box-none" style={styles.events}>
              {positioned.map(({ block, top, height, lane, lanes }) => {
                const compact = height < 52;
                const veryCompact = height < 39;
                const tone = blockTone(block);
                return (
                  <Pressable key={block.id} accessibilityRole="button"
                    accessibilityLabel={`${block.goalTitle}, ${clockLabel(block.startAt)} to ${clockLabel(block.endAt)}. Edit time.`}
                    onPress={() => onEdit(block)}
                    onLongPress={() => onOpenGoal(block.goalId)}
                    hitSlop={compact ? 5 : 0}
                    style={[styles.event, {
                      top: top + 1, height: Math.max(21, height - 3),
                      left: `${100 * lane / lanes}%`, width: `${100 / lanes}%`,
                      backgroundColor: tone,
                      borderLeftColor: block.kind === 'box' ? '#E6B579' : 'rgba(255,255,255,0.65)',
                      opacity: block.goalCompleted ? 0.68 : 1,
                    }]}>
                    {veryCompact ? (
                      <Text numberOfLines={1} style={styles.microTitle}>
                        {clockLabel(block.startAt)} · {block.goalTitle}
                      </Text>
                    ) : (
                      <>
                        <Text numberOfLines={1} style={styles.eventTime}>
                          {clockLabel(block.startAt)} – {clockLabel(block.endAt)}
                          {block.kind === 'box' ? '  ·  BOX' : ''}
                        </Text>
                        <Text numberOfLines={height < 75 ? 1 : 2}
                          style={[styles.eventTitle, block.goalCompleted && styles.doneTitle]}>
                          {block.goalTitle}
                        </Text>
                        {height > 114 && block.intention ? (
                          <Text numberOfLines={2} style={styles.eventIntention}>{block.intention}</Text>
                        ) : null}
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
            {isToday ? (
              <View pointerEvents="none"
                style={[styles.presentLine, { top: minOfDay(now) / 60 * hourHeight }]}>
                <View style={styles.nowPill}>
                  <Text style={styles.nowPillText}>{localClock(now)}</Text>
                </View>
                <View style={styles.nowLine} />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 250 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 11 },
  toolbarCopy: { flex: 1, gap: 4 },
  heading: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
  subheading: { fontSize: 11, lineHeight: 16 },
  zoom: { height: 39, flexDirection: 'row', alignItems: 'center', borderRadius: radius.full, borderWidth: 1 },
  zoomButton: { minWidth: 30, height: 39, alignItems: 'center', justifyContent: 'center' },
  zoomGlyph: { fontSize: 18, fontWeight: '700' },
  zoomCenter: { fontSize: 10, fontWeight: '800', minWidth: 13, textAlign: 'center' },
  nowButton: { height: 39, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 13 },
  nowDot: { height: 7, width: 7, borderRadius: 4 },
  nowText: { fontSize: 12, fontWeight: '700' },
  canvasFrame: { flex: 1, overflow: 'hidden', borderWidth: 1, borderRadius: radius.xl },
  canvasScrollContent: { minHeight: TIMELINE_HOUR_HEIGHT * 24 + 10 },
  canvas: { position: 'relative', height: TIMELINE_HOUR_HEIGHT * 24 + 10 },
  workHours: { position: 'absolute', left: GUTTER, right: 0 },
  hourMark: { position: 'absolute', left: 0, right: 0, height: 18, flexDirection: 'row', alignItems: 'center' },
  hourLabel: { width: GUTTER - 8, paddingLeft: 11, fontSize: 10, textAlign: 'right', fontWeight: '600', fontVariant: ['tabular-nums'] },
  hourRule: { flex: 1, height: 1, marginHorizontal: 8 },
  halfRule: { position: 'absolute', left: GUTTER + 7, right: 9, height: StyleSheet.hairlineWidth, opacity: 0.5 },
  emptyHour: { position: 'absolute', height: TIMELINE_HOUR_HEIGHT, left: GUTTER, right: 6, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 10 },
  plusHint: { fontSize: 13, opacity: 0.24 },
  events: { position: 'absolute', top: 0, bottom: 0, left: GUTTER + 2, right: 7 },
  event: { position: 'absolute', borderRadius: 11, borderLeftWidth: 4, paddingHorizontal: 9, paddingVertical: 5, overflow: 'hidden', elevation: 1 },
  eventTime: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '700', fontVariant: ['tabular-nums'] },
  eventTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginTop: 3 },
  doneTitle: { textDecorationLine: 'line-through' },
  eventIntention: { color: 'rgba(255,255,255,0.83)', fontSize: 11, marginTop: 7 },
  microTitle: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  presentLine: { position: 'absolute', left: 0, right: 0, height: 22, flexDirection: 'row', alignItems: 'center', zIndex: 12, transform: [{ translateY: -11 }] },
  nowPill: { marginLeft: 5, width: 49, borderRadius: 7, height: 23, backgroundColor: '#BA7748', justifyContent: 'center', alignItems: 'center' },
  nowPillText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  nowLine: { flex: 1, height: 2, marginRight: 8, backgroundColor: '#C18457' },
});

import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { blockClockRangeForDay, layoutBlocks, localClock, localDayBounds, localDayKey, type TimeBlock } from '../../domain/timeblocks';
import { colors, radius } from '../../theme/tokens';
import { getFocusElapsedMs, type FocusSession } from '../../domain/focus';
import { pixelsToQuarterHours, previewTimelineEdit, type TimelineEditMode, type TimelineEditPreview } from '../../domain/timeline-edit';

type Palette = typeof colors.light | typeof colors.dark;

export const TIMELINE_HOUR_HEIGHT = 76;
const ZOOM_LEVELS = [56, 76, 104] as const;
const GUTTER = 62;
const HOURS = Array.from({ length: 25 }, (_, i) => i);
/** Timebox is warm, planned time is teal, completed items are neutral.
 * Status labels supplement the colors rather than relying on color alone. */
function blockTone(block: TimeBlock): string {
  if (block.goalCompleted) return '#66716E';
  return block.kind === 'box' ? '#956C3F' : '#3F6C65';
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
  actualByBlock: Record<string, number>;
  activeSession: FocusSession | null;
  busy: boolean;
  onApplyTimeEdit: (preview: TimelineEditPreview, onSaved: () => void) => void;
}
export function DayTimeline({ date, blocks, palette, isDark, onEdit, onQuickAdd, onOpenGoal, actualByBlock, activeSession, busy, onApplyTimeEdit }: Props) {
  const ref = useRef<ScrollView>(null);
  const didScroll = useRef<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [zoomIndex, setZoomIndex] = useState(1);
  const hourHeight = ZOOM_LEVELS[zoomIndex];
  const zoomedHeight = useRef<number>(hourHeight);
  const scrollOffset = useRef(0);
  const dragOriginY = useRef(0);
  const [draft, setDraft] = useState<{ id: string; mode: TimelineEditMode; delta: number } | null>(null);
  const dateKey = localDayKey(date);
  const isToday = localDayKey(now) === dateKey;
  const offset = now.getTimezoneOffset();
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
    [blocks, dateKey, hourHeight, offset],
  );
  const visibleRange = (block: TimeBlock) => blockClockRangeForDay(block, date);
  const editing = draft && blocks.find((block) => block.id === draft.id);
  const candidate = useMemo(() => {
    if (!draft || !editing) return { preview: null as TimelineEditPreview | null, error: '' };
    if (activeSession?.blockId === draft.id) return { preview: null, error: 'End Focus before changing its reserved time.' };
    try {
      return { preview: previewTimelineEdit(editing, blocks, date, draft.mode, draft.delta), error: '' };
    } catch (err) {
      return { preview: null, error: err instanceof Error ? err.message : 'Unable to preview this change.' };
    }
  }, [draft, editing, blocks, dateKey, activeSession?.blockId]);
  useEffect(() => { setDraft(null); }, [dateKey]);
  const ghost = useMemo(() => {
    if (!candidate.preview || !editing || draft?.delta === 0) return null;
    return layoutBlocks([{ ...editing, startAt: candidate.preview.toStart, endAt: candidate.preview.toEnd }], hourHeight, date)[0] ?? null;
  }, [candidate.preview?.toStart, candidate.preview?.toEnd, editing, hourHeight, dateKey]);
  function beginDrag(block: TimeBlock, mode: TimelineEditMode, pageY: number) {
    dragOriginY.current = pageY;
    setDraft({ id: block.id, mode, delta: 0 });
  }
  function continueDrag(block: TimeBlock, mode: TimelineEditMode, pageY: number) {
    const delta = pixelsToQuarterHours(pageY - dragOriginY.current, hourHeight);
    setDraft((previous) => previous?.id === block.id && previous.mode === mode && previous.delta === delta
      ? previous : { id: block.id, mode, delta });
  }
  const firstHour = positioned.length
    ? Math.max(0, Math.floor(Math.min(...positioned.map((item) => item.top / hourHeight)) - 1))
    : isToday ? Math.max(0, Math.floor(minOfDay(now) / 60) - 2) : 8;

  function jumpToNow() {
    const minute = minOfDay(new Date());
    ref.current?.scrollTo({ y: Math.max(0, (minute / 60 - 1.25) * hourHeight), animated: true });
    setNow(new Date());
  }

  const ribbon = useMemo(() => {
    const { from, to } = localDayBounds(date);
    const begin = Date.parse(from), end = Date.parse(to), span = end - begin;
    if (span !== 86400000) return null; // DST days use exact List mode rather than misleading compression.
    return blocks.map((block) => {
      const start = Math.max(begin, Date.parse(block.startAt));
      const finish = Math.min(end, Date.parse(block.endAt));
      if (finish <= start) return null;
      return { id: block.id, left: (start - begin) / span * 100,
        width: (finish - start) / span * 100, tone: blockTone(block) };
    }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [blocks, dateKey, offset]);
  const recordedMs = Object.values(actualByBlock).reduce((sum, value) => sum + value, 0) +
    (activeSession && blocks.some((b) => b.id === activeSession.blockId)
      ? getFocusElapsedMs(activeSession, now.getTime()) : 0);
  const shade = isDark ? 'rgba(130,180,159,0.055)' : 'rgba(88,122,109,0.055)';
  const gridLine = isDark ? 'rgba(174,191,179,0.12)' : 'rgba(100,121,111,0.13)';
  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="How to use the timeline"
          onPress={() => Alert.alert('Your timeline', 'Tap an empty hour to reserve time. Tap a block to edit, or hold it to adjust its schedule in 15-minute steps. Long blocks also have drag and resize grips. Nothing moves until you confirm.')}
          style={[styles.toolbarCopy, { minHeight: 48, justifyContent: 'center' }]}>
          <Text style={[styles.heading, { color: palette.foreground }]}>Living timeline ⓘ</Text>
          <Text style={{ color: palette.muted, fontSize: 11 }}>
            {Math.floor(recordedMs / 60000)}m linked Focus · sessions ending here + active time
          </Text>
        </Pressable>
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

      {ribbon ? <View accessible accessibilityRole="summary"
        accessibilityLabel={`24-hour overview showing ${ribbon.length} scheduled reservations`}
        style={styles.ribbonRegion}>
        <View style={styles.ribbonLabels}>
          <Text style={[styles.ribbonLabel, { color: palette.muted }]}>MIDNIGHT</Text>
          <Text style={[styles.ribbonLabel, { color: palette.muted }]}>NOON</Text>
          <Text style={[styles.ribbonLabel, { color: palette.muted }]}>MIDNIGHT</Text>
        </View>
        <View pointerEvents="none" style={[styles.ribbonTrack, { backgroundColor: palette.inset }]}>
          {ribbon.map((item) => <View key={item.id}
            style={[styles.ribbonBlock, { left: `${item.left}%`, width: `${item.width}%`, backgroundColor: item.tone }]} />)}
          {isToday ? <View style={[styles.ribbonNow, { left: `${Math.min(100, minOfDay(now) / 1440 * 100)}%` }]} /> : null}
        </View>
      </View> : null}
      {draft ? <View style={[styles.adjustPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.adjustTop}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text numberOfLines={1} style={[styles.adjustTitle, { color: palette.foreground }]}>
              {editing?.goalTitle ?? 'Time adjustment'} · {draft.mode === 'move' ? 'Move' : 'Resize'}
            </Text>
            <Text style={[styles.adjustHint, { color: palette.muted }]}>
              {candidate.preview ?
                `${clockLabel(candidate.preview.toStart)}–${clockLabel(candidate.preview.toEnd)}
                ${candidate.preview.conflicts ? ' · ' + candidate.preview.conflicts + ' overlapping' : ' · No collisions'}`
                : candidate.error}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel timeline time adjustment"
            onPress={() => setDraft(null)} style={styles.adjustClose}>
            <Text style={{ color: palette.foreground, fontSize: 20 }}>×</Text>
          </Pressable>
        </View>
        <View style={styles.adjustActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Change adjustment to move the whole block"
            accessibilityState={{ selected: draft.mode === 'move' }}
            onPress={() => setDraft({ ...draft, mode: 'move', delta: 0 })}
            style={[styles.adjustMode, { backgroundColor: draft.mode === 'move' ? palette.accentSoft : palette.background }]}>
            <Text style={{ color: draft.mode === 'move' ? palette.accent : palette.muted, fontWeight: '700' }}>Move</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Change adjustment to resize the end time"
            accessibilityState={{ selected: draft.mode === 'resize' }}
            onPress={() => setDraft({ ...draft, mode: 'resize', delta: 0 })}
            style={[styles.adjustMode, { backgroundColor: draft.mode === 'resize' ? palette.accentSoft : palette.background }]}>
            <Text style={{ color: draft.mode === 'resize' ? palette.accent : palette.muted, fontWeight: '700' }}>Resize</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Move proposed time 15 minutes earlier"
            onPress={() => setDraft((prev) => prev ? { ...prev, delta: prev.delta - 15 } : null)}
            style={[styles.adjustStep, { borderColor: palette.border }]}>
            <Text style={[styles.adjustStepLabel, { color: palette.foreground }]}>−15</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Move proposed time 15 minutes later"
            onPress={() => setDraft((prev) => prev ? { ...prev, delta: prev.delta + 15 } : null)}
            style={[styles.adjustStep, { borderColor: palette.border }]}>
            <Text style={[styles.adjustStepLabel, { color: palette.foreground }]}>+15</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Confirm timeline schedule change"
            accessibilityState={{ disabled: busy || !candidate.preview || draft.delta === 0 }}
            disabled={busy || !candidate.preview || draft.delta === 0}
            onPress={() => { if (candidate.preview) onApplyTimeEdit(candidate.preview, () => setDraft(null)); }}
            style={[styles.adjustApply, { backgroundColor: palette.accent,
              opacity: busy || !candidate.preview || draft.delta === 0 ? 0.4 : 1 }]}>
            <Text style={{ color: palette.onAccent, fontWeight: '700' }}>{busy ? 'Saving' : 'Apply'}</Text>
          </Pressable>
        </View>
        <Text style={[styles.adjustFooter, { color: palette.muted }]}>
          Preview only · Fixed commitments never move automatically. Existing overlaps are shown, not hidden.
        </Text>
      </View> : null}
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
                style={[styles.emptyHour, { top: hour * hourHeight, height: hourHeight }]}>
                <Text style={[styles.plusHint, { color: palette.muted }]}>+</Text>
              </Pressable>
            ))}
            <View pointerEvents="box-none" style={styles.events}>
              {positioned.map(({ block, top, height, lane, lanes }) => {
                const compact = height < 52;
                const veryCompact = height < 39;
                const tone = blockTone(block);
                const focusedMs = (actualByBlock[block.id] ?? 0) +
                  (activeSession?.blockId === block.id ? getFocusElapsedMs(activeSession, now.getTime()) : 0);
                const plannedMs = Date.parse(block.endAt) - Date.parse(block.startAt);
                const progress = plannedMs > 0 ? Math.min(1, focusedMs / plannedMs) : 0;
                return (
                  <Pressable key={block.id} accessibilityRole="button"
                    accessibilityLabel={`${block.goalTitle}, ${visibleRange(block)}, ${block.kind === 'box' ? 'Timebox' : 'time reservation'}, ${block.flexible ? 'flexible' : 'fixed'}, ${block.goalCompleted ? 'completed' : 'open'}. Tap to edit, hold to adjust.`}
                    onPress={() => onEdit(block)}
                    onLongPress={() => setDraft({ id: block.id, mode: 'move', delta: 0 })}
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
                        {visibleRange(block).split(' – ')[0]} · {block.goalTitle}
                      </Text>
                    ) : (
                      <>
                        <Text numberOfLines={1} style={styles.eventTime}>
                          {visibleRange(block)}
                          {block.kind === 'box' ? ' · TIMEBOX' : ' · PLANNED'}{block.flexible ? ' · FLEXIBLE' : ' · FIXED'}
                        </Text>
                        <Text numberOfLines={height < 75 ? 1 : 2}
                          style={[styles.eventTitle, block.goalCompleted && styles.doneTitle]}>
                          {block.goalTitle}
                        </Text>
                        {height > 70 && focusedMs > 0 ? (
                          <View accessibilityLabel={`${Math.floor(focusedMs / 60000)} minutes Focus recorded`}
                            style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                          </View>
                        ) : null}
                        {height > 114 && block.intention ? (
                          <Text numberOfLines={2} style={styles.eventIntention}>{block.intention}</Text>
                        ) : null}
                      </>
                    )}
                    {height >= 98 && lanes === 1 && !block.goalCompleted &&
                      activeSession?.blockId !== block.id ? (
                      <View accessibilityRole="adjustable"
                        accessibilityLabel={`Drag ${block.goalTitle} to move its time in 15-minute increments`}
                        onStartShouldSetResponder={() => true}
                        onResponderGrant={(e) => beginDrag(block, 'move', e.nativeEvent.pageY)}
                        onResponderMove={(e) => continueDrag(block, 'move', e.nativeEvent.pageY)}
                        style={styles.dragGrip}>
                        <Text style={styles.dragGlyph}>↕</Text>
                      </View>
                    ) : null}
                    {height >= 177 && lanes === 1 && !block.goalCompleted &&
                      activeSession?.blockId !== block.id ? (
                      <View accessibilityRole="adjustable"
                        accessibilityLabel={`Drag bottom of ${block.goalTitle} to resize its end`}
                        onStartShouldSetResponder={() => true}
                        onResponderGrant={(e) => beginDrag(block, 'resize', e.nativeEvent.pageY)}
                        onResponderMove={(e) => continueDrag(block, 'resize', e.nativeEvent.pageY)}
                        style={styles.resizeGrip}>
                        <Text style={styles.dragGlyph}>↧</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
              {ghost ? <View pointerEvents="none"
                accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
                style={[styles.ghost, {
                  top: ghost.top + 1, height: Math.max(30, ghost.height - 3),
                  borderColor: palette.accent,
                  backgroundColor: palette.accentSoft,
                }]}>
                <Text numberOfLines={2} style={[styles.ghostTitle, { color: palette.accent }]}>
                  {ghost.block.goalTitle} · Proposed
                </Text>
                <Text style={[styles.ghostClock, { color: palette.accent }]}>
                  {candidate.preview ? `${clockLabel(candidate.preview.toStart)}–${clockLabel(candidate.preview.toEnd)}` : ''}
                </Text>
              </View> : null}
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
  ribbonRegion: { paddingTop: 3, paddingBottom: 12, gap: 6 },
  ribbonLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  ribbonLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.7 },
  ribbonTrack: { height: 13, borderRadius: 6, overflow: 'visible', position: 'relative' },
  ribbonBlock: { position: 'absolute', top: 0, bottom: 0, borderRadius: 3, opacity: 0.86 },
  ribbonNow: { position: 'absolute', top: -4, bottom: -4, width: 2, borderRadius: 2, backgroundColor: '#C18457' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 11 },
  toolbarCopy: { flex: 1, gap: 4 },
  heading: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
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
  emptyHour: { position: 'absolute', left: GUTTER, right: 6, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 10 },
  plusHint: { fontSize: 13, opacity: 0.24 },
  events: { position: 'absolute', top: 0, bottom: 0, left: GUTTER + 2, right: 7 },
  event: { position: 'absolute', borderRadius: 11, borderLeftWidth: 4, paddingHorizontal: 9, paddingVertical: 5, overflow: 'hidden', elevation: 1 },
  dragGrip: { position: 'absolute', top: 2, right: 0, width: 46, height: 48,
    justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.13)', borderRadius: 11 },
  resizeGrip: { position: 'absolute', bottom: 0, right: 0, width: 46, height: 48,
    justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 11 },
  dragGlyph: { fontSize: 20, color: '#FFFFFF', fontWeight: '800' },
  ghost: { position: 'absolute', left: 0, right: 0, borderWidth: 2, borderStyle: 'dashed', borderRadius: 12,
    zIndex: 10, justifyContent: 'center', padding: 10, opacity: 0.92 },
  ghostTitle: { fontSize: 13, fontWeight: '800' },
  ghostClock: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  adjustPanel: { gap: 7, borderWidth: 1, borderRadius: 15, padding: 10, marginBottom: 10 },
  adjustTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adjustTitle: { fontSize: 13, fontWeight: '800' },
  adjustHint: { fontSize: 12, lineHeight: 18 },
  adjustClose: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  adjustActions: { flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  adjustMode: { minHeight: 48, minWidth: 56, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  adjustStep: { minHeight: 48, minWidth: 48, paddingHorizontal: 5, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  adjustStepLabel: { fontSize: 12, fontWeight: '800' },
  adjustApply: { minHeight: 48, minWidth: 61, paddingHorizontal: 6, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center' },
  adjustFooter: { fontSize: 11, lineHeight: 16 },
  eventTime: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  eventTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginTop: 3 },
  doneTitle: { textDecorationLine: 'line-through' },
  eventIntention: { color: 'rgba(255,255,255,0.83)', fontSize: 11, marginTop: 7 },
  microTitle: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  progressTrack: { backgroundColor: 'rgba(255,255,255,0.25)', height: 4, borderRadius: 4, marginTop: 7, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 4, backgroundColor: '#FFFFFF' },
  presentLine: { position: 'absolute', left: 0, right: 0, height: 22, flexDirection: 'row', alignItems: 'center', zIndex: 12, transform: [{ translateY: -11 }] },
  nowPill: { marginLeft: 5, width: 49, borderRadius: 7, height: 23, backgroundColor: '#BA7748', justifyContent: 'center', alignItems: 'center' },
  nowPillText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  nowLine: { flex: 1, height: 2, marginRight: 8, backgroundColor: '#C18457' },
});

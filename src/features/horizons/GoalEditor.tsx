import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { dateFromPeriodKey, HORIZONS, HORIZON_TITLES, parseDateInput, periodKey, periodLabel, shiftPeriod, type Horizon } from '../../domain/horizons';
import type { Goal, GoalInput } from '../../domain/goals';
import { colors, radius, spacing } from '../../theme/tokens';

type Palette = typeof colors.light | typeof colors.dark;

interface GoalEditorProps {
  visible: boolean;
  initial: Goal | null;
  parent: Goal | null;
  parentOptions: Goal[];
  defaultHorizon: Horizon;
  anchorDate: Date;
  palette: Palette;
  saving: boolean;
  onDismiss: () => void;
  onSave: (input: GoalInput) => Promise<void>;
}

export function GoalEditor({
  visible, initial, parent, parentOptions, defaultHorizon, anchorDate, palette, saving, onDismiss, onSave,
}: GoalEditorProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [horizon, setHorizon] = useState<Horizon>(defaultHorizon);
  const [date, setDate] = useState(() => new Date());
  const [dateText, setDateText] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [showParents, setShowParents] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const anchorTime = anchorDate.getTime();

  useEffect(() => {
    if (!visible) return;
    const initialHorizon = initial?.horizon ?? defaultHorizon;
    const initialDate = initial
      ? dateFromPeriodKey(initial.horizon, initial.periodKey, anchorDate)
      : new Date(anchorTime);
    setTitle(initial?.title ?? '');
    setNotes(initial?.notes ?? '');
    setHorizon(initialHorizon);
    setDate(initialDate);
    setDateText(periodKey('day', initialDate));
    setParentId(initial?.parentId ?? parent?.id ?? null);
    setParentSearch('');
    setShowParents(false);
  }, [visible, initial?.id, defaultHorizon, parent?.id, anchorTime]);

  const validDate = horizon !== 'day' || parseDateInput(dateText) !== null;
  const chosenDate = horizon === 'day' ? parseDateInput(dateText) ?? date : date;
  const selectedKey = periodKey(horizon, chosenDate);
  const isValid = title.trim().length > 0 && title.trim().length <= 180 && validDate;
  const currentParent = parentOptions.find((choice) => choice.id === parentId) ?? (parent?.id === parentId ? parent : null);
  const filteredParents = useMemo(() => parentOptions.filter((goal) =>
    goal.title.toLowerCase().includes(parentSearch.trim().toLowerCase()),
  ).slice(0, 12), [parentOptions, parentSearch]);

  function movePeriod(delta: number) {
    const base = horizon === 'day' ? parseDateInput(dateText) ?? date : date;
    const next = shiftPeriod(horizon, base, delta);
    setDate(next);
    setDateText(periodKey('day', next));
  }

  function changeHorizon(next: Horizon) {
    setHorizon(next);
    if (horizon === 'day') {
      const selected = parseDateInput(dateText);
      if (selected) setDate(selected);
    }
  }

  function submit() {
    if (!isValid || saving) return;
    void onSave({ title, notes, horizon, periodKey: selectedKey, parentId });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Dismiss editor" />
        <View style={[styles.sheet, { backgroundColor: palette.background }]}>
          <View style={[styles.grabber, { backgroundColor: palette.border }]} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.eyebrow, { color: palette.accent }]}>PLAN WITH INTENTION</Text>
              <Text style={[styles.heading, { color: palette.foreground }]}>
                {initial ? 'Edit your goal' : parent ? 'A smaller step' : 'Create a goal'}
              </Text>
            </View>
            <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close" style={styles.closeButton}>
              <Text style={[styles.close, { color: palette.muted }]}>×</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: palette.muted }]}>GOAL</Text>
            <TextInput
              autoFocus={!initial}
              placeholder="What would you like to achieve?"
              placeholderTextColor={palette.muted}
              value={title}
              onChangeText={setTitle}
              maxLength={180}
              style={[styles.titleInput, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.foreground }]}
              accessibilityLabel="Goal name"
              returnKeyType="next"
            />
            <Text style={[styles.label, { color: palette.muted }]}>TIME HORIZON</Text>
            <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {HORIZONS.map((item) => {
                const active = horizon === item;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => changeHorizon(item)}
                    style={[styles.chip, { backgroundColor: active ? palette.foreground : palette.surface, borderColor: active ? palette.foreground : palette.border }]}
                  >
                    <Text style={[styles.chipText, { color: active ? palette.background : palette.foreground }]}>{HORIZON_TITLES[item]}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={[styles.label, { color: palette.muted }]}>WHEN</Text>
            <View style={[styles.periodRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Pressable disabled={horizon === 'life'} accessibilityRole="button" accessibilityLabel="Previous planning period"
                style={styles.periodAction} onPress={() => movePeriod(-1)}>
                <Text style={[styles.arrow, { color: palette.foreground }]}>‹</Text>
              </Pressable>
              <View style={styles.periodMiddle}>
                <Text style={[styles.periodTitle, { color: palette.foreground }]} numberOfLines={2}>{periodLabel(horizon, chosenDate)}</Text>
                <Pressable onPress={() => { setDate(new Date()); setDateText(periodKey('day', new Date())); }}
                  accessibilityRole="button" accessibilityLabel="Use current period">
                  <Text style={[styles.now, { color: palette.accent }]}>Go to current period</Text>
                </Pressable>
              </View>
              <Pressable disabled={horizon === 'life'} accessibilityRole="button" accessibilityLabel="Next planning period"
                style={styles.periodAction} onPress={() => movePeriod(1)}>
                <Text style={[styles.arrow, { color: palette.foreground }]}>›</Text>
              </Pressable>
            </View>
            {horizon === 'day' ? (
              <>
                <Text style={[styles.dateHelp, { color: palette.muted }]}>Or enter an exact date (YYYY-MM-DD)</Text>
                <TextInput
                  value={dateText}
                  onChangeText={(value) => {
                    setDateText(value);
                    const parsed = parseDateInput(value);
                    if (parsed) setDate(parsed);
                  }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={palette.muted}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  accessibilityLabel="Exact date"
                  style={[styles.dateInput, { color: palette.foreground, backgroundColor: palette.surface, borderColor: validDate ? palette.border : '#B34F4F' }]}
                />
                {!validDate ? <Text style={styles.validation}>Enter an existing date, for example 2026-10-14.</Text> : null}
              </>
            ) : null}
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: palette.muted }]}>PART OF</Text>
              <Text style={[styles.optional, { color: palette.muted }]}>optional</Text>
            </View>
            <Pressable
              onPress={() => setShowParents((value) => !value)}
              accessibilityRole="button"
              accessibilityLabel="Select parent goal"
              style={[styles.parentSelect, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Text style={[styles.parentLabel, { color: palette.foreground }]} numberOfLines={1}>{currentParent?.title ?? 'Independent goal'}</Text>
              <Text style={[styles.parentArrow, { color: palette.muted }]}>{showParents ? '⌃' : '⌄'}</Text>
            </Pressable>
            {showParents ? (
              <View style={[styles.parentOptions, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <TextInput value={parentSearch} onChangeText={setParentSearch} placeholder="Search your goals"
                  placeholderTextColor={palette.muted} style={[styles.search, { color: palette.foreground, borderColor: palette.border }]} />
                <Pressable style={styles.parentChoice} accessibilityRole="button" onPress={() => { setParentId(null); setShowParents(false); }}>
                  <Text style={[styles.parentOptionText, { color: palette.foreground }]}>○  Independent goal</Text>
                </Pressable>
                {filteredParents.map((option) => (
                  <Pressable key={option.id} style={styles.parentChoice} accessibilityRole="button" onPress={() => { setParentId(option.id); setShowParents(false); }}>
                    <Text style={[styles.parentOptionText, { color: palette.foreground }]} numberOfLines={1}>
                      {option.id === parentId ? '✓  ' : '↳  '}{option.title}
                    </Text>
                  </Pressable>
                ))}
                {filteredParents.length === 0 ? (
                  <Text style={[styles.dateHelp, { color: palette.muted }]}>No matching goals</Text>
                ) : null}
              </View>
            ) : null}
            <Text style={[styles.label, { color: palette.muted }]}>NOTES <Text style={styles.optional}>(OPTIONAL)</Text></Text>
            <TextInput
              placeholder="A little context helps you move forward..."
              placeholderTextColor={palette.muted}
              value={notes}
              onChangeText={setNotes}
              multiline textAlignVertical="top"
              style={[styles.notesInput, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.foreground }]}
              accessibilityLabel="Goal notes"
            />
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !isValid || saving }}
              disabled={!isValid || saving} onPress={submit}
              style={[styles.save, { backgroundColor: palette.accent, opacity: isValid && !saving ? 1 : 0.45 }]}>
              <Text style={styles.saveText}>{saving ? 'Saving…' : initial ? 'Save changes' : 'Create goal'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(9, 22, 18, 0.42)' },
  sheet: { maxHeight: '94%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10 },
  grabber: { height: 4, width: 36, alignSelf: 'center', borderRadius: 10, marginBottom: 18 },
  header: { paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCopy: { flex: 1, gap: 5 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  heading: { fontSize: 24, fontWeight: '700', letterSpacing: -0.7 },
  closeButton: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' },
  close: { fontSize: 28 },
  form: { paddingHorizontal: spacing.lg, paddingBottom: 42, paddingTop: spacing.lg, gap: spacing.md },
  label: { fontSize: 11, letterSpacing: 1.15, fontWeight: '700', marginTop: spacing.sm },
  titleInput: { borderWidth: 1, borderRadius: radius.lg, fontSize: 16, padding: spacing.md, minHeight: 56 },
  notesInput: { borderWidth: 1, borderRadius: radius.lg, fontSize: 15, padding: spacing.md, minHeight: 110 },
  chips: { gap: spacing.sm, paddingVertical: 1 },
  chip: { borderWidth: 1, paddingVertical: 12, paddingHorizontal: 15, borderRadius: radius.full, minHeight: 46, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '600' },
  periodRow: { minHeight: 83, borderWidth: 1, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center' },
  periodAction: { width: 48, minHeight: 70, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 29 },
  periodMiddle: { flex: 1, gap: 6, alignItems: 'center' },
  periodTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  now: { fontSize: 12, fontWeight: '600' },
  dateHelp: { fontSize: 12, marginTop: -7 },
  dateInput: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15 },
  validation: { color: '#B34F4F', fontSize: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optional: { fontSize: 11, fontWeight: '400', letterSpacing: 0 },
  parentSelect: { minHeight: 52, borderWidth: 1, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm },
  parentLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  parentArrow: { fontSize: 20 },
  parentOptions: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.sm, gap: 2 },
  search: { borderBottomWidth: 1, minHeight: 44, paddingHorizontal: 8 },
  parentChoice: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 10 },
  parentOptionText: { fontSize: 14 },
  save: { minHeight: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

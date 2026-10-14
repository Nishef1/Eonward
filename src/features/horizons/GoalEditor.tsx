import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { HORIZONS, HORIZON_TITLES, periodKey, periodLabel, type Horizon } from '../../domain/horizons';
import type { Goal, GoalInput } from '../../domain/goals';
import { colors, radius, spacing } from '../../theme/tokens';

type Palette = typeof colors.light | typeof colors.dark;

interface GoalEditorProps {
  visible: boolean;
  initial: Goal | null;
  parent: Goal | null;
  defaultHorizon: Horizon;
  anchorDate: Date;
  palette: Palette;
  saving: boolean;
  onDismiss: () => void;
  onSave: (input: GoalInput) => Promise<void>;
}

export function GoalEditor({
  visible, initial, parent, defaultHorizon, anchorDate, palette, saving, onDismiss, onSave,
}: GoalEditorProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [horizon, setHorizon] = useState<Horizon>(defaultHorizon);

  useEffect(() => {
    if (!visible) return;
    setTitle(initial?.title ?? '');
    setNotes(initial?.notes ?? '');
    setHorizon(initial?.horizon ?? defaultHorizon);
  }, [visible, initial?.id, defaultHorizon]);

  const inputValid = title.trim().length > 0 && title.trim().length <= 180;
  const previewKey = initial?.horizon === horizon
    ? initial.periodKey
    : periodKey(horizon, anchorDate);

  function submit() {
    if (!inputValid || saving) return;
    void onSave({
      title,
      notes,
      horizon,
      periodKey: previewKey,
      parentId: initial?.parentId ?? parent?.id ?? null,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Close editor" />
        <View style={[styles.sheet, { backgroundColor: palette.background }]}>
          <View style={[styles.grabber, { backgroundColor: palette.border }]} />
          <View style={styles.header}>
            <Text style={[styles.heading, { color: palette.foreground }]}>
              {initial ? 'Edit goal' : parent ? 'New next step' : 'New goal'}
            </Text>
            <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close" hitSlop={14}>
              <Text style={[styles.close, { color: palette.muted }]}>×</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
            {parent ? (
              <Text style={[styles.parent, { color: palette.muted }]} numberOfLines={2}>
                Part of: {parent.title}
              </Text>
            ) : null}
            <Text style={[styles.label, { color: palette.muted }]}>WHAT WOULD YOU LIKE TO ACHIEVE?</Text>
            <TextInput
              autoFocus={!initial}
              placeholder="Give your goal a clear name"
              placeholderTextColor={palette.muted}
              value={title}
              onChangeText={setTitle}
              maxLength={180}
              style={[styles.titleInput, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.foreground }]}
              accessibilityLabel="Goal name"
              returnKeyType="next"
            />
            <Text style={[styles.label, { color: palette.muted }]}>TIME HORIZON</Text>
            <View style={styles.chipWrap}>
              {HORIZONS.map((item) => {
                const active = horizon === item;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setHorizon(item)}
                    style={[styles.chip, { backgroundColor: active ? palette.foreground : palette.surface, borderColor: active ? palette.foreground : palette.border }]}
                  >
                    <Text style={[styles.chipText, { color: active ? palette.background : palette.foreground }]}>{HORIZON_TITLES[item]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.hint, { color: palette.muted }]}>
              {initial?.horizon === horizon ? `Keep current period · ${previewKey}` : periodLabel(horizon, anchorDate)}
            </Text>
            <Text style={[styles.label, { color: palette.muted }]}>NOTES (OPTIONAL)</Text>
            <TextInput
              placeholder="A little context helps you move forward..."
              placeholderTextColor={palette.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
              style={[styles.notesInput, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.foreground }]}
              accessibilityLabel="Goal notes"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !inputValid || saving }}
              disabled={!inputValid || saving}
              onPress={submit}
              style={[styles.save, { backgroundColor: palette.accent, opacity: inputValid && !saving ? 1 : 0.45 }]}
            >
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
  sheet: { maxHeight: '91%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 11 },
  grabber: { height: 5, width: 38, alignSelf: 'center', borderRadius: 10, marginBottom: 14 },
  header: { paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 23, fontWeight: '700', letterSpacing: -0.5 },
  close: { fontSize: 29, paddingHorizontal: 6 },
  form: { paddingHorizontal: spacing.lg, paddingBottom: 40, paddingTop: spacing.md, gap: spacing.md },
  label: { fontSize: 11, letterSpacing: 1.1, fontWeight: '700', marginTop: spacing.sm },
  titleInput: { borderWidth: 1, borderRadius: radius.lg, fontSize: 16, padding: spacing.md, minHeight: 56 },
  notesInput: { borderWidth: 1, borderRadius: radius.lg, fontSize: 15, padding: spacing.md, minHeight: 108 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.full },
  chipText: { fontSize: 13, fontWeight: '600' },
  hint: { marginTop: -8, fontSize: 12 },
  parent: { fontSize: 13 },
  save: { minHeight: 54, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

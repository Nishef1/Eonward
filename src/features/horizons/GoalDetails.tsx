import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HORIZON_TITLES } from '../../domain/horizons';
import type { Goal } from '../../domain/goals';
import { colors, radius, spacing } from '../../theme/tokens';

type Palette = typeof colors.light | typeof colors.dark;

interface GoalDetailsProps {
  goal: Goal | null;
  children: Goal[];
  palette: Palette;
  onClose: () => void;
  onEdit: () => void;
  onAddStep: () => void;
  onToggle: (goal: Goal) => void;
  onRemove: () => void;
}

export function GoalDetails({
  goal, children, palette, onClose, onEdit, onAddStep, onToggle, onRemove,
}: GoalDetailsProps) {
  if (!goal) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close details" />
        <View style={[styles.sheet, { backgroundColor: palette.background }]}>
          <View style={[styles.grabber, { backgroundColor: palette.border }]} />
          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: palette.muted }]}>{HORIZON_TITLES[goal.horizon].toUpperCase()} HORIZON</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close details" onPress={onClose}>
              <Text style={[styles.close, { color: palette.muted }]}>×</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: palette.foreground }]}>{goal.title}</Text>
            {goal.notes ? (
              <Text style={[styles.description, { color: palette.muted }]}>{goal.notes}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => onToggle(goal)}
              style={[styles.complete, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <View style={[styles.check, { borderColor: goal.completed ? palette.accent : palette.muted, backgroundColor: goal.completed ? palette.accent : 'transparent' }]}>
                {goal.completed ? <Text style={styles.tick}>✓</Text> : null}
              </View>
              <Text style={[styles.completeText, { color: palette.foreground }]}>
                {goal.completed ? 'Completed · tap to reopen' : 'Mark this goal complete'}
              </Text>
            </Pressable>
            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: palette.foreground }]}>Next steps</Text>
              <Text style={[styles.counter, { color: palette.muted }]}>{children.length}</Text>
            </View>
            {children.length === 0 ? (
              <Text style={[styles.empty, { color: palette.muted }]}>Break a big intention into one small, actionable step.</Text>
            ) : children.map((child) => (
              <Pressable
                key={child.id}
                accessibilityRole="button"
                accessibilityLabel={child.completed ? `Reopen ${child.title}` : `Complete ${child.title}`}
                onPress={() => onToggle(child)}
                style={[styles.child, { backgroundColor: palette.surface, borderColor: palette.border }]}
              >
                <Text style={[styles.childCheck, { color: palette.accent }]}>{child.completed ? '✓' : '○'}</Text>
                <View style={styles.childContent}>
                  <Text style={[styles.childTitle, { color: palette.foreground, textDecorationLine: child.completed ? 'line-through' : 'none' }]}>{child.title}</Text>
                  <Text style={[styles.childHorizon, { color: palette.muted }]}>{HORIZON_TITLES[child.horizon]}</Text>
                </View>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={onAddStep}
              style={[styles.addStep, { borderColor: palette.border }]}
            >
              <Text style={[styles.addStepText, { color: palette.accent }]}>＋  Add next step</Text>
            </Pressable>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={onEdit} style={[styles.actionButton, { backgroundColor: palette.accent }]}>
                <Text style={styles.primaryAction}>Edit goal</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onRemove} style={[styles.actionButton, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}>
                <Text style={[styles.removeText, { color: '#C55F5F' }]}>Delete</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(9, 22, 18, 0.42)' },
  sheet: { maxHeight: '86%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 11 },
  grabber: { height: 5, width: 38, borderRadius: 10, alignSelf: 'center', marginBottom: 14 },
  header: { paddingHorizontal: spacing.lg, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center' },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3 },
  close: { fontSize: 29, paddingHorizontal: 6 },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },
  title: { fontSize: 28, letterSpacing: -0.7, lineHeight: 35, fontWeight: '700' },
  description: { fontSize: 15, lineHeight: 24 },
  complete: { minHeight: 54, borderWidth: 1, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.md, marginTop: spacing.md },
  check: { width: 23, height: 23, borderWidth: 1.5, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tick: { color: '#FFFFFF', fontWeight: '700' },
  completeText: { fontSize: 14, fontWeight: '600' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  counter: { fontSize: 13 },
  empty: { fontSize: 14, lineHeight: 22 },
  child: { minHeight: 64, borderWidth: 1, padding: spacing.md, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  childCheck: { fontSize: 24, width: 24, textAlign: 'center' },
  childContent: { flex: 1, gap: 4 },
  childTitle: { fontSize: 14, fontWeight: '600' },
  childHorizon: { fontSize: 11 },
  addStep: { minHeight: 48, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  addStepText: { fontSize: 14, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionButton: { flex: 1, minHeight: 51, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  primaryAction: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  removeText: { fontSize: 14, fontWeight: '700' },
});

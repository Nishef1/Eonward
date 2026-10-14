import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HORIZON_TITLES } from '../../domain/horizons';
import type { Goal } from '../../domain/goals';
import { colors, radius, spacing } from '../../theme/tokens';

type Palette = typeof colors.light | typeof colors.dark;

interface GoalDetailsProps {
  goal: Goal | null;
  children: Goal[];
  ancestors: Goal[];
  canGoBack: boolean;
  palette: Palette;
  onClose: () => void;
  onBack: () => void;
  onEdit: () => void;
  onAddStep: () => void;
  onOpenChild: (child: Goal) => void;
  onOpenAncestor: (ancestor: Goal) => void;
  onToggle: (goal: Goal) => void;
  onArchive: () => void;
}

export function GoalDetails({
  goal, children, ancestors, canGoBack, palette, onClose, onBack, onEdit, onAddStep, onOpenChild, onOpenAncestor, onToggle, onArchive,
}: GoalDetailsProps) {
  return (
    <Modal visible={goal !== null} animationType="slide" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={canGoBack ? onBack : onClose}>
      <SafeAreaProvider>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close details" />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: palette.background }]}>
          <View style={[styles.grabber, { backgroundColor: palette.border }]} />
          <View style={styles.header}>
            {canGoBack ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Back to parent goal" onPress={onBack} style={styles.headerAction}>
                <Text style={[styles.back, { color: palette.foreground }]}>‹</Text>
              </Pressable>
            ) : null}
            <Text style={[styles.eyebrow, { color: palette.muted }]}>
              {goal ? HORIZON_TITLES[goal.horizon].toUpperCase() : ''} HORIZON
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close details" style={styles.headerAction} onPress={onClose}>
              <Text style={[styles.close, { color: palette.muted }]}>×</Text>
            </Pressable>
          </View>
          {goal ? (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {ancestors.length > 0 ? (
                <View style={[styles.pathPanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <Text style={[styles.pathLabel, { color: palette.muted }]}>PART OF YOUR BIGGER PICTURE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pathTrail}>
                    {ancestors.map((ancestor, index) => (
                      <View key={ancestor.id} style={styles.pathItem}>
                        {index > 0 ? <Text style={[styles.pathArrow, { color: palette.muted }]}>›</Text> : null}
                        <Pressable
                          onPress={() => onOpenAncestor(ancestor)}
                          accessibilityRole="button"
                          accessibilityLabel={`Open parent goal ${ancestor.title}`}
                          style={[styles.pathChip, { backgroundColor: palette.background, borderColor: palette.border }]}
                        >
                          <Text style={[styles.pathHorizon, { color: palette.muted }]}>
                            {HORIZON_TITLES[ancestor.horizon]}
                          </Text>
                          <Text style={[styles.pathTitle, { color: palette.foreground }]} numberOfLines={1}>
                            {ancestor.title}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
              <Text style={[styles.title, { color: palette.foreground }]}>{goal.title}</Text>
              <Text style={[styles.period, { color: palette.muted }]}>{goal.periodKey === 'life' ? 'Life horizon' : goal.periodKey}</Text>
              {goal.notes ? (
                <Text style={[styles.description, { color: palette.muted }]}>{goal.notes}</Text>
              ) : null}
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: goal.completed }}
                onPress={() => onToggle(goal)}
                style={[styles.complete, { backgroundColor: palette.surface, borderColor: palette.border }]}>
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
                <View key={child.id} style={[styles.child, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: child.completed }}
                    accessibilityLabel={child.completed ? `Reopen ${child.title}` : `Complete ${child.title}`}
                    onPress={() => onToggle(child)} style={styles.childCheckTouch}>
                    <Text style={[styles.childCheck, { color: palette.accent }]}>{child.completed ? '✓' : '○'}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Open ${child.title}`}
                    onPress={() => onOpenChild(child)} style={styles.childContent}>
                    <Text style={[styles.childTitle, { color: palette.foreground, textDecorationLine: child.completed ? 'line-through' : 'none' }]} numberOfLines={2}>{child.title}</Text>
                    <Text style={[styles.childHorizon, { color: palette.muted }]}>{HORIZON_TITLES[child.horizon]} · {child.periodKey}</Text>
                  </Pressable>
                  <Pressable style={styles.childNavigate} onPress={() => onOpenChild(child)}
                    accessibilityRole="button" accessibilityLabel={`View details for ${child.title}`}>
                    <Text style={[styles.navigateIcon, { color: palette.muted }]}>›</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable accessibilityRole="button" onPress={onAddStep} style={[styles.addStep, { borderColor: palette.border }]}>
                <Text style={[styles.addStepText, { color: palette.accent }]}>＋  Add next step</Text>
              </Pressable>
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" onPress={onEdit} style={[styles.actionButton, { backgroundColor: palette.accent }]}>
                  <Text style={styles.primaryAction}>Edit goal</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={onArchive} style={[styles.actionButton, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}>
                  <Text style={styles.removeText}>Archive</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(9, 22, 18, 0.42)' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 11 },
  grabber: { height: 4, width: 38, borderRadius: 10, alignSelf: 'center', marginBottom: 12 },
  header: { paddingHorizontal: spacing.md, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center' },
  eyebrow: { flex: 1, textAlign: 'left', fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginLeft: 8 },
  headerAction: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' },
  close: { fontSize: 29 },
  back: { fontSize: 33 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 38, paddingTop: spacing.sm, gap: spacing.md },
  pathPanel: { borderRadius: radius.lg, borderWidth: 1, padding: 12, gap: 10, marginBottom: 4 },
  pathLabel: { fontSize: 10, letterSpacing: 1.2, fontWeight: '700' },
  pathTrail: { alignItems: 'center', gap: 8, paddingRight: 3 },
  pathItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pathArrow: { fontSize: 19 },
  pathChip: { minHeight: 51, maxWidth: 184, minWidth: 102, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: radius.md, gap: 4, justifyContent: 'center' },
  pathHorizon: { fontSize: 10, fontWeight: '700' },
  pathTitle: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 27, letterSpacing: -0.7, lineHeight: 34, fontWeight: '700' },
  period: { fontSize: 12, fontWeight: '600', marginTop: -8 },
  description: { fontSize: 15, lineHeight: 24 },
  complete: { minHeight: 56, borderWidth: 1, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.md, marginTop: spacing.sm },
  check: { width: 23, height: 23, borderWidth: 1.5, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tick: { color: '#FFFFFF', fontWeight: '700' },
  completeText: { fontSize: 14, fontWeight: '600', flex: 1 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  counter: { fontSize: 13 },
  empty: { fontSize: 14, lineHeight: 22 },
  child: { minHeight: 70, borderWidth: 1, padding: spacing.sm, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  childCheckTouch: { minHeight: 48, minWidth: 40, alignItems: 'center', justifyContent: 'center' },
  childCheck: { fontSize: 24 },
  childContent: { flex: 1, gap: 5, paddingVertical: 10 },
  childTitle: { fontSize: 14, fontWeight: '600' },
  childHorizon: { fontSize: 11 },
  childNavigate: { width: 36, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  navigateIcon: { fontSize: 27 },
  addStep: { minHeight: 50, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  addStepText: { fontSize: 14, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionButton: { flex: 1, minHeight: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  primaryAction: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  removeText: { color: '#B34F4F', fontSize: 14, fontWeight: '700' },
});

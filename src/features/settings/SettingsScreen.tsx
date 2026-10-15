import { useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEonwardDatabase } from '../../storage/use-database';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';
import { MAX_BACKUP_BYTES, parseBackup } from '../../domain/backup';
import { exportBackup, restoreBackup } from '../../storage/backup';
import { checkLocalHealth, type LocalHealth } from '../../storage/health';
import { colors } from '../../theme/tokens';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';

export function SettingsScreen() {
  const db = useEonwardDatabase(), router = useRouter();
  const palette = useColorScheme() === 'dark' ? colors.dark : colors.light;
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState<string | null>(null);
  const [health, setHealth] = useState<LocalHealth | null>(null);
  const locked = useRef(false);
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setNotice(null);
    try { await action(); }
    catch (error) { Alert.alert('Could not finish', error instanceof Error ? error.message : 'Please try again.'); }
    finally { locked.current = false; setBusy(false); }
  }
  async function exportData() {
    if (!await Sharing.isAvailableAsync()) {
      throw new Error('Native sharing is unavailable. Export is not possible on this device.');
    }
    const backup = await exportBackup(db);
    // Do not silently accumulate plaintext backups in the permanent Documents directory.
    const file = new File(Paths.cache, `eonward-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    file.write(JSON.stringify(backup, null, 2));
    try {
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json',
        dialogTitle: 'Save your Eonward backup' });
      setNotice('Share sheet closed. Confirm that you saved a copy in your chosen destination. A temporary copy may remain in the app cache.');
    } catch (error) {
      // Keep the temporary file for native sharing diagnostics; cache is not a durable backup.
      throw error;
    }
  }
  async function inspectHealth() {
    const result = await checkLocalHealth(db);
    setHealth(result);
    setNotice(result.structureOkay && result.foreignKeysOkay
      ? 'Local SQLite structure and relationships passed the read-only checks. This does not guarantee future app stability; keep an external backup.'
      : 'Possible local database inconsistency detected. Do not clear app storage; export a backup and contact support with the issue counts below.');
  }
  async function pickBackup() {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', 'application/octet-stream'], copyToCacheDirectory: true });
    if (picked.canceled) return;
    const file = new File(picked.assets[0].uri);
    try {
      if ((file.size ?? 0) > MAX_BACKUP_BYTES) throw new Error('Choose an Eonward backup smaller than 10 MB.');
      const text = await file.text();
      const preview = parseBackup(text);
      Alert.alert('Restore missing data?', `${preview.tables.goals.length} goals, ${preview.tables.boards.length} boards and ${preview.tables.time_blocks.length} time blocks.\n\nExisting items keep their current values. No items are deleted. Active timers are not imported.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: () => { void run(async () => {
          const count = await restoreBackup(db, text);
          setNotice(`${count} missing record${count === 1 ? '' : 's'} restored. Your existing data was preserved.`);
        }); } },
      ]);
    } finally { if (file.exists) file.delete(); }
  }
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: palette.background }}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to Plan" onPress={() => router.back()} style={styles.back}><ChevronLeft size={23} color={palette.foreground} strokeWidth={1.8} /></Pressable><Text style={[styles.title, { color: palette.foreground }]}>Your data & settings</Text></View>
      <Text style={[styles.copy, { color: palette.muted }]}>Your plans live on this device. Keep an exported copy so you can recover them on another device.</Text>
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.heading, { color: palette.foreground }]}>Backup & restore</Text>
        <Text style={[styles.copy, { color: palette.muted }]}>Includes goals, notes, deadlines, repeats, boards, schedules, archive and recorded progress. Active focus timers are not copied.</Text>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void run(exportData); }} style={[styles.primary, { backgroundColor: palette.accent, opacity: busy ? .5 : 1 }]}><Text style={{ color: palette.onAccent, fontWeight: '700' }}>{busy ? 'Working…' : 'Export backup'}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void run(pickBackup); }} style={[styles.secondary, { borderColor: palette.border }]}><Text style={{ color: palette.foreground, fontWeight: '700' }}>Restore from a file</Text></Pressable>
        <Text style={[styles.caption, { color: palette.muted }]}>Exports are readable JSON. A temporary copy is placed in app cache for sharing, not permanent Documents. Confirm your chosen destination actually saved the file.</Text>
      </View>
      {notice ? <Text accessibilityRole="alert" style={[styles.copy, { color: palette.accent }]}>{notice}</Text> : null}
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.heading, { color: palette.foreground }]}>Local data check</Text>
        <Text style={[styles.copy, { color: palette.muted }]}>
          Check the local database structure and linked records without changing or uploading anything. This is not a native crash test or a backup.
        </Text>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void run(inspectHealth); }}
          style={[styles.secondary, { borderColor: palette.border, opacity: busy ? 0.5 : 1 }]}>
          <Text style={{ color: palette.foreground, fontWeight: '700' }}>{busy ? 'Checking…' : 'Check local data'}</Text>
        </Pressable>
        {health ? <Text accessibilityRole="summary" style={[styles.caption, { color: palette.muted }]}>
          Structure: {health.structureOkay ? 'no issues found' : `${health.structuralProblems} issue(s)`} ·
          Relationships: {health.foreignKeysOkay ? 'no issues found' : `${health.orphanRelations} issue(s)`}
        </Text> : null}
      </View>
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.heading, { color: palette.foreground }]}>Focus alerts</Text>
        <Text style={[styles.copy, { color: palette.muted }]}>Notification access is controlled by {Platform.OS === 'ios' ? 'iOS' : 'Android'}. Focus remains usable when alerts are off.{Platform.OS === 'android' ? ' Battery restrictions can delay alerts. Force stop in system settings silences alerts until you reopen Eonward.' : ''}</Text>
        <Pressable accessibilityRole="button" onPress={() => { void Linking.openSettings().catch(() => Alert.alert('Open system settings', 'Choose Eonward → Notifications in your device settings.')); }} style={[styles.secondary, { borderColor: palette.border }]}><Text style={{ color: palette.foreground }}>Open app settings</Text></Pressable>
      </View>
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.heading, { color: palette.foreground }]}>Private by design</Text>
        <Text style={[styles.copy, { color: palette.muted }]}>Eonward works without an account. Your goals and focus history are stored locally. This app has no advertising, analytics or cloud sync. Nothing is uploaded by Eonward.</Text>
        <Text style={[styles.copy, { color: palette.muted }]}>Your operating system may include app data in device backups, depending on its settings. Exported files are readable JSON; keep them somewhere you trust. Removing the app or clearing its storage removes local plans, so export first if you want to keep them.</Text>
        <Text style={[styles.caption, { color: palette.muted }]}>Eonward · {Constants.expoConfig?.version ?? '0.1.0'} · Personal planning, on your terms.</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 32, gap: 18 }, header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' }, title: { fontSize: 23, fontWeight: '700', flex: 1 },
  heading: { fontSize: 18, fontWeight: '700' }, copy: { fontSize: 14, lineHeight: 22 }, caption: { fontSize: 12, lineHeight: 19 },
  card: { padding: 18, borderRadius: 18, borderWidth: 1, gap: 14 }, primary: { minHeight: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  secondary: { minHeight: 50, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
});

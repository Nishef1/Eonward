import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getFocusSession } from '../../storage/focus';

const CHANNEL = 'eonward-focus';
const MARKER = 'eonward-focus-expiry';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function prepareChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Focus completion',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}
function permitted(permissions: Notifications.NotificationPermissionsStatus): boolean {
  return permissions.granted ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** Only prompt after Start is tapped. A denial never prevents the timer from running. */
export async function askForFocusNotificationPermission(): Promise<void> {
  await prepareChannel();
  const current = await Notifications.getPermissionsAsync();
  if (!permitted(current) && current.canAskAgain &&
      current.status === Notifications.PermissionStatus.UNDETERMINED) {
    await Notifications.requestPermissionsAsync();
  }
}

let queue: Promise<void> = Promise.resolve();

/**
 * Reconcile from the actual SQLite state, never a stale React snapshot.
 * The OS owns delivery while the app is closed. A persisted running session
 * survives a restart; we keep its existing scheduled reminder if possible.
 */
export function reconcileFocusNotification(db: SQLiteDatabase): Promise<string | null> {
  const work = queue.catch(() => {}).then(async () => {
    await prepareChannel();
    const pending = (await Notifications.getAllScheduledNotificationsAsync()).filter(
      (item) => item.content.data?.eonwardMarker === MARKER,
    );
    const session = await getFocusSession(db);
    const needsReminder = session?.status === 'running' && session.deadlineMs > Date.now();
    const expectedBlock = needsReminder ? session.blockId : null;
    const expectedDeadline = needsReminder ? String(session.deadlineMs) : null;
    const matching = pending.find((item) =>
      item.content.data?.focusBlockId === expectedBlock &&
      item.content.data?.deadlineMs === expectedDeadline,
    );
    for (const item of pending) {
      if (item.identifier !== matching?.identifier || !needsReminder) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
    if (!needsReminder || matching) return null;

    const permissions = await Notifications.getPermissionsAsync();
    if (!permitted(permissions)) {
      return 'Background Focus alerts are off. Enable notifications in system settings.';
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Focus time is up',
        body: 'Your timebox has ended. Return to Eonward to review your session.',
        sound: 'default',
        data: {
          eonwardMarker: MARKER,
          focusBlockId: session.blockId,
          deadlineMs: String(session.deadlineMs),
        },
      },
      trigger: Platform.OS === 'android'
        ? { type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(session.deadlineMs), channelId: CHANNEL }
        : { type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(session.deadlineMs) },
    });
    return null;
  });
  queue = work.then(() => undefined, () => undefined);
  return work;
}

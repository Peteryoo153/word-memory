import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { StudyPlan } from './types';

const DAY_KEY_TO_WEEKDAY: Record<string, number> = {
  sun: 1, mon: 2, tue: 3, wed: 4, thu: 5, fri: 6, sat: 7,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('study-reminder', {
    name: '학습 알림',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

export async function cancelStudyReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** 플랜의 요일/시간에 맞춰 매주 반복 알림을 등록한다 */
export async function scheduleStudyReminders(plan: StudyPlan): Promise<boolean> {
  await cancelStudyReminders();
  if (!plan.alarmEnabled || plan.days.length === 0) return false;

  const granted = await ensurePermission();
  if (!granted) return false;

  await ensureAndroidChannel();

  const [hour, minute] = plan.alarmTime.split(':').map(Number);

  for (const dayKey of plan.days) {
    const weekday = DAY_KEY_TO_WEEKDAY[dayKey];
    if (!weekday) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '오늘의 단어 학습 시간이에요',
        body: `하루 ${plan.dailyGoal}단어, 지금 시작해볼까요?`,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
        channelId: 'study-reminder',
      },
    });
  }
  return true;
}

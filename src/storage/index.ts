import AsyncStorage from '@react-native-async-storage/async-storage';
import { WordProgress, AppSettings } from '../types';

const KEYS = {
  PROGRESS: 'word_progress',
  SETTINGS: 'app_settings',
};

// 설정 불러오기
export async function getSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  if (!raw) return { dailyGoal: 10 };
  return JSON.parse(raw);
}

// 설정 저장
export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

// 학습 진도 전체 불러오기 (wordId → WordProgress 맵)
export async function getAllProgress(): Promise<Record<string, WordProgress>> {
  const raw = await AsyncStorage.getItem(KEYS.PROGRESS);
  if (!raw) return {};
  return JSON.parse(raw);
}

// 단어 하나의 진도 저장
export async function saveWordProgress(progress: WordProgress): Promise<void> {
  const all = await getAllProgress();
  all[progress.wordId] = progress;
  await AsyncStorage.setItem(KEYS.PROGRESS, JSON.stringify(all));
}

// 오늘 학습한 단어 수 반환
export async function getTodayLearnedCount(): Promise<number> {
  const all = await getAllProgress();
  const today = new Date().toISOString().split('T')[0];
  return Object.values(all).filter((p) => p.lastStudiedAt === today).length;
}

// 오늘 복습해야 할 단어 ID 목록 반환
export async function getTodayReviewWordIds(): Promise<string[]> {
  const all = await getAllProgress();
  const today = new Date().toISOString().split('T')[0];
  return Object.values(all)
    .filter((p) => p.nextReviewDate <= today && p.learned)
    .map((p) => p.wordId);
}

// 에빙하우스 복습 간격: 1 → 3 → 7 → 14 → 30일
const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

// 정답/오답에 따라 다음 복습 날짜 계산
export function calcNextReview(current: WordProgress, correct: boolean): WordProgress {
  const today = new Date();
  let nextInterval: number;

  if (correct) {
    const idx = REVIEW_INTERVALS.indexOf(current.reviewInterval);
    nextInterval = REVIEW_INTERVALS[Math.min(idx + 1, REVIEW_INTERVALS.length - 1)];
  } else {
    nextInterval = 1; // 틀리면 처음부터
  }

  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + nextInterval);

  return {
    ...current,
    correctCount: correct ? current.correctCount + 1 : current.correctCount,
    wrongCount: correct ? current.wrongCount : current.wrongCount + 1,
    reviewInterval: nextInterval,
    nextReviewDate: nextDate.toISOString().split('T')[0],
    lastStudiedAt: today.toISOString().split('T')[0],
  };
}

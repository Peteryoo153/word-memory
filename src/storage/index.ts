import AsyncStorage from '@react-native-async-storage/async-storage';
import { WordProgress, AppSettings, StudyPlan } from '../types';

export type { StudyPlan };

const KEYS = {
  PROGRESS: 'word_progress',
  SETTINGS: 'app_settings',
  PLAN:     'study_plan',
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

// 학습 플랜
export async function getStudyPlan(): Promise<StudyPlan | null> {
  const raw = await AsyncStorage.getItem(KEYS.PLAN);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function saveStudyPlan(plan: StudyPlan): Promise<void> {
  await AsyncStorage.setItem(KEYS.PLAN, JSON.stringify(plan));
}

export async function deleteStudyPlan(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.PLAN);
}

/** 날짜별 테스트 점수(맞춘 개수) 저장 */
export async function saveStudyPlanScore(date: string, correctCount: number): Promise<void> {
  const plan = await getStudyPlan();
  if (!plan) return;
  const updated: StudyPlan = {
    ...plan,
    dailyScores: { ...(plan.dailyScores ?? {}), [date]: correctCount },
  };
  await saveStudyPlan(updated);
}

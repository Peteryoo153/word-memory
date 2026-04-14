import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wordbook, WordbookProgress, EbbinghausEntry } from '../types/wordbook';

// ── AsyncStorage 키 규칙 ────────────────────────────
const KEYS = {
  LIST:        'wordbooks:list',                                    // 보유 단어장 ID 배열
  BOOK:        (id: string) => `wordbook:${id}`,                   // 단어장 데이터
  PROGRESS:    (wbId: string) => `progress:${wbId}:local`,         // 진행 데이터 (userId = 'local')
  ACTIVE_ID:   'app:activeWordbookId',                             // 현재 활성 단어장 ID
};

// ── 단어장 목록 ─────────────────────────────────────

export async function getWordbookIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.LIST);
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function getAllWordbooks(): Promise<Wordbook[]> {
  const ids = await getWordbookIds();
  const books = await Promise.all(ids.map(getWordbook));
  return books.filter((b): b is Wordbook => b !== null);
}

export async function getWordbook(id: string): Promise<Wordbook | null> {
  const raw = await AsyncStorage.getItem(KEYS.BOOK(id));
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function addWordbook(wordbook: Wordbook): Promise<void> {
  const ids = await getWordbookIds();
  if (!ids.includes(wordbook.id)) {
    ids.push(wordbook.id);
    await AsyncStorage.setItem(KEYS.LIST, JSON.stringify(ids));
  }
  await AsyncStorage.setItem(KEYS.BOOK(wordbook.id), JSON.stringify(wordbook));
}

export async function updateWordbook(wordbook: Wordbook): Promise<void> {
  await AsyncStorage.setItem(KEYS.BOOK(wordbook.id), JSON.stringify(wordbook));
}

/** builtin 단어장은 삭제 불가 */
export async function deleteWordbook(id: string): Promise<{ ok: boolean; reason?: string }> {
  const book = await getWordbook(id);
  if (!book) return { ok: false, reason: '단어장을 찾을 수 없어요.' };
  if (book.source === 'builtin') return { ok: false, reason: '내장 단어장은 삭제할 수 없어요.' };

  const ids = await getWordbookIds();
  const next = ids.filter((i) => i !== id);
  await AsyncStorage.setItem(KEYS.LIST, JSON.stringify(next));
  await AsyncStorage.removeItem(KEYS.BOOK(id));
  await AsyncStorage.removeItem(KEYS.PROGRESS(id));

  // 삭제한 게 활성이었으면 첫 번째 남은 단어장으로 전환
  const activeId = await getActiveWordbookId();
  if (activeId === id && next.length > 0) {
    await AsyncStorage.setItem(KEYS.ACTIVE_ID, next[0]);
  }

  return { ok: true };
}

// ── 활성 단어장 ─────────────────────────────────────

export async function getActiveWordbookId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.ACTIVE_ID);
}

export async function getActiveWordbook(): Promise<Wordbook | null> {
  const id = await getActiveWordbookId();
  if (!id) return null;
  return getWordbook(id);
}

/**
 * 활성 단어장 전환
 * - 기존 진행상황은 그대로 보존 (별도 저장키 덕분에 자동)
 * - newId 단어장이 존재해야 함
 */
export async function switchActiveWordbook(newId: string): Promise<{ ok: boolean; reason?: string }> {
  const book = await getWordbook(newId);
  if (!book) return { ok: false, reason: '단어장을 찾을 수 없어요.' };
  await AsyncStorage.setItem(KEYS.ACTIVE_ID, newId);
  return { ok: true };
}

// ── 진행 데이터 ─────────────────────────────────────

export function makeEmptyProgress(wordbookId: string): WordbookProgress {
  return {
    wordbookId,
    userId: 'local',
    learnedWordIds: [],
    wrongWordIds: [],
    currentIndex: 0,
    lastStudiedAt: '',
    totalStudyDays: 0,
    ebbinghausData: {},
  };
}

export async function getProgress(wordbookId: string): Promise<WordbookProgress> {
  const raw = await AsyncStorage.getItem(KEYS.PROGRESS(wordbookId));
  if (!raw) return makeEmptyProgress(wordbookId);
  return JSON.parse(raw);
}

export async function saveProgress(progress: WordbookProgress): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROGRESS(progress.wordbookId), JSON.stringify(progress));
}

// ── 에빙하우스 로직 ─────────────────────────────────

const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

export function calcEbbinghaus(
  current: EbbinghausEntry,
  correct: boolean,
): EbbinghausEntry {
  const today = new Date();
  let nextInterval: number;

  if (correct) {
    const idx = REVIEW_INTERVALS.indexOf(current.reviewInterval);
    nextInterval = REVIEW_INTERVALS[Math.min(idx + 1, REVIEW_INTERVALS.length - 1)];
  } else {
    nextInterval = 1;
  }

  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + nextInterval);

  return {
    learned: true,
    correctCount: correct ? current.correctCount + 1 : current.correctCount,
    wrongCount:   correct ? current.wrongCount     : current.wrongCount + 1,
    reviewInterval:  nextInterval,
    nextReviewDate:  nextDate.toISOString().split('T')[0],
    lastStudiedAt:   today.toISOString().split('T')[0],
  };
}

/** 단어 학습 결과 저장 (에빙하우스 + learnedWordIds 동기화) */
export async function markWordResult(
  wordbookId: string,
  wordId: string,
  correct: boolean,
): Promise<void> {
  const progress = await getProgress(wordbookId);

  const existing: EbbinghausEntry = progress.ebbinghausData[wordId] ?? {
    learned: false,
    correctCount: 0,
    wrongCount: 0,
    nextReviewDate: '',
    reviewInterval: 1,
    lastStudiedAt: '',
  };

  progress.ebbinghausData[wordId] = calcEbbinghaus(existing, correct);
  progress.lastStudiedAt = new Date().toISOString().split('T')[0];

  if (!progress.learnedWordIds.includes(wordId)) {
    progress.learnedWordIds.push(wordId);
  }

  await saveProgress(progress);
}

/** 복습 대상 wordId 목록 */
export function getDueWordIds(progress: WordbookProgress): string[] {
  const today = new Date().toISOString().split('T')[0];
  return Object.entries(progress.ebbinghausData)
    .filter(([, e]) => e.learned && e.nextReviewDate <= today)
    .map(([id]) => id);
}

/** 오늘 학습한 단어 수 */
export function getTodayLearnedCount(progress: WordbookProgress): number {
  const today = new Date().toISOString().split('T')[0];
  return Object.values(progress.ebbinghausData)
    .filter((e) => e.lastStudiedAt === today)
    .length;
}

// ── 초기 시드 ────────────────────────────────────────

/**
 * 앱 최초 실행 시 내장 단어장 자동 등록.
 * 이미 등록돼 있으면 아무것도 하지 않음.
 */
export async function seedBuiltinWordbook(wordbook: Wordbook): Promise<void> {
  const existing = await getWordbook(wordbook.id);
  if (existing) return; // 이미 있으면 스킵

  await addWordbook(wordbook);

  const activeId = await getActiveWordbookId();
  if (!activeId) {
    await AsyncStorage.setItem(KEYS.ACTIVE_ID, wordbook.id);
  }
}

import { Wordbook, WordbookProgress } from './types/wordbook';

export interface WrongWord {
  wordbookId: string;
  wordbookName: string;
  wordId: string;
  word: string;
  meaning: string;
  wrongCount: number;
  correctCount: number;
}

export interface DailyCount {
  date: string;     // YYYY-MM-DD
  dayLabel: string; // 월/화/...
  count: number;    // 그날 학습한 단어 수
}

export interface OverallStats {
  totalLearnedWords: number;
  totalCorrect: number;
  totalWrong: number;
  accuracy: number;       // 0~1
  currentStreak: number;  // 연속 학습일
  longestStreak: number;
  studyDays: number;      // 누적 학습일
  dueCount: number;       // 복습 대기
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function dateOffsetStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

/** 모든 단어장의 진행 데이터를 모아 통계 산출 */
export function computeOverallStats(progresses: WordbookProgress[]): OverallStats {
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalLearned = 0;
  const studyDateSet = new Set<string>();
  let dueCount = 0;
  const today = todayStr();

  for (const p of progresses) {
    totalLearned += p.learnedWordIds.length;
    for (const e of Object.values(p.ebbinghausData)) {
      totalCorrect += e.correctCount;
      totalWrong += e.wrongCount;
      if (e.lastStudiedAt) studyDateSet.add(e.lastStudiedAt);
      if (e.learned && e.nextReviewDate && e.nextReviewDate <= today) dueCount += 1;
    }
  }

  const total = totalCorrect + totalWrong;
  const accuracy = total > 0 ? totalCorrect / total : 0;

  const sortedDates = [...studyDateSet].sort();
  const { current, longest } = computeStreak(sortedDates);

  return {
    totalLearnedWords: totalLearned,
    totalCorrect,
    totalWrong,
    accuracy,
    currentStreak: current,
    longestStreak: longest,
    studyDays: studyDateSet.size,
    dueCount,
  };
}

function computeStreak(sortedDates: string[]): { current: number; longest: number } {
  if (sortedDates.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sortedDates.length; i += 1) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      run += 1;
      if (run > longest) longest = run;
    } else if (diffDays > 1) {
      run = 1;
    }
  }

  // 현재 streak: 마지막 날짜가 오늘 또는 어제일 때만 계산
  const last = sortedDates[sortedDates.length - 1];
  const lastDate = new Date(last);
  const today = new Date(todayStr());
  const diffFromToday = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  let current = 0;
  if (diffFromToday <= 1) {
    // 마지막 날부터 거꾸로 연속된 길이
    current = 1;
    for (let i = sortedDates.length - 2; i >= 0; i -= 1) {
      const a = new Date(sortedDates[i]);
      const b = new Date(sortedDates[i + 1]);
      const d = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
      if (d === 1) current += 1;
      else break;
    }
  }
  return { current, longest };
}

/** 최근 N일간 일별 학습 단어 수 */
export function computeRecentDaily(progresses: WordbookProgress[], days: number): DailyCount[] {
  const counts: Record<string, number> = {};
  for (const p of progresses) {
    for (const e of Object.values(p.ebbinghausData)) {
      if (!e.lastStudiedAt) continue;
      counts[e.lastStudiedAt] = (counts[e.lastStudiedAt] ?? 0) + 1;
    }
  }
  const result: DailyCount[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = dateOffsetStr(i);
    const dayLabel = DAY_LABELS[new Date(date).getDay()];
    result.push({ date, dayLabel, count: counts[date] ?? 0 });
  }
  return result;
}

/** 자주 틀리는 단어 상위 N개 */
export function computeWrongWords(
  books: Wordbook[],
  progresses: WordbookProgress[],
  limit: number,
): WrongWord[] {
  const bookMap = new Map(books.map((b) => [b.id, b]));
  const all: WrongWord[] = [];

  for (const p of progresses) {
    const book = bookMap.get(p.wordbookId);
    if (!book) continue;
    const wordMap = new Map(book.words.map((w) => [w.id, w]));

    for (const [wordId, e] of Object.entries(p.ebbinghausData)) {
      if (e.wrongCount === 0) continue;
      const w = wordMap.get(wordId);
      if (!w) continue;
      all.push({
        wordbookId: book.id,
        wordbookName: book.name,
        wordId,
        word: w.word,
        meaning: w.meanings.join(' / '),
        wrongCount: e.wrongCount,
        correctCount: e.correctCount,
      });
    }
  }

  return all
    .sort((a, b) => {
      if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount;
      return a.correctCount - b.correctCount;
    })
    .slice(0, limit);
}

/** 단어장별 진도 요약 */
export interface WordbookSummary {
  id: string;
  name: string;
  totalWords: number;
  learnedWords: number;
  ratio: number;
  accuracy: number;
}

export function computeWordbookSummaries(
  books: Wordbook[],
  progresses: WordbookProgress[],
): WordbookSummary[] {
  const progMap = new Map(progresses.map((p) => [p.wordbookId, p]));
  return books.map((b) => {
    const p = progMap.get(b.id);
    let correct = 0;
    let wrong = 0;
    if (p) {
      for (const e of Object.values(p.ebbinghausData)) {
        correct += e.correctCount;
        wrong += e.wrongCount;
      }
    }
    const learned = p?.learnedWordIds.length ?? 0;
    const total = correct + wrong;
    return {
      id: b.id,
      name: b.name,
      totalWords: b.totalWords,
      learnedWords: learned,
      ratio: b.totalWords > 0 ? learned / b.totalWords : 0,
      accuracy: total > 0 ? correct / total : 0,
    };
  });
}

import { Word } from './index';

// 단어장 내 단어 (기존 Word보다 풍부한 구조)
export interface WordbookWord {
  id: string;
  word: string;
  pronunciation?: string;
  partOfSpeech?: string;
  meanings: string[];                         // 복수 뜻 지원
  examples?: { en: string; ko: string }[];    // 영/한 예문 쌍
  synonyms?: string[];
  antonyms?: string[];
}

// 단어장
export interface Wordbook {
  id: string;
  name: string;
  description?: string;
  source: 'builtin' | 'custom' | 'shared';
  totalWords: number;
  createdAt: string;
  words: WordbookWord[];
}

// 에빙하우스 단어별 진도
export interface EbbinghausEntry {
  learned: boolean;
  correctCount: number;
  wrongCount: number;
  nextReviewDate: string;
  reviewInterval: number;   // 1, 3, 7, 14, 30 일
  lastStudiedAt: string;
}

// 단어장별 학습 진도
export interface WordbookProgress {
  wordbookId: string;
  userId: string;
  learnedWordIds: string[];
  wrongWordIds: string[];
  currentIndex: number;       // 마지막으로 보던 위치
  lastStudiedAt: string;
  totalStudyDays: number;
  ebbinghausData: Record<string, EbbinghausEntry>;  // wordId → 진도
  completedCount: number;     // 단어장 전체 완료 횟수
  isCompleted: boolean;       // 현재 회차 완료 여부
  lastCompletedAt?: string;   // 마지막 완료 날짜 (ISO 날짜 문자열)
}

// WordbookWord → 기존 Word 변환 (WordCard 등 기존 컴포넌트용)
export function toWord(w: WordbookWord): Word {
  return {
    id: w.id,
    word: w.word,
    meaning: w.meanings.join(' / '),
    partOfSpeech: w.partOfSpeech ?? 'noun',
    example: w.examples?.[0]?.en ?? '',
    synonyms: w.synonyms ?? [],
    antonyms: w.antonyms ?? [],
  };
}

// 기존 Word → WordbookWord 변환 (내장 단어장 래핑용)
export function fromWord(w: Word): WordbookWord {
  return {
    id: w.id,
    word: w.word,
    partOfSpeech: w.partOfSpeech,
    meanings: [w.meaning],
    examples: w.example ? [{ en: w.example, ko: '' }] : [],
    synonyms: w.synonyms,
    antonyms: w.antonyms,
  };
}

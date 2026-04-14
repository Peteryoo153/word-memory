// 단어 한 개의 구조
export interface Word {
  id: string;
  word: string;           // 영단어
  meaning: string;        // 한국어 뜻
  partOfSpeech: string;   // 품사 (noun, verb, adj, adv)
  example: string;        // 예문
  synonyms: string[];     // 동의어
  antonyms: string[];     // 반의어
}

// 학습 진도 (단어별)
export interface WordProgress {
  wordId: string;
  learned: boolean;           // 오늘 학습했는가
  correctCount: number;       // 맞힌 횟수
  wrongCount: number;         // 틀린 횟수
  nextReviewDate: string;     // 다음 복습 날짜 (ISO 날짜 문자열)
  reviewInterval: number;     // 복습 간격 (일수): 1, 3, 7, 14, 30
  lastStudiedAt: string;      // 마지막 학습 날짜
}

// 앱 전체 설정
export interface AppSettings {
  dailyGoal: number;  // 하루 목표 단어 수 (기본 10)
}

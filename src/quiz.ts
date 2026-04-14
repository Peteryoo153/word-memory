import { Word } from './types';
import { WORDS } from '../data/words';

export interface QuizQuestion {
  word: Word;           // 문제 단어
  choices: string[];   // 보기 4개 (한국어 뜻)
  answerIndex: number; // 정답 인덱스 (0~3)
}

// 배열을 무작위로 섞는 함수
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 단어 목록에서 퀴즈 문항 생성
// - words: 문제로 낼 단어들
// - count: 문항 수 (기본 5)
// - distractorPool: 오답 보기 추출 대상 (미지정 시 기본 WORDS)
export function buildQuiz(words: Word[], count: number = 5, distractorPool?: Word[]): QuizQuestion[] {
  const pool = shuffle(words).slice(0, count);
  const wrongSource = distractorPool ?? WORDS;

  return pool.map((word) => {
    const wrongPool = wrongSource.filter((w) => w.id !== word.id);
    const wrongs = shuffle(wrongPool)
      .slice(0, 3)
      .map((w) => w.meaning);

    const allChoices = shuffle([word.meaning, ...wrongs]);
    const answerIndex = allChoices.indexOf(word.meaning);

    return { word, choices: allChoices, answerIndex };
  });
}

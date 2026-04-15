import { Wordbook, WordbookWord } from '../types/wordbook';

// ── JSON 원본 타입 ────────────────────────────────────
interface RawWord {
  id: string;
  word: string;
  partOfSpeech?: string;
  meanings: string[];
  synonyms?: string[];
}

interface RawWordbook {
  id: string;
  name: string;
  description?: string;
  totalWords: number;
  words: RawWord[];
}

// ── 변환 헬퍼 ────────────────────────────────────────
function toWordbookWord(w: RawWord): WordbookWord {
  return {
    id: w.id,
    word: w.word,
    partOfSpeech: w.partOfSpeech,
    meanings: w.meanings,
    examples: [],
    synonyms: w.synonyms ?? [],
  };
}

function rawToWordbook(raw: RawWordbook, createdAt = '2026-04-15'): Wordbook {
  return {
    id: `builtin_${raw.id}`,
    name: raw.name,
    description: raw.description ?? '',
    source: 'builtin',
    totalWords: raw.words.length,
    createdAt,
    words: raw.words.map(toWordbookWord),
  };
}

// ── TOEFL Junior LC (7개) ─────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jrRaws: RawWordbook[] = [
  require('../../data/toefl/wordbooks/toefl-jr-01_main_idea.json'),
  require('../../data/toefl/wordbooks/toefl-jr-02_detail.json'),
  require('../../data/toefl/wordbooks/toefl-jr-03_inference.json'),
  require('../../data/toefl/wordbooks/toefl-jr-04_prediction.json'),
  require('../../data/toefl/wordbooks/toefl-jr-05_speakers_purpose.json'),
  require('../../data/toefl/wordbooks/toefl-jr-06_rhetorical_device.json'),
  require('../../data/toefl/wordbooks/toefl-jr-07_prosody.json'),
];

const TOEFL_JR_WORDBOOKS: Wordbook[] = jrRaws.map((r) => rawToWordbook(r));

// ── 카테고리 정의 ─────────────────────────────────────
export interface WordbookCategory {
  id: string;
  label: string;
  books: Wordbook[];
}

export const BUILTIN_CATEGORIES: WordbookCategory[] = [
  {
    id: 'toefl_jr',
    label: 'TOEFL Junior LC',
    books: TOEFL_JR_WORDBOOKS,
  },
];

// ── 전체 목록 (seed + add 화면용) ─────────────────────
export const ALL_BUILTIN_WORDBOOKS: Wordbook[] = TOEFL_JR_WORDBOOKS;

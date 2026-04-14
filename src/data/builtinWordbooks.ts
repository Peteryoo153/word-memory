import { Wordbook, WordbookWord } from '../types/wordbook';
import { JUNIOR_TOEFL_WORDS } from './juniorToeplWords';

// ── GRE/TOEFL 필수 단어장 ────────────────────────────
// 기존 data/words.ts 단어를 WordbookWord 형식으로 래핑
const TOEFL_WORDS: WordbookWord[] = [
  {
    id: 'b1_w1',
    word: 'aberrant',
    pronunciation: 'æbˈerənt',
    partOfSpeech: 'adj',
    meanings: ['비정상적인', '일탈된'],
    examples: [
      { en: 'The scientist noted aberrant behavior in the test subjects.', ko: '과학자는 피험자들의 비정상적인 행동을 기록했다.' },
    ],
    synonyms: ['abnormal', 'deviant', 'anomalous'],
    antonyms: ['normal', 'typical'],
  },
  {
    id: 'b1_w2',
    word: 'abate',
    pronunciation: 'əˈbeɪt',
    partOfSpeech: 'verb',
    meanings: ['줄어들다', '약해지다'],
    examples: [
      { en: 'The storm began to abate after several hours.', ko: '폭풍은 몇 시간 후 약해지기 시작했다.' },
    ],
    synonyms: ['diminish', 'subside', 'decrease'],
    antonyms: ['intensify', 'increase'],
  },
  {
    id: 'b1_w3',
    word: 'acquiesce',
    pronunciation: 'ˌækwiˈes',
    partOfSpeech: 'verb',
    meanings: ['묵인하다', '마지못해 동의하다'],
    examples: [
      { en: 'She acquiesced to her parents\' demands despite her reservations.', ko: '그녀는 유보감에도 불구하고 부모의 요구에 마지못해 동의했다.' },
    ],
    synonyms: ['agree', 'comply', 'consent'],
    antonyms: ['resist', 'refuse'],
  },
  {
    id: 'b1_w4',
    word: 'acrimony',
    pronunciation: 'ˈækrɪmoʊni',
    partOfSpeech: 'noun',
    meanings: ['신랄함', '격렬한 반감'],
    examples: [
      { en: 'The divorce was marked by considerable acrimony between the two parties.', ko: '이혼 과정에서 두 사람 사이에 상당한 반감이 드러났다.' },
    ],
    synonyms: ['bitterness', 'hostility', 'rancor'],
    antonyms: ['goodwill', 'harmony'],
  },
  {
    id: 'b1_w5',
    word: 'adulterate',
    pronunciation: 'əˈdʌltəreɪt',
    partOfSpeech: 'verb',
    meanings: ['불순물을 섞다', '품질을 떨어뜨리다'],
    examples: [
      { en: 'The company was fined for adulterating its products with cheaper ingredients.', ko: '회사는 제품에 더 싼 재료를 섞어 벌금을 부과받았다.' },
    ],
    synonyms: ['contaminate', 'corrupt', 'debase'],
    antonyms: ['purify', 'refine'],
  },
  {
    id: 'b1_w6',
    word: 'aesthetic',
    pronunciation: 'esˈθetɪk',
    partOfSpeech: 'adj',
    meanings: ['미적인', '심미적인'],
    examples: [
      { en: 'The architect had a keen aesthetic sense for minimalist design.', ko: '그 건축가는 미니멀리즘 디자인에 대한 예리한 미적 감각을 지녔다.' },
    ],
    synonyms: ['artistic', 'elegant', 'beautiful'],
    antonyms: ['ugly', 'unattractive'],
  },
  {
    id: 'b1_w7',
    word: 'alleviate',
    pronunciation: 'əˈliːvieɪt',
    partOfSpeech: 'verb',
    meanings: ['완화하다', '경감하다'],
    examples: [
      { en: 'The medicine helped to alleviate her chronic pain.', ko: '약이 그녀의 만성 통증을 완화하는 데 도움이 됐다.' },
    ],
    synonyms: ['ease', 'relieve', 'mitigate'],
    antonyms: ['aggravate', 'worsen'],
  },
  {
    id: 'b1_w8',
    word: 'ambiguous',
    pronunciation: 'æmˈbɪɡjuəs',
    partOfSpeech: 'adj',
    meanings: ['모호한', '다의적인'],
    examples: [
      { en: 'The instructions were ambiguous and led to confusion.', ko: '지시사항이 모호해서 혼란을 초래했다.' },
    ],
    synonyms: ['vague', 'unclear', 'equivocal'],
    antonyms: ['clear', 'definite'],
  },
  {
    id: 'b1_w9',
    word: 'ameliorate',
    pronunciation: 'əˈmiːliəreɪt',
    partOfSpeech: 'verb',
    meanings: ['개선하다', '나아지게 하다'],
    examples: [
      { en: 'The new policies were designed to ameliorate living conditions.', ko: '새 정책은 생활 환경을 개선하기 위해 설계됐다.' },
    ],
    synonyms: ['improve', 'enhance', 'better'],
    antonyms: ['worsen', 'deteriorate'],
  },
  {
    id: 'b1_w10',
    word: 'anachronism',
    pronunciation: 'əˈnækrənɪzəm',
    partOfSpeech: 'noun',
    meanings: ['시대착오', '시대에 맞지 않는 것'],
    examples: [
      { en: 'Using a typewriter in 2024 would be considered an anachronism.', ko: '2024년에 타자기를 사용하는 것은 시대착오로 여겨질 것이다.' },
    ],
    synonyms: ['archaism', 'relic'],
    antonyms: ['modernity', 'innovation'],
  },
  {
    id: 'b1_w11',
    word: 'arduous',
    pronunciation: 'ˈɑːrdʒuəs',
    partOfSpeech: 'adj',
    meanings: ['힘든', '몹시 어려운'],
    examples: [
      { en: 'Climbing the mountain was an arduous task that took three days.', ko: '산을 오르는 것은 사흘이 걸리는 힘겨운 일이었다.' },
    ],
    synonyms: ['strenuous', 'laborious', 'exhausting'],
    antonyms: ['easy', 'effortless'],
  },
  {
    id: 'b1_w12',
    word: 'articulate',
    pronunciation: 'ɑːrˈtɪkjuleɪt',
    partOfSpeech: 'verb',
    meanings: ['명확히 표현하다', '분명히 말하다'],
    examples: [
      { en: 'She was able to articulate her ideas clearly during the presentation.', ko: '그녀는 발표 중 자신의 아이디어를 명확히 표현할 수 있었다.' },
    ],
    synonyms: ['express', 'convey', 'communicate'],
    antonyms: ['mumble', 'obscure'],
  },
  {
    id: 'b1_w13',
    word: 'assuage',
    pronunciation: 'əˈsweɪdʒ',
    partOfSpeech: 'verb',
    meanings: ['달래다', '진정시키다'],
    examples: [
      { en: 'He tried to assuage her fears with reassuring words.', ko: '그는 안심시키는 말로 그녀의 두려움을 달래려 했다.' },
    ],
    synonyms: ['soothe', 'calm', 'pacify'],
    antonyms: ['aggravate', 'provoke'],
  },
  {
    id: 'b1_w14',
    word: 'attenuate',
    pronunciation: 'əˈtenjueɪt',
    partOfSpeech: 'verb',
    meanings: ['약화시키다', '희석시키다'],
    examples: [
      { en: 'The walls helped to attenuate the noise from the street.', ko: '벽이 거리의 소음을 약화시키는 데 도움이 됐다.' },
    ],
    synonyms: ['weaken', 'dilute', 'reduce'],
    antonyms: ['strengthen', 'amplify'],
  },
  {
    id: 'b1_w15',
    word: 'audacious',
    pronunciation: 'ɔːˈdeɪʃəs',
    partOfSpeech: 'adj',
    meanings: ['대담한', '뻔뻔한'],
    examples: [
      { en: 'The audacious plan surprised even his closest allies.', ko: '그 대담한 계획은 가장 가까운 동료들도 놀라게 했다.' },
    ],
    synonyms: ['bold', 'daring', 'fearless'],
    antonyms: ['timid', 'cautious'],
  },
  {
    id: 'b1_w16',
    word: 'banal',
    pronunciation: 'bəˈnɑːl',
    partOfSpeech: 'adj',
    meanings: ['진부한', '평범한'],
    examples: [
      { en: 'The speech was full of banal observations that bored the audience.', ko: '연설은 청중을 지루하게 한 진부한 말들로 가득했다.' },
    ],
    synonyms: ['trite', 'clichéd', 'mundane'],
    antonyms: ['original', 'fresh'],
  },
  {
    id: 'b1_w17',
    word: 'benevolent',
    pronunciation: 'bəˈnevələnt',
    partOfSpeech: 'adj',
    meanings: ['자비로운', '인정 있는'],
    examples: [
      { en: 'The benevolent donor gave millions to local charities.', ko: '자비로운 기부자는 지역 자선단체에 수백만 달러를 기부했다.' },
    ],
    synonyms: ['kind', 'generous', 'charitable'],
    antonyms: ['malevolent', 'cruel'],
  },
  {
    id: 'b1_w18',
    word: 'blatant',
    pronunciation: 'ˈbleɪtənt',
    partOfSpeech: 'adj',
    meanings: ['노골적인', '뻔뻔스러운'],
    examples: [
      { en: 'His blatant disregard for the rules upset everyone.', ko: '그의 노골적인 규칙 무시는 모두를 화나게 했다.' },
    ],
    synonyms: ['obvious', 'flagrant', 'brazen'],
    antonyms: ['subtle', 'concealed'],
  },
  {
    id: 'b1_w19',
    word: 'bolster',
    pronunciation: 'ˈboʊlstər',
    partOfSpeech: 'verb',
    meanings: ['강화하다', '지지하다'],
    examples: [
      { en: 'The new evidence bolstered the argument significantly.', ko: '새 증거가 주장을 상당히 강화했다.' },
    ],
    synonyms: ['strengthen', 'support', 'reinforce'],
    antonyms: ['undermine', 'weaken'],
  },
  {
    id: 'b1_w20',
    word: 'burgeon',
    pronunciation: 'ˈbɜːrdʒən',
    partOfSpeech: 'verb',
    meanings: ['급성장하다', '싹트다'],
    examples: [
      { en: 'The city\'s tech industry began to burgeon in the early 2000s.', ko: '도시의 기술 산업은 2000년대 초에 급성장하기 시작했다.' },
    ],
    synonyms: ['flourish', 'thrive', 'expand'],
    antonyms: ['shrink', 'decline'],
  },
];

export const BUILTIN_WORDBOOK_TOEFL: Wordbook = {
  id: 'builtin_toefl_001',
  name: 'TOEFL 핵심 어휘',
  description: '토플 시험에 자주 출제되는 핵심 어휘 20선',
  source: 'builtin',
  totalWords: TOEFL_WORDS.length,
  createdAt: '2024-01-01',
  words: TOEFL_WORDS,
};

// ── 주니어토플 200개 단어장 ──────────────────────────
// Word 형식을 WordbookWord로 변환
const JUNIOR_TOEFL_WORDBOOK_WORDS: WordbookWord[] = JUNIOR_TOEFL_WORDS.map((w) => ({
  id: w.id,
  word: w.word,
  pronunciation: '',  // 발음 정보 없음
  partOfSpeech: w.partOfSpeech,
  meanings: [w.meaning],
  examples: [{ en: w.example, ko: w.example }],  // 영문만 제공되므로 영한 동일하게
  synonyms: w.synonyms,
  antonyms: w.antonyms,
}));

export const BUILTIN_WORDBOOK_JUNIOR_TOEFL: Wordbook = {
  id: 'builtin_junior_toefl_001',
  name: '주니어토플 단어 200개',
  description: '주니어토플 시험 대비용 핵심 단어 200개',
  source: 'builtin',
  totalWords: JUNIOR_TOEFL_WORDBOOK_WORDS.length,
  createdAt: '2024-04-14',
  words: JUNIOR_TOEFL_WORDBOOK_WORDS,
};

export const ALL_BUILTIN_WORDBOOKS: Wordbook[] = [
  BUILTIN_WORDBOOK_JUNIOR_TOEFL,
];

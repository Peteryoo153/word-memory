/**
 * TOEFL 단어 예문 자동 생성 스크립트
 *
 * 사용법:
 *   1. .env 파일에 ANTHROPIC_API_KEY=sk-ant-... 설정
 *   2. npx tsx scripts/generate-examples.ts
 *
 * 특징:
 *   - 중단 후 재시작 지원: examples가 이미 채워진 단어는 건너뜀
 *   - 실시간 진행률 표시
 *   - 단어 하나 완료할 때마다 JSON 저장 (중간 손실 방지)
 *   - 프롬프트 캐싱 적용 (시스템 프롬프트 재사용 → 비용 ~70% 절감)
 *   - 예상 비용: claude-sonnet-4-6 기준 218개 약 $0.50~1.50
 *     (프롬프트 캐싱 적용 시. 미적용 시 $2~5)
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

// ── 환경변수 로드 (.env) ──────────────────────────────
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
}

// ── 타입 정의 ─────────────────────────────────────────
interface Example {
  en: string;
  ko: string;
}

interface PdfWord {
  id: string;
  word: string;
  meanings: string[];
  synonyms?: string[];
  examples?: Example[];
}

interface PdfWordbook {
  id: string;
  name: string;
  description?: string;
  source: string;
  totalWords: number;
  words: PdfWord[];
}

// ── 설정 ──────────────────────────────────────────────
const DATA_DIR = path.resolve(process.cwd(), 'data/toefl');
const JSON_FILES = [
  'toefl-basic.json',
  'toefl-priority0.json',
  'toefl-priority1.json',
];
const MODEL = 'claude-sonnet-4-6';
const DELAY_MS = 500; // 요청 사이 대기 (rate limit 방지)

// ── 유틸리티 ──────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadWordbook(filename: string): PdfWordbook {
  const filePath = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PdfWordbook;
}

function saveWordbook(filename: string, wordbook: PdfWordbook) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(wordbook, null, 2), 'utf-8');
}

function formatProgress(current: number, total: number, word: string): string {
  const pct = Math.round((current / total) * 100);
  const bar =
    '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
  return `[${bar}] ${pct}% (${current}/${total}) ${word}`;
}

// ── 프롬프트 캐싱을 위한 시스템 프롬프트 (고정) ──────
const SYSTEM_PROMPT = `You are an expert English educator specializing in TOEFL exam preparation.

Your task is to generate academic English example sentences for vocabulary words.

Requirements for each example sentence:
- Use formal, academic language appropriate for TOEFL reading/writing sections
- Sentences should be 15–25 words long
- Context should reflect academic or professional settings (science, social studies, history, economics, etc.)
- The word usage must clearly illustrate the word's meaning
- Korean translation should be natural and accurate

Output format — respond with ONLY valid JSON, no other text:
{
  "examples": [
    {"en": "<first English example>", "ko": "<Korean translation>"},
    {"en": "<second English example>", "ko": "<Korean translation>"}
  ]
}`;

// ── Claude API 호출 ───────────────────────────────────
async function generateExamples(
  client: Anthropic,
  word: PdfWord,
): Promise<Example[]> {
  const meanings = word.meanings.join(', ');
  const synonyms = word.synonyms?.slice(0, 3).join(', ') ?? '';

  const userMessage =
    `Word: "${word.word}"\n` +
    `Meanings: ${meanings}\n` +
    (synonyms ? `Synonyms: ${synonyms}\n` : '') +
    `\nGenerate 2 TOEFL-level academic example sentences for this word.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        // 시스템 프롬프트 캐싱 — 모든 요청에서 재사용
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text block in response');
  }

  // JSON 파싱 (코드 블록 마크다운이 붙을 경우도 처리)
  const raw = textBlock.text.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(raw) as { examples: Example[] };

  if (!Array.isArray(parsed.examples) || parsed.examples.length === 0) {
    throw new Error('Invalid examples format');
  }

  return parsed.examples;
}

// ── 메인 ──────────────────────────────────────────────
async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('\n❌ ANTHROPIC_API_KEY가 설정되지 않았습니다.');
    console.error('');
    console.error('1. .env 파일을 프로젝트 루트에 만들고:');
    console.error('   ANTHROPIC_API_KEY=sk-ant-api03-...');
    console.error('');
    console.error('2. API 키 발급: https://console.anthropic.com/settings/keys');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  // 전체 단어 수 집계
  const allFiles = JSON_FILES.map((f) => ({ filename: f, data: loadWordbook(f) }));
  const totalWords = allFiles.reduce((sum, f) => sum + f.data.words.length, 0);
  const needsGeneration = allFiles.reduce(
    (sum, f) =>
      sum + f.data.words.filter((w) => !w.examples || w.examples.length === 0).length,
    0,
  );
  const alreadyDone = totalWords - needsGeneration;

  console.log('\n🚀 TOEFL 단어 예문 자동 생성 시작');
  console.log(`   모델: ${MODEL}`);
  console.log(`   전체 단어: ${totalWords}개`);
  console.log(`   이미 완료: ${alreadyDone}개`);
  console.log(`   생성 필요: ${needsGeneration}개`);
  console.log('');

  if (needsGeneration === 0) {
    console.log('✅ 모든 단어에 예문이 이미 채워져 있습니다!');
    return;
  }

  let globalCurrent = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const { filename, data } of allFiles) {
    let fileModified = false;

    console.log(`\n📖 처리 중: ${filename} (${data.words.length}개)`);

    for (const word of data.words) {
      // 이미 예문이 있으면 건너뜀 (재시작 지원)
      if (word.examples && word.examples.length > 0) {
        globalCurrent++;
        continue;
      }

      globalCurrent++;
      const progressStr = formatProgress(globalCurrent, totalWords, word.word);
      process.stdout.write(`\r   ${progressStr}   `);

      try {
        const examples = await generateExamples(client, word);
        word.examples = examples;
        fileModified = true;
        successCount++;
      } catch (err) {
        errorCount++;
        const errMsg = err instanceof Error ? err.message : String(err);
        process.stdout.write('\n');
        console.error(`   ⚠️  "${word.word}" 실패: ${errMsg}`);
        // 실패한 단어는 빈 배열로 두고 계속 진행
        word.examples = [];
      }

      // 단어 하나 완료할 때마다 즉시 저장 (중단해도 진행분 유지)
      if (fileModified) {
        saveWordbook(filename, data);
        fileModified = false; // 저장 후 플래그 초기화
      }

      await sleep(DELAY_MS);
    }

    process.stdout.write('\n');
    console.log(`   ✅ ${filename} 완료`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✨ 완료! 성공: ${successCount}개 / 실패: ${errorCount}개`);
  if (errorCount > 0) {
    console.log(`   ⚠️  실패한 단어는 다시 실행하면 재시도됩니다.`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((err) => {
  console.error('\n❌ 예기치 않은 오류:', err);
  process.exit(1);
});

import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WORDS } from '../../data/words';
import { getAllProgress, saveWordProgress, calcNextReview } from '../../src/storage';
import { buildQuiz, QuizQuestion } from '../../src/quiz';
import { WordProgress } from '../../src/types';
import { speakWord } from '../../src/tts';

type Mode = 'select' | 'quiz' | 'result';
type TestType = 'quick' | 'review';

interface AnswerRecord {
  question: QuizQuestion;
  chosen: number;    // 사용자가 고른 인덱스
  correct: boolean;
}

export default function TestScreen() {
  const [mode, setMode] = useState<Mode>('select');
  const [testType, setTestType] = useState<TestType>('quick');
  const [reviewCount, setReviewCount] = useState(0);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null); // 현재 문항 선택값
  const [records, setRecords] = useState<AnswerRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadReviewCount();
      // 탭 다시 들어오면 선택 화면으로 초기화
      setMode('select');
    }, [])
  );

  async function loadReviewCount() {
    const all = await getAllProgress();
    const today = new Date().toISOString().split('T')[0];
    const count = Object.values(all).filter(
      (p) => p.nextReviewDate <= today && p.learned
    ).length;
    setReviewCount(count);
  }

  async function startQuick() {
    // 한 번이라도 학습한 단어 중 랜덤 5개
    const all = await getAllProgress();
    const learned = WORDS.filter((w) => all[w.id]?.learned);
    const pool = learned.length >= 5 ? learned : WORDS; // 학습한 게 5개 미만이면 전체에서
    const quiz = buildQuiz(pool, 5);
    setQuestions(quiz);
    setCurrentIdx(0);
    setSelected(null);
    setRecords([]);
    setTestType('quick');
    setMode('quiz');
  }

  async function startReview() {
    const all = await getAllProgress();
    const today = new Date().toISOString().split('T')[0];
    const dueIds = Object.values(all)
      .filter((p) => p.nextReviewDate <= today && p.learned)
      .map((p) => p.wordId);
    const dueWords = WORDS.filter((w) => dueIds.includes(w.id));
    const quiz = buildQuiz(dueWords, dueWords.length);
    setQuestions(quiz);
    setCurrentIdx(0);
    setSelected(null);
    setRecords([]);
    setTestType('review');
    setMode('quiz');
  }

  function handleSelect(idx: number) {
    if (selected !== null) return; // 이미 선택했으면 무시
    setSelected(idx);
  }

  async function handleNext() {
    if (selected === null) return;

    const q = questions[currentIdx];
    const correct = selected === q.answerIndex;
    const newRecord: AnswerRecord = { question: q, chosen: selected, correct };
    const newRecords = [...records, newRecord];

    // 복습 테스트일 때만 진도 업데이트
    if (testType === 'review') {
      const all = await getAllProgress();
      const existing: WordProgress = all[q.word.id] ?? {
        wordId: q.word.id,
        learned: true,
        correctCount: 0,
        wrongCount: 0,
        nextReviewDate: '',
        reviewInterval: 1,
        lastStudiedAt: new Date().toISOString().split('T')[0],
      };
      await saveWordProgress(calcNextReview(existing, correct));
    }

    if (currentIdx + 1 >= questions.length) {
      setRecords(newRecords);
      setMode('result');
    } else {
      setRecords(newRecords);
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
    }
  }

  // ── 화면: 모드 선택 ──────────────────────────────
  if (mode === 'select') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.selectWrap}>
          <Text style={styles.pageTitle}>테스트</Text>
          <Text style={styles.pageSub}>어떤 테스트를 시작할까요?</Text>

          <TouchableOpacity style={styles.modeCard} onPress={startQuick}>
            <Text style={styles.modeEmoji}>⚡</Text>
            <View style={styles.modeTextWrap}>
              <Text style={styles.modeTitle}>퀵 테스트</Text>
              <Text style={styles.modeSub}>5문항 · 학습한 단어 중 랜덤 출제</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, reviewCount === 0 && styles.modeCardDisabled]}
            onPress={reviewCount > 0 ? startReview : undefined}
          >
            <Text style={styles.modeEmoji}>🔁</Text>
            <View style={styles.modeTextWrap}>
              <Text style={styles.modeTitle}>복습 테스트</Text>
              <Text style={styles.modeSub}>
                {reviewCount > 0
                  ? `오늘 복습할 단어 ${reviewCount}개`
                  : '오늘 복습할 단어가 없어요'}
              </Text>
            </View>
            {reviewCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{reviewCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── 화면: 퀴즈 진행 ──────────────────────────────
  if (mode === 'quiz') {
    const q = questions[currentIdx];
    const answered = selected !== null;

    return (
      <SafeAreaView style={styles.container}>
        {/* 헤더 */}
        <View style={styles.quizHeader}>
          <TouchableOpacity onPress={() => setMode('select')}>
            <Text style={styles.backBtn}>← 나가기</Text>
          </TouchableOpacity>
          <Text style={styles.quizCounter}>
            {currentIdx + 1} / {questions.length}
          </Text>
        </View>

        {/* 진행 바 */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${((currentIdx + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>

        <ScrollView contentContainerStyle={styles.quizBody}>
          {/* 문제 */}
          <View style={styles.questionBox}>
            <Text style={styles.questionLabel}>다음 단어의 뜻은?</Text>
            <View style={styles.questionWordRow}>
              <Text style={styles.questionWord}>{q.word.word}</Text>
              <TouchableOpacity
                onPress={() => speakWord(q.word.word)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="volume-high-outline" size={26} color="#4A90D9" />
              </TouchableOpacity>
            </View>
            <Text style={styles.questionPos}>
              {({ noun: '명사', verb: '동사', adj: '형용사', adv: '부사' } as Record<string,string>)[q.word.partOfSpeech] ?? q.word.partOfSpeech}
            </Text>
          </View>

          {/* 보기 */}
          <View style={styles.choicesWrap}>
            {q.choices.map((choice, idx) => {
              let bg = '#fff';
              let textColor = '#111827';
              let borderColor = '#E5E7EB';

              if (answered) {
                if (idx === q.answerIndex) {
                  bg = '#DCFCE7'; borderColor = '#16A34A'; textColor = '#15803D';
                } else if (idx === selected) {
                  bg = '#FEE2E2'; borderColor = '#DC2626'; textColor = '#B91C1C';
                }
              } else if (idx === selected) {
                bg = '#EFF6FF'; borderColor = '#4A90D9';
              }

              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.choiceBtn, { backgroundColor: bg, borderColor }]}
                  onPress={() => handleSelect(idx)}
                  activeOpacity={answered ? 1 : 0.7}
                >
                  <Text style={[styles.choiceLabel, { color: '#9BA3AF' }]}>
                    {['A', 'B', 'C', 'D'][idx]}
                  </Text>
                  <Text style={[styles.choiceText, { color: textColor }]}>{choice}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 정답 피드백 */}
          {answered && (
            <View style={[
              styles.feedbackBox,
              selected === q.answerIndex ? styles.feedbackCorrect : styles.feedbackWrong,
            ]}>
              <Text style={styles.feedbackTitle}>
                {selected === q.answerIndex ? '정답!' : '오답'}
              </Text>
              <Text style={styles.feedbackDetail}>
                {q.word.word} = {q.word.meaning}
              </Text>
              <Text style={styles.feedbackExample} numberOfLines={2}>
                {q.word.example}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* 다음 버튼 */}
        {answered && (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {currentIdx + 1 < questions.length ? '다음 문제' : '결과 보기'}
            </Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  // ── 화면: 결과 ──────────────────────────────────
  const correctCount = records.filter((r) => r.correct).length;
  const total = records.length;
  const scorePercent = Math.round((correctCount / total) * 100);

  let resultEmoji = '😅';
  let resultMsg = '조금 더 연습해봐요!';
  if (scorePercent >= 80) { resultEmoji = '🏆'; resultMsg = '훌륭해요!'; }
  else if (scorePercent >= 60) { resultEmoji = '👍'; resultMsg = '잘 하고 있어요!'; }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.resultWrap}>
        <Text style={styles.resultEmoji}>{resultEmoji}</Text>
        <Text style={styles.resultScore}>{correctCount} / {total}</Text>
        <Text style={styles.resultPercent}>{scorePercent}점</Text>
        <Text style={styles.resultMsg}>{resultMsg}</Text>

        {/* 오답 목록 */}
        {records.some((r) => !r.correct) && (
          <View style={styles.wrongList}>
            <Text style={styles.wrongListTitle}>틀린 단어</Text>
            {records.filter((r) => !r.correct).map((r, i) => (
              <View key={i} style={styles.wrongItem}>
                <Text style={styles.wrongWord}>{r.question.word.word}</Text>
                <Text style={styles.wrongMeaning}>{r.question.word.meaning}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.retryBtn} onPress={() => setMode('select')}>
          <Text style={styles.retryBtnText}>테스트 선택으로 돌아가기</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  // 선택 화면
  selectWrap: { flex: 1, padding: 24, paddingTop: 32 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 6 },
  pageSub: { fontSize: 14, color: '#6B7280', marginBottom: 28 },
  modeCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modeCardDisabled: { opacity: 0.5 },
  modeEmoji: { fontSize: 36, marginRight: 16 },
  modeTextWrap: { flex: 1 },
  modeTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  modeSub: { fontSize: 13, color: '#6B7280' },
  badge: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // 퀴즈 화면
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  quizCounter: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  progressBarBg: { height: 6, backgroundColor: '#E5E7EB', marginHorizontal: 20, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#4A90D9', borderRadius: 3 },
  quizBody: { padding: 20, paddingBottom: 40 },
  questionBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  questionLabel: { fontSize: 12, color: '#9BA3AF', fontWeight: '600', marginBottom: 12, letterSpacing: 1 },
  questionWordRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  questionWord: { fontSize: 36, fontWeight: '800', color: '#111827' },
  questionPos: { fontSize: 13, color: '#4A90D9', fontWeight: '600' },
  choicesWrap: { gap: 10 },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    padding: 16,
    gap: 12,
  },
  choiceLabel: { fontSize: 14, fontWeight: '700', width: 20, textAlign: 'center' },
  choiceText: { fontSize: 15, fontWeight: '600', flex: 1 },
  feedbackBox: {
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  feedbackCorrect: { backgroundColor: '#DCFCE7' },
  feedbackWrong: { backgroundColor: '#FEE2E2' },
  feedbackTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4, color: '#111827' },
  feedbackDetail: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  feedbackExample: { fontSize: 13, color: '#6B7280', fontStyle: 'italic' },
  nextBtn: {
    backgroundColor: '#4A90D9',
    margin: 20,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // 결과 화면
  resultWrap: { alignItems: 'center', padding: 28, paddingTop: 48 },
  resultEmoji: { fontSize: 72, marginBottom: 16 },
  resultScore: { fontSize: 48, fontWeight: '800', color: '#111827' },
  resultPercent: { fontSize: 22, color: '#4A90D9', fontWeight: '700', marginBottom: 8 },
  resultMsg: { fontSize: 18, color: '#6B7280', marginBottom: 28 },
  wrongList: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24 },
  wrongListTitle: { fontSize: 14, fontWeight: '700', color: '#9BA3AF', marginBottom: 12, letterSpacing: 1 },
  wrongItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  wrongWord: { fontSize: 16, fontWeight: '700', color: '#111827' },
  wrongMeaning: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  retryBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getActiveWordbook, getProgress } from '../../src/storage/wordbookStorage';
import { saveStudyPlanScore } from '../../src/storage';
import { consumeTodayTestIntent } from '../../src/studyIntent';
import { toWord } from '../../src/types/wordbook';
import { buildQuiz, QuizQuestion } from '../../src/quiz';
import { Word } from '../../src/types';
import { speakWord } from '../../src/tts';
import { fontSize, fontWeight, fontFamily, spacing, radius, lineHeight, letterSpacing, useColors, ColorPalette } from '../../src/theme';
import { auth } from '../../src/firebase/config';
import { updateTestScore } from '../../src/firebase/groupStorage';

type Mode = 'select' | 'quiz' | 'result';
type TestType = 'today' | 'all';

interface AnswerRecord {
  question: QuizQuestion;
  chosen: number;
  correct: boolean;
}

export default function TestScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [mode, setMode] = useState<Mode>('select');
  const [testType, setTestType] = useState<TestType>('today');
  const [activeWordbookId, setActiveWordbookId] = useState<string | null>(null);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [records, setRecords] = useState<AnswerRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (consumeTodayTestIntent()) {
        startTodayTest();
      } else {
        setMode('select');
      }
    }, [])
  );

  async function startTodayTest() {
    const book = await getActiveWordbook();
    if (!book) { setMode('select'); return; }
    const progress = await getProgress(book.id);
    const today = new Date().toISOString().split('T')[0];
    const allWords = book.words.map(toWord);
    const todayWords = book.words
      .filter((w) => progress.ebbinghausData[w.id]?.lastStudiedAt === today)
      .map(toWord);
    if (todayWords.length === 0) { setMode('select'); return; }
    const quiz = buildQuiz(todayWords, todayWords.length, allWords);
    setQuestions(quiz);
    setCurrentIdx(0);
    setSelected(null);
    setRecords([]);
    setTestType('today');
    setActiveWordbookId(book.id);
    setMode('quiz');
  }

  async function startAllLearnedTest() {
    const book = await getActiveWordbook();
    if (!book) return;
    const progress = await getProgress(book.id);
    const allWords = book.words.map(toWord);
    const learnedWords = book.words
      .filter((w) => progress.ebbinghausData[w.id]?.learned)
      .map(toWord);
    if (learnedWords.length === 0) return;
    const quiz = buildQuiz(learnedWords, learnedWords.length, allWords);
    setQuestions(quiz);
    setCurrentIdx(0);
    setSelected(null);
    setRecords([]);
    setTestType('all');
    setActiveWordbookId(book.id);
    setMode('quiz');
  }

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
  }

  async function handleNext() {
    if (selected === null) return;

    const q = questions[currentIdx];
    const correct = selected === q.answerIndex;
    const newRecord: AnswerRecord = { question: q, chosen: selected, correct };
    const newRecords = [...records, newRecord];

    if (currentIdx + 1 >= questions.length) {
      setRecords(newRecords);
      setMode('result');
      const finalCorrect = newRecords.filter((r) => r.correct).length;
      const finalScore = Math.round((finalCorrect / newRecords.length) * 100);
      // 날짜별 테스트 점수(맞춘 개수) 저장
      const today = new Date().toISOString().split('T')[0];
      saveStudyPlanScore(today, finalCorrect).catch(() => {});
      // 그룹 테스트 점수 기록
      const u = auth.currentUser;
      if (u) {
        updateTestScore(u.uid, u.displayName ?? '사용자', u.photoURL ?? '', finalScore).catch(() => {});
      }
    } else {
      setRecords(newRecords);
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
    }
  }

  // ── 모드 선택 화면 ───────────────────────────────
  if (mode === 'select') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.selectWrap}>
          <Text style={styles.pageTitle}>테스트</Text>
          <Text style={styles.pageSub}>어떤 테스트를 시작할까요?</Text>

          <TouchableOpacity style={styles.modeCard} onPress={startTodayTest}>
            <Text style={styles.modeEmoji}>📅</Text>
            <View style={styles.modeTextWrap}>
              <Text style={styles.modeTitle}>오늘 단어 테스트</Text>
              <Text style={styles.modeSub}>오늘 학습한 단어만 출제</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modeCard} onPress={startAllLearnedTest}>
            <Text style={styles.modeEmoji}>📚</Text>
            <View style={styles.modeTextWrap}>
              <Text style={styles.modeTitle}>지금까지 암기단어 테스트</Text>
              <Text style={styles.modeSub}>완료된 단어 전체 출제</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── 퀴즈 화면 ────────────────────────────────────
  if (mode === 'quiz') {
    const q = questions[currentIdx];
    const answered = selected !== null;

    return (
      <SafeAreaView style={styles.container}>
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

        <ScrollView contentContainerStyle={styles.quizBody} contentInsetAdjustmentBehavior="automatic">
          {/* 문제 박스 */}
          <View style={styles.questionBox}>
            <Text style={styles.questionLabel}>다음 단어의 뜻은?</Text>
            <View style={styles.questionWordRow}>
              <Text style={styles.questionWord}>{q.word.word}</Text>
              <TouchableOpacity
                onPress={() => speakWord(q.word.word)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="volume-high-outline" size={24} color={colors.sage[500]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.questionPos}>
              {({ noun: 'NOUN · 명사', verb: 'VERB · 동사', adj: 'ADJ · 형용사', adv: 'ADV · 부사' } as Record<string, string>)[q.word.partOfSpeech] ?? q.word.partOfSpeech}
            </Text>
          </View>

          {/* 보기 */}
          <View style={styles.choicesWrap}>
            {q.choices.map((choice, idx) => {
              let bg: string = colors.paper.white;
              let textColor: string = colors.paper[800];
              let borderColor: string = colors.paper[200];

              if (answered) {
                if (idx === q.answerIndex) {
                  bg = colors.sage[100]; borderColor = colors.sage[400]; textColor = colors.sage[800];
                } else if (idx === selected) {
                  bg = colors.terra[100]; borderColor = colors.terra[400]; textColor = colors.semantic.error;
                }
              }

              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.choiceBtn, { backgroundColor: bg, borderColor }]}
                  onPress={() => handleSelect(idx)}
                  activeOpacity={answered ? 1 : 0.7}
                >
                  <Text style={[styles.choiceLabel, { color: colors.paper[400] }]}>
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

  // ── 결과 화면 ────────────────────────────────────
  const correctCount = records.filter((r) => r.correct).length;
  const total = records.length;
  const scorePercent = Math.round((correctCount / total) * 100);

  let resultEmoji = '😅';
  let resultMsg = '조금 더 연습해봐요!';
  if (scorePercent >= 80) { resultEmoji = '🏆'; resultMsg = '훌륭해요!'; }
  else if (scorePercent >= 60) { resultEmoji = '👍'; resultMsg = '잘 하고 있어요!'; }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.resultWrap} contentInsetAdjustmentBehavior="automatic">
        <Text style={styles.resultEmoji}>{resultEmoji}</Text>
        <Text style={styles.resultScore}>{correctCount} / {total}</Text>
        <Text style={styles.resultPercent}>{scorePercent}점</Text>
        <Text style={styles.resultMsg}>{resultMsg}</Text>

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

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper.bg },

  // ── 선택 화면
  selectWrap: {
    flex: 1,
    padding: spacing.xl,
    paddingTop: spacing['2xl'],
  },
  pageTitle: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    color: colors.paper[900],
    marginBottom: spacing.xs,
  },
  pageSub: {
    fontSize: fontSize.bodySmall,
    color: colors.paper[500],
    marginBottom: spacing['2xl'],
  },
  modeCard: {
    backgroundColor: colors.paper.white,
    borderRadius: radius['2xl'],
    borderWidth: 0.5,
    borderColor: colors.paper[100],
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 3,
  },
  modeEmoji: { fontSize: 32, marginRight: spacing.lg },
  modeTextWrap: { flex: 1 },
  modeTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.paper[900],
    marginBottom: spacing.xs,
  },
  modeSub: { fontSize: fontSize.caption, color: colors.paper[500] },
  // ── 퀴즈 화면
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: { fontSize: fontSize.bodySmall, color: colors.paper[500], fontWeight: fontWeight.medium },
  quizCounter: { fontSize: fontSize.bodySmall, color: colors.paper[500], fontWeight: fontWeight.medium },

  progressBarBg: {
    height: 3,
    backgroundColor: colors.sage[200],
    marginHorizontal: spacing.lg,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBarFill: { height: '100%', backgroundColor: colors.sage[600], borderRadius: 2 },

  quizBody: { padding: spacing.lg, paddingBottom: 40 },

  questionBox: {
    backgroundColor: colors.paper.white,
    borderRadius: radius['2xl'],
    borderWidth: 0.5,
    borderColor: colors.paper[100],
    padding: spacing['2xl'],
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 2,
  },
  questionLabel: {
    fontSize: fontSize.label,
    color: colors.paper[400],
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  questionWordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  questionWord: {
    fontSize: fontSize.displayWord,
    fontFamily: fontFamily.serif,
    fontWeight: fontWeight.bold,
    color: colors.paper[900],
  },
  questionPos: {
    fontSize: fontSize.label,
    color: colors.terra[500],
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.label,
  },

  choicesWrap: { gap: spacing.sm },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.paper[100],
    backgroundColor: colors.paper.white,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 1,
  },
  choiceLabel: { fontSize: fontSize.bodySmall, fontWeight: fontWeight.bold, width: 20, textAlign: 'center' },
  choiceText: { fontSize: fontSize.body, fontWeight: fontWeight.medium, flex: 1 },

  feedbackBox: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 0.5,
  },
  feedbackCorrect: {
    backgroundColor: colors.sage[100],
    borderColor: colors.sage[300],
  },
  feedbackWrong: {
    backgroundColor: colors.terra[100],
    borderColor: colors.terra[200],
  },
  feedbackTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
    color: colors.paper[900],
  },
  feedbackDetail: {
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.semibold,
    color: colors.paper[700],
    marginBottom: spacing.xs,
  },
  feedbackExample: {
    fontSize: fontSize.caption,
    color: colors.paper[500],
    fontStyle: 'italic',
    lineHeight: fontSize.caption * lineHeight.relaxed,
  },

  nextBtn: {
    backgroundColor: colors.sage[600],
    margin: spacing.lg,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnText: { color: colors.paper.white, fontSize: fontSize.body, fontWeight: fontWeight.medium },

  // ── 결과 화면
  resultWrap: { alignItems: 'center', padding: spacing['2xl'], paddingTop: spacing['3xl'] },
  resultEmoji: { fontSize: 72, marginBottom: spacing.lg },
  resultScore: { fontSize: 48, fontWeight: fontWeight.extrabold, color: colors.paper[900] },
  resultPercent: { fontSize: fontSize.h2, color: colors.sage[600], fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  resultMsg: { fontSize: fontSize.body, color: colors.paper[500], marginBottom: spacing['2xl'] },

  wrongList: {
    width: '100%',
    backgroundColor: colors.paper.white,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: colors.paper[100],
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  wrongListTitle: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colors.paper[400],
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  wrongItem: {
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.paper[100],
  },
  wrongWord: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.paper[900] },
  wrongMeaning: { fontSize: fontSize.caption, color: colors.paper[500], marginTop: spacing.xs },

  retryBtn: {
    backgroundColor: colors.sage[600],
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing['2xl'],
  },
  retryBtnText: { color: colors.paper.white, fontSize: fontSize.bodySmall, fontWeight: fontWeight.medium },
  });
}

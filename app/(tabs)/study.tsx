import { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getSettings, getStudyPlan } from '../../src/storage';
import { getActiveWordbook, getProgress, markWordResult } from '../../src/storage/wordbookStorage';
import { setTodayTestIntent } from '../../src/studyIntent';
import { WordbookWord, toWord } from '../../src/types/wordbook';
import WordCard from '../../components/WordCard';
import { fontSize, fontWeight, spacing, radius, lineHeight, useColors, ColorPalette } from '../../src/theme';
import { auth } from '../../src/firebase/config';
import { updateStudyActivity } from '../../src/firebase/groupStorage';

export default function StudyScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [dailyGoal, setDailyGoal] = useState(10);
  const [queue, setQueue] = useState<WordbookWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [activeWordbookId, setActiveWordbookId] = useState<string | null>(null);
  const sessionStartRef = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      loadSession();
    }, [])
  );

  async function loadSession() {
    setIsReviewMode(false);
    const [settings, studyPlan] = await Promise.all([getSettings(), getStudyPlan()]);
    const goal = studyPlan?.dailyGoal ?? settings.dailyGoal;
    setDailyGoal(goal);

    const book = await getActiveWordbook();
    if (!book) {
      setFinished(true);
      return;
    }
    setActiveWordbookId(book.id);

    const progress = await getProgress(book.id);
    const today = new Date().toISOString().split('T')[0];

    // 오늘 이미 학습한 단어 수
    const alreadyTodayCount = Object.values(progress.ebbinghausData)
      .filter((e) => e.lastStudiedAt === today).length;

    // 오늘 목표를 이미 채웠으면 완료
    if (alreadyTodayCount >= goal) {
      setDoneCount(goal);
      setQueue([]);
      setFinished(true);
      return;
    }

    // 아직 한 번도 배우지 않은 단어들 (처음 학습 대상)
    const neverLearned = book.words.filter(
      (w) => !progress.ebbinghausData[w.id]?.learned
    );

    // 오늘 남은 슬롯만큼만 할당 (항상 같은 단어 세트 유지)
    const remaining = neverLearned.slice(0, goal - alreadyTodayCount);

    setQueue(remaining);
    setCurrentIndex(0);
    setDoneCount(alreadyTodayCount);
    setFinished(remaining.length === 0);
    sessionStartRef.current = Date.now();
  }

  async function markWord(correct: boolean) {
    if (!activeWordbookId) return;
    const word = queue[currentIndex];
    await markWordResult(activeWordbookId, word.id, correct);

    const next = currentIndex + 1;
    const newDone = doneCount + 1;

    if (next >= queue.length) {
      // 세션 완료 → 그룹 활동 기록 (최초 학습 세션만)
      if (!isReviewMode) {
        const u = auth.currentUser;
        if (u && newDone > 0) {
          const elapsedMins = Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 60000));
          updateStudyActivity(u.uid, u.displayName ?? '사용자', u.photoURL ?? '', newDone, elapsedMins).catch(() => {});
        }
      }
      setFinished(true);
    } else {
      setCurrentIndex(next);
    }
    setDoneCount(newDone);
  }

  async function startReview() {
    const book = await getActiveWordbook();
    if (!book) return;
    const progress = await getProgress(book.id);
    const today = new Date().toISOString().split('T')[0];
    const todayWords = book.words.filter(
      (w) => progress.ebbinghausData[w.id]?.lastStudiedAt === today
    );
    setQueue(todayWords);
    setCurrentIndex(0);
    setDoneCount(0);
    setIsReviewMode(true);
    setFinished(todayWords.length === 0);
    sessionStartRef.current = Date.now();
  }

  // ── 완료 화면 ─────────────────────────────────────
  if (finished) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.bigEmoji}>{isReviewMode ? '✅' : '🎉'}</Text>
          <Text style={styles.doneTitle}>
            {isReviewMode ? '복습 완료!' : '오늘 학습 완료!'}
          </Text>
          <Text style={styles.doneSub}>
            {isReviewMode
              ? '오늘 학습한 단어를 다시 살펴봤어요!'
              : `오늘 목표 ${dailyGoal}개를 모두 학습했어요.\n테스트로 실력을 확인해봐요!`}
          </Text>
          <View style={styles.doneActions}>
            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => {
                setTodayTestIntent();
                router.push('/(tabs)/test');
              }}
            >
              <Text style={styles.testBtnText}>테스트하기</Text>
            </TouchableOpacity>
            {!isReviewMode && (
              <TouchableOpacity style={styles.reviewBtn} onPress={startReview}>
                <Text style={styles.reviewBtnText}>복습하기</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.homeBtnText}>홈으로</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const currentWord = queue[currentIndex];

  if (!currentWord) return null;

  const progress = (currentIndex + 1) / queue.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>오늘의 학습</Text>
        <Text style={styles.headerSub}>{currentIndex + 1} / {queue.length}개</Text>
      </View>

      {/* 진행 인디케이터 (progress dots) */}
      <View style={styles.dotsRow}>
        {queue.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i <= currentIndex ? styles.dotDone : styles.dotPending,
            ]}
          />
        ))}
      </View>

      {/* 단어 카드 */}
      <View style={styles.cardArea}>
        <WordCard word={toWord(currentWord)} index={currentIndex} total={queue.length} />
      </View>

      {/* 알았어요 / 몰랐어요 버튼 */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.dontKnowBtn]}
          onPress={() => markWord(false)}
        >
          <Text style={styles.dontKnowText}>몰랐어요</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.knowBtn]}
          onPress={() => markWord(true)}
        >
          <Text style={styles.knowText}>알았어요</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.tipText}>카드를 탭하면 뜻을 볼 수 있어요</Text>
    </SafeAreaView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper.bg,
    paddingTop: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.semibold,
    color: colors.paper[900],
  },
  headerSub: {
    fontSize: fontSize.bodySmall,
    color: colors.paper[500],
    fontWeight: fontWeight.medium,
  },

  // Progress dots
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  dot: {
    height: 3,
    width: 24,
    borderRadius: 2,
  },
  dotDone: {
    backgroundColor: colors.sage[600],
  },
  dotPending: {
    backgroundColor: colors.sage[200],
  },

  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },

  // 버튼
  btnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: radius['2xl'],
    alignItems: 'center',
  },
  dontKnowBtn: {
    backgroundColor: colors.paper.white,
    borderWidth: 0.5,
    borderColor: colors.paper[200],
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  dontKnowText: {
    color: colors.semantic.error,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  knowBtn: {
    backgroundColor: colors.sage[600],
    borderWidth: 0,
  },
  knowText: {
    color: colors.paper.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },

  tipText: {
    textAlign: 'center',
    fontSize: fontSize.caption - 1,
    color: colors.paper[300],
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },

  // 완료 화면
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  bigEmoji: {
    fontSize: 72,
    marginBottom: spacing.lg,
  },
  doneTitle: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    color: colors.paper[900],
    marginBottom: spacing.md,
  },
  doneSub: {
    fontSize: fontSize.body,
    color: colors.paper[500],
    textAlign: 'center',
    lineHeight: fontSize.body * lineHeight.relaxed,
  },
  doneActions: {
    marginTop: spacing['2xl'],
    gap: spacing.md,
    width: '100%',
  },
  homeBtn: {
    backgroundColor: colors.paper.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.paper[200],
    paddingVertical: 14,
    alignItems: 'center',
  },
  homeBtnText: {
    color: colors.paper[600],
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  testBtn: {
    backgroundColor: colors.sage[600],
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  testBtnText: {
    color: colors.paper.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  reviewBtn: {
    backgroundColor: colors.paper.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.sage[300],
    paddingVertical: 14,
    alignItems: 'center',
  },
  reviewBtnText: {
    color: colors.sage[600],
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  });
}

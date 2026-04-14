import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getSettings } from '../../src/storage';
import { getActiveWordbook, getProgress, markWordResult } from '../../src/storage/wordbookStorage';
import { WordbookWord, toWord } from '../../src/types/wordbook';
import WordCard from '../../components/WordCard';
import { colors, fontSize, fontWeight, spacing, radius, lineHeight } from '../../src/theme';

export default function StudyScreen() {
  const [dailyGoal, setDailyGoal] = useState(10);
  const [queue, setQueue] = useState<WordbookWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [activeWordbookId, setActiveWordbookId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSession();
    }, [])
  );

  async function loadSession() {
    const settings = await getSettings();
    setDailyGoal(settings.dailyGoal);

    const book = await getActiveWordbook();
    if (!book) {
      setFinished(true);
      return;
    }
    setActiveWordbookId(book.id);

    const progress = await getProgress(book.id);
    const today = new Date().toISOString().split('T')[0];

    const notYetToday = book.words.filter((w) => {
      const e = progress.ebbinghausData[w.id];
      return !e || e.lastStudiedAt !== today;
    });

    const todayQueue = notYetToday.slice(0, settings.dailyGoal);

    setQueue(todayQueue);
    setCurrentIndex(0);
    setDoneCount(0);
    setFinished(todayQueue.length === 0);
  }

  async function markWord(correct: boolean) {
    if (!activeWordbookId) return;
    const word = queue[currentIndex];
    await markWordResult(activeWordbookId, word.id, correct);

    const next = currentIndex + 1;
    if (next >= queue.length) {
      setFinished(true);
    } else {
      setCurrentIndex(next);
    }
    setDoneCount((c) => c + 1);
  }

  // ── 완료 화면 ─────────────────────────────────────
  if (finished) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.bigEmoji}>{queue.length === 0 ? '🎉' : '✨'}</Text>
          <Text style={styles.doneTitle}>
            {queue.length === 0 ? '오늘 학습 완료!' : '세션 완료!'}
          </Text>
          <Text style={styles.doneSub}>
            {queue.length === 0
              ? `오늘 목표 ${dailyGoal}개를 모두 학습했어요.\n내일 또 만나요!`
              : `${doneCount}개 단어를 학습했어요.\n테스트로 실력을 확인해봐요!`}
          </Text>
          {queue.length > 0 && (
            <TouchableOpacity style={styles.retryBtn} onPress={loadSession}>
              <Text style={styles.retryBtnText}>다시 학습하기</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const currentWord = queue[currentIndex];

  if (!currentWord || queue.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.bigEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>오늘 학습 완료!</Text>
          <Text style={styles.doneSub}>
            오늘 목표 {dailyGoal}개를 모두 학습했어요.\n내일 또 만나요!
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadSession}>
            <Text style={styles.retryBtnText}>다시 학습하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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

const styles = StyleSheet.create({
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
  retryBtn: {
    marginTop: spacing['2xl'],
    backgroundColor: colors.sage[600],
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing['2xl'],
  },
  retryBtnText: {
    color: colors.paper.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
});

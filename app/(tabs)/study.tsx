import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { WORDS } from '../../data/words';
import { getSettings, getAllProgress, saveWordProgress, calcNextReview } from '../../src/storage';
import { WordProgress } from '../../src/types';
import WordCard from '../../components/WordCard';

export default function StudyScreen() {
  const [dailyGoal, setDailyGoal] = useState(10);
  const [queue, setQueue] = useState<typeof WORDS>([]);   // 오늘 학습할 단어 목록
  const [currentIndex, setCurrentIndex] = useState(0);
  const [doneCount, setDoneCount] = useState(0);          // 이 세션에서 완료한 수
  const [finished, setFinished] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSession();
    }, [])
  );

  async function loadSession() {
    const settings = await getSettings();
    setDailyGoal(settings.dailyGoal);

    const allProgress = await getAllProgress();
    const today = new Date().toISOString().split('T')[0];

    // 오늘 아직 학습 안 한 단어만 필터링
    const notYetToday = WORDS.filter((w) => {
      const p = allProgress[w.id];
      return !p || p.lastStudiedAt !== today;
    });

    // 목표 개수만큼 잘라서 큐에 담기
    const todayQueue = notYetToday.slice(0, settings.dailyGoal);

    setQueue(todayQueue);
    setCurrentIndex(0);
    setDoneCount(0);
    setFinished(todayQueue.length === 0);
  }

  async function handleKnow() {
    await markWord(true);
  }

  async function handleDontKnow() {
    await markWord(false);
  }

  async function markWord(correct: boolean) {
    const word = queue[currentIndex];
    const allProgress = await getAllProgress();
    const existing: WordProgress = allProgress[word.id] ?? {
      wordId: word.id,
      learned: false,
      correctCount: 0,
      wrongCount: 0,
      nextReviewDate: '',
      reviewInterval: 1,
      lastStudiedAt: '',
    };

    const updated = calcNextReview({ ...existing, learned: true }, correct);
    await saveWordProgress(updated);

    const next = currentIndex + 1;
    if (next >= queue.length) {
      setFinished(true);
    } else {
      setCurrentIndex(next);
    }
    setDoneCount((c) => c + 1);
  }

  // 오늘 학습할 단어가 없을 때 (처음부터 목표치 달성)
  if (finished && queue.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.bigEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>오늘 학습 완료!</Text>
          <Text style={styles.doneSub}>
            오늘 목표 {dailyGoal}개를 모두 학습했어요.{'\n'}내일 또 만나요!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 세션 완료
  if (finished) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.bigEmoji}>✨</Text>
          <Text style={styles.doneTitle}>세션 완료!</Text>
          <Text style={styles.doneSub}>
            {doneCount}개 단어를 학습했어요.{'\n'}테스트로 실력을 확인해봐요!
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadSession}>
            <Text style={styles.retryBtnText}>다시 학습하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentWord = queue[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>오늘의 학습</Text>
        <Text style={styles.headerSub}>
          {currentIndex + 1} / {queue.length}개
        </Text>
      </View>

      {/* 단어 카드 */}
      <View style={styles.cardArea}>
        <WordCard
          word={currentWord}
          index={currentIndex}
          total={queue.length}
        />
      </View>

      {/* 알았어요 / 몰랐어요 버튼 */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, styles.dontKnowBtn]} onPress={handleDontKnow}>
          <Text style={styles.dontKnowText}>몰랐어요</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.knowBtn]} onPress={handleKnow}>
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
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSub: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  dontKnowBtn: {
    backgroundColor: '#FEE2E2',
  },
  dontKnowText: {
    color: '#B91C1C',
    fontSize: 16,
    fontWeight: '700',
  },
  knowBtn: {
    backgroundColor: '#DCFCE7',
  },
  knowText: {
    color: '#15803D',
    fontSize: 16,
    fontWeight: '700',
  },
  tipText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#C4C9D4',
    paddingBottom: 16,
    paddingTop: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  bigEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  doneTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  doneSub: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryBtn: {
    marginTop: 28,
    backgroundColor: '#4A90D9',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

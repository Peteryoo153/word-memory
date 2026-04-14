import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Modal, Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, saveSettings } from '../../src/storage';
import { getActiveWordbook, getProgress, getTodayLearnedCount, getDueWordIds } from '../../src/storage/wordbookStorage';
import { colors, fontSize, fontWeight, fontFamily, spacing, radius, lineHeight } from '../../src/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [dailyGoal, setDailyGoal]       = useState(10);
  const [learnedCount, setLearnedCount] = useState(0);
  const [reviewCount, setReviewCount]   = useState(0);
  const [bookName, setBookName]         = useState('');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [tempGoal, setTempGoal]         = useState(10);

  useFocusEffect(
    useCallback(() => { loadData(); }, [])
  );

  async function loadData() {
    const settings = await getSettings();
    setDailyGoal(settings.dailyGoal);
    setTempGoal(settings.dailyGoal);

    const book = await getActiveWordbook();
    if (!book) {
      setLearnedCount(0);
      setReviewCount(0);
      setBookName('');
      return;
    }
    setBookName(book.name);
    const progress = await getProgress(book.id);
    setLearnedCount(getTodayLearnedCount(progress));
    setReviewCount(getDueWordIds(progress).length);
  }

  async function handleSaveGoal() {
    await saveSettings({ dailyGoal: tempGoal });
    setDailyGoal(tempGoal);
    setShowGoalModal(false);
  }

  function adjustGoal(delta: number) {
    setTempGoal((prev) => Math.max(5, prev + delta));
  }

  const progress = Math.min(learnedCount / dailyGoal, 1);
  const isDone   = learnedCount >= dailyGoal;

  return (
    <SafeAreaView style={styles.container}>

      {/* ── 헤더 ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>단어암기장</Text>
          <Text style={styles.greeting}>
            {isDone ? '오늘 목표 완료! 🎉' : '오늘도 단어를 외워봐요'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.goalChip}
          onPress={() => { setTempGoal(dailyGoal); setShowGoalModal(true); }}
        >
          <Ionicons name="flag-outline" size={13} color={colors.sage[600]} />
          <Text style={styles.goalChipText}>목표 {dailyGoal}개</Text>
        </TouchableOpacity>
      </View>

      {/* ── 오늘의 진행 카드 ── */}
      <View style={styles.progressCard}>
        <View style={styles.progressCardTop}>
          <View>
            <Text style={styles.progressLabel}>오늘의 학습</Text>
            <Text style={styles.progressCount}>
              <Text style={styles.progressCountBig}>{learnedCount}</Text>
              <Text style={styles.progressCountTotal}> / {dailyGoal}</Text>
            </Text>
          </View>
          <View style={[styles.progressCircle, isDone && styles.progressCircleDone]}>
            <Ionicons
              name={isDone ? 'checkmark' : 'book-outline'}
              size={26}
              color={isDone ? colors.paper.white : colors.sage[600]}
            />
          </View>
        </View>

        {/* 진행 바 */}
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
        </View>

        <Text style={styles.barCaption}>
          {isDone
            ? '오늘 목표를 모두 채웠어요!'
            : `${dailyGoal - learnedCount}개 남았어요`}
        </Text>
      </View>

      {/* ── 단어장 이름 표시 ── */}
      {bookName ? (
        <TouchableOpacity
          style={styles.bookChip}
          onPress={() => router.push('/wordbook/list')}
        >
          <Ionicons name="library-outline" size={14} color={colors.sage[500]} />
          <Text style={styles.bookChipText} numberOfLines={1}>{bookName}</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.sage[400]} />
        </TouchableOpacity>
      ) : null}

      {/* ── 복습 알림 카드 ── */}
      {reviewCount > 0 && (
        <TouchableOpacity
          style={styles.reviewCard}
          onPress={() => router.push('/(tabs)/test')}
          activeOpacity={0.85}
        >
          <View style={styles.reviewLeft}>
            <View style={styles.reviewBadge}>
              <Text style={styles.reviewBadgeText}>{reviewCount}</Text>
            </View>
            <View>
              <Text style={styles.reviewTitle}>복습할 단어가 있어요</Text>
              <Text style={styles.reviewSub}>잊기 전에 다시 확인해봐요</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.terra[500]} />
        </TouchableOpacity>
      )}

      {/* ── 하단 액션 ── */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => router.push('/(tabs)/study')}
          activeOpacity={0.88}
        >
          <Ionicons name="play" size={20} color={colors.paper.white} />
          <Text style={styles.startBtnText}>학습 시작하기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.listBtn}
          onPress={() => router.push('/wordbook/list')}
        >
          <Ionicons name="albums-outline" size={18} color={colors.sage[600]} />
          <Text style={styles.listBtnText}>단어장 목록</Text>
        </TouchableOpacity>
      </View>

      {/* ── 목표 설정 모달 ── */}
      <Modal visible={showGoalModal} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowGoalModal(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>하루 목표 설정</Text>
            <Text style={styles.modalSub}>5개 단위로 조절할 수 있어요</Text>

            <View style={styles.goalRow}>
              <TouchableOpacity style={styles.goalBtn} onPress={() => adjustGoal(-5)}>
                <Text style={styles.goalBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.goalValue}>{tempGoal}</Text>
              <TouchableOpacity style={styles.goalBtn} onPress={() => adjustGoal(5)}>
                <Text style={styles.goalBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.goalUnit}>개 단어</Text>
            <Text style={styles.goalMin}>최소 5개</Text>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoal}>
              <Text style={styles.saveBtnText}>저장</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper.bg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },

  // ── 헤더
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  appTitle: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.extrabold,
    color: colors.paper[900],
    fontFamily: fontFamily.serif,
    letterSpacing: -0.5,
  },
  greeting: {
    fontSize: fontSize.bodySmall,
    color: colors.paper[500],
    marginTop: 4,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.sage[50],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.sage[200],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: 4,
  },
  goalChipText: {
    fontSize: fontSize.label,
    color: colors.sage[700],
    fontWeight: fontWeight.semibold,
  },

  // ── 진행 카드
  progressCard: {
    backgroundColor: colors.sage[600],
    borderRadius: radius['2xl'],
    padding: spacing['2xl'],
    marginBottom: spacing.md,
    shadowColor: colors.sage[800],
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 8,
  },
  progressCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  progressLabel: {
    fontSize: fontSize.label,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  progressCount: {
    lineHeight: fontSize.h1 * 1.1,
  },
  progressCountBig: {
    fontSize: 44,
    fontWeight: fontWeight.extrabold,
    color: colors.paper.white,
  },
  progressCountTotal: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.medium,
    color: 'rgba(255,255,255,0.6)',
  },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleDone: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  barBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.paper.white,
    borderRadius: 2,
  },
  barCaption: {
    fontSize: fontSize.caption,
    color: 'rgba(255,255,255,0.6)',
  },

  // ── 단어장 칩
  bookChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.paper.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.paper[200],
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    marginBottom: spacing.md,
    maxWidth: '80%',
  },
  bookChipText: {
    fontSize: fontSize.caption,
    color: colors.paper[600],
    fontWeight: fontWeight.medium,
  },

  // ── 복습 카드
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.terra[100],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.terra[200],
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  reviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  reviewBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.terra[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewBadgeText: {
    color: colors.paper.white,
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.bold,
  },
  reviewTitle: {
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.semibold,
    color: colors.terra[700],
  },
  reviewSub: {
    fontSize: fontSize.caption,
    color: colors.terra[500],
    marginTop: 2,
  },

  // ── 하단 액션
  actions: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  startBtn: {
    flexDirection: 'row',
    backgroundColor: colors.sage[600],
    borderRadius: radius['2xl'],
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: colors.sage[800],
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },
  startBtnText: {
    color: colors.paper.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.2,
  },
  listBtn: {
    flexDirection: 'row',
    borderRadius: radius['2xl'],
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.paper.white,
    borderWidth: 1,
    borderColor: colors.paper[200],
  },
  listBtnText: {
    color: colors.sage[600],
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },

  // ── 모달
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,13,26,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: colors.paper.white,
    borderRadius: radius['2xl'],
    padding: spacing['2xl'],
    width: 300,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 40,
    elevation: 20,
  },
  modalTitle: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    color: colors.paper[900],
    marginBottom: spacing.xs,
  },
  modalSub: {
    fontSize: fontSize.caption,
    color: colors.paper[400],
    marginBottom: spacing['2xl'],
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xs,
  },
  goalBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.paper.bg,
    borderWidth: 1,
    borderColor: colors.paper[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalBtnText: {
    fontSize: 24,
    fontWeight: fontWeight.semibold,
    color: colors.paper[700],
  },
  goalValue: {
    fontSize: 48,
    fontWeight: fontWeight.extrabold,
    color: colors.sage[600],
    minWidth: 80,
    textAlign: 'center',
  },
  goalUnit: {
    fontSize: fontSize.bodySmall,
    color: colors.paper[500],
    marginBottom: spacing.xs,
  },
  goalMin: {
    fontSize: fontSize.caption,
    color: colors.paper[300],
    marginBottom: spacing['2xl'],
  },
  saveBtn: {
    backgroundColor: colors.sage[600],
    borderRadius: radius.lg,
    paddingVertical: 15,
    paddingHorizontal: 48,
    shadowColor: colors.sage[800],
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  saveBtnText: {
    color: colors.paper.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
});

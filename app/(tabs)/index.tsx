import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, getStudyPlan } from '../../src/storage';
import { StudyPlan } from '../../src/types';
import { getActiveWordbook, getProgress, getTodayLearnedCount, getDueWordIds } from '../../src/storage/wordbookStorage';
import { colors, fontSize, fontWeight, fontFamily, spacing, radius } from '../../src/theme';

const DAY_LABELS: Record<string, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
};
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const today = new Date();
const todayKey = DAY_ORDER[today.getDay() === 0 ? 6 : today.getDay() - 1];

/** 이번 주 각 요일의 날짜(YYYY-MM-DD) 반환 */
function getThisWeekDates(): Record<string, string> {
  const now = new Date();
  const dow = now.getDay(); // 0=sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const result: Record<string, string> = {};
  DAY_ORDER.forEach((key, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    result[key] = d.toISOString().split('T')[0];
  });
  return result;
}

const THIS_WEEK_DATES = getThisWeekDates();

export default function HomeScreen() {
  const router = useRouter();
  const [dailyGoal, setDailyGoal]             = useState(10);
  const [learnedCount, setLearnedCount]       = useState(0);
  const [reviewCount, setReviewCount]         = useState(0);
  const [plan, setPlan]                       = useState<StudyPlan | null>(null);
  const [dailyLearnedMap, setDailyLearnedMap] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => { loadData(); }, [])
  );

  async function loadData() {
    const [settings, book, studyPlan] = await Promise.all([
      getSettings(),
      getActiveWordbook(),
      getStudyPlan(),
    ]);
    // 플랜의 dailyGoal을 우선 사용, 없으면 settings fallback
    setDailyGoal(studyPlan?.dailyGoal ?? settings.dailyGoal);
    setPlan(studyPlan);

    if (!book) {
      setLearnedCount(0);
      setReviewCount(0);
      setDailyLearnedMap({});
      return;
    }
    const progress = await getProgress(book.id);
    const goal = studyPlan?.dailyGoal ?? settings.dailyGoal;
    setLearnedCount(Math.min(getTodayLearnedCount(progress), goal));
    setReviewCount(getDueWordIds(progress).length);

    // 각 요일의 실제 학습 단어 수 계산
    const learnedMap: Record<string, number> = {};
    DAY_ORDER.forEach((key) => {
      const dateStr = THIS_WEEK_DATES[key];
      learnedMap[key] = Object.values(progress.ebbinghausData)
        .filter((e) => e.lastStudiedAt === dateStr).length;
    });
    setDailyLearnedMap(learnedMap);
  }

  const progress = Math.min(learnedCount / dailyGoal, 1);
  const isDone   = learnedCount >= dailyGoal;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >

      {/* ── 헤더 ── */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.appTitle}>단어암기장</Text>
          <Text style={styles.greeting}>
            {isDone ? '오늘 목표 완료! 🎉' : '오늘도 단어를 외워봐요'}
          </Text>
        </View>
      </View>

      {/* ── 오늘의 진행 카드 ── */}
      <TouchableOpacity
        style={styles.progressCard}
        onPress={() => {
          if (!plan || plan.days.length === 0) {
            router.push('/plan' as any);
          } else {
            router.push('/(tabs)/study');
          }
        }}
        activeOpacity={0.88}
      >
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

        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.barCaption}>
          {!plan || plan.days.length === 0
            ? '학습설정을 먼저 해주세요!'
            : isDone
              ? '오늘 목표를 모두 채웠어요!'
              : `${dailyGoal - learnedCount}개 남았어요 · 탭해서 학습 시작`}
        </Text>
      </TouchableOpacity>

      {/* ── 학습 플랜 대시보드 ── */}
      {plan && plan.days.length > 0 && (
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <View style={styles.planTitleRow}>
              <Ionicons name="calendar-outline" size={15} color={colors.sage[600]} />
              <Text style={styles.planTitle}>이번 주 학습 플랜</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/plan' as any)} style={styles.planEditBtn}>
              <Text style={styles.planEditTxt}>편집</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.planDays}>
            {DAY_ORDER.map((key) => {
              const isStudyDay = plan.days.includes(key);
              const isToday    = key === todayKey;
              const dateStr    = THIS_WEEK_DATES[key];
              const testScore    = plan.dailyScores?.[dateStr];
              const hasScore     = testScore !== undefined;
              const learnedOnDay = dailyLearnedMap[key] ?? 0;
              const hasLearned   = learnedOnDay > 0;
              const isDone       = hasScore || hasLearned;
              // 표시값: 테스트 점수 > 실제 학습 수 (미학습은 숫자 없이 비활성 표시)
              const displayCount = hasScore ? testScore : learnedOnDay;
              return (
                <View key={key} style={styles.planDayCol}>
                  <Text style={[
                    styles.planDayLabel,
                    isToday && styles.planDayLabelToday,
                    isStudyDay && !isDone && styles.planDayLabelInactive,
                  ]}>
                    {DAY_LABELS[key]}
                  </Text>
                  <View style={[
                    styles.planDayBox,
                    isStudyDay && !isDone && styles.planDayBoxInactive,
                    isStudyDay && isDone && styles.planDayBoxStudy,
                    isToday && isStudyDay && !isDone && styles.planDayBoxTodayInactive,
                    hasScore && styles.planDayBoxDone,
                    !hasScore && hasLearned && styles.planDayBoxLearned,
                  ]}>
                    {isStudyDay ? (
                      isDone ? (
                        <Text style={[
                          styles.planDayCount,
                          hasScore && styles.planDayCountDone,
                          !hasScore && hasLearned && styles.planDayCountLearned,
                        ]}>
                          {displayCount}
                        </Text>
                      ) : (
                        <Text style={styles.planDayDash}>—</Text>
                      )
                    ) : (
                      <Text style={styles.planDayDash}>—</Text>
                    )}
                  </View>
                  {isStudyDay && isDone && (
                    <Text style={[styles.planDayUnit]}>
                      {hasScore ? '점' : '개'}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          {plan.alarmEnabled && (
            <View style={styles.planAlarm}>
              <Ionicons name="alarm-outline" size={13} color={colors.paper[400]} />
              <Text style={styles.planAlarmTxt}>매일 {plan.alarmTime} 알람</Text>
            </View>
          )}
        </View>
      )}

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
          style={styles.listBtn}
          onPress={() => router.push('/wordbook/list')}
          activeOpacity={0.85}
        >
          <Ionicons name="albums-outline" size={18} color={colors.sage[600]} />
          <Text style={styles.listBtnText}>단어장 목록</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.planBtn}
          onPress={() => router.push('/plan' as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="options-outline" size={18} color={colors.paper[600]} />
          <Text style={styles.planBtnText}>학습 플랜 설정</Text>
        </TouchableOpacity>
      </View>

      </ScrollView>

    </SafeAreaView>
  );
}

const CARD_RADIUS = radius.xl; // 24 — 모든 카드/버튼 통일

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper.bg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },

  // ── 헤더
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  headerText: { flex: 1 },
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
  // ── 진행 카드
  progressCard: {
    backgroundColor: colors.sage[600],
    borderRadius: CARD_RADIUS,
    padding: 20,
    marginBottom: 14,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
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
  progressCount: { lineHeight: 52 },
  progressCountBig: {
    fontSize: 44,
    fontWeight: fontWeight.extrabold,
    color: colors.paper.white,
    lineHeight: 52,
  },
  progressCountTotal: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.medium,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 52,
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
  barCaption: { fontSize: fontSize.caption, color: 'rgba(255,255,255,0.6)' },

  // ── 플랜 대시보드
  planCard: {
    backgroundColor: colors.paper.white,
    borderRadius: CARD_RADIUS,
    borderWidth: 0.5,
    borderColor: colors.paper[200],
    padding: spacing.lg,
    marginBottom: 14,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planTitle: {
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.semibold,
    color: colors.paper[700],
  },
  planEditBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  planEditTxt: {
    fontSize: fontSize.caption,
    color: colors.sage[500],
    fontWeight: fontWeight.semibold,
  },
  planDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  planDayCol: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  planDayLabel: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    color: colors.paper[400],
  },
  planDayLabelToday: { color: colors.sage[600], fontWeight: fontWeight.bold },
  planDayLabelInactive: { color: colors.paper[300] },
  planDayBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.paper.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.paper[100],
  },
  planDayBoxInactive: {
    backgroundColor: colors.paper.bg,
    borderColor: colors.paper[100],
    opacity: 0.45,
  },
  planDayBoxTodayInactive: {
    backgroundColor: colors.sage[50],
    borderColor: colors.sage[200],
    borderStyle: 'dashed' as const,
    opacity: 0.7,
  },
  planDayBoxStudy: {
    backgroundColor: colors.sage[50],
    borderColor: colors.sage[200],
  },
  planDayBoxDone: {
    backgroundColor: colors.terra[100],
    borderColor: colors.terra[200],
  },
  planDayBoxLearned: {
    backgroundColor: colors.sage[100],
    borderColor: colors.sage[300],
  },
  planDayCount: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    color: colors.sage[600],
  },
  planDayCountDone: { color: colors.terra[600] },
  planDayCountLearned: { color: colors.sage[700] },
  planDayDash: { fontSize: 12, color: colors.paper[200] },
  planDayUnit: {
    fontSize: 10,
    color: colors.sage[400],
    fontWeight: fontWeight.medium,
  },
  planAlarm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  planAlarmTxt: {
    fontSize: fontSize.caption,
    color: colors.paper[400],
  },

  // ── 복습 카드
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.terra[100],
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: colors.terra[200],
    padding: 20,
    marginBottom: 14,
    width: '100%',
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
    gap: 12,
    marginTop: 4,
    paddingBottom: 40,
  },
  listBtn: {
    flexDirection: 'row',
    borderRadius: CARD_RADIUS,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.paper.white,
    borderWidth: 1,
    borderColor: colors.paper[200],
    shadowColor: colors.sage[800],
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  listBtnText: {
    color: colors.sage[600],
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  planBtn: {
    flexDirection: 'row',
    borderRadius: CARD_RADIUS,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.paper.white,
    borderWidth: 1,
    borderColor: colors.paper[100],
  },
  planBtnText: {
    color: colors.paper[600],
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },

});

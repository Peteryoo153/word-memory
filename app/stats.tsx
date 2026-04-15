import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  fontSize, fontWeight, spacing, radius,
  useColors, ColorPalette,
} from '../src/theme';
import { getAllWordbooks, getProgress } from '../src/storage/wordbookStorage';
import {
  computeOverallStats, computeRecentDaily, computeWrongWords,
  computeWordbookSummaries,
  OverallStats, DailyCount, WrongWord, WordbookSummary,
} from '../src/stats';

const RECENT_DAYS = 7;
const TOP_WRONG = 10;

export default function StatsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  const [overall, setOverall] = useState<OverallStats | null>(null);
  const [daily, setDaily] = useState<DailyCount[]>([]);
  const [wrongWords, setWrongWords] = useState<WrongWord[]>([]);
  const [summaries, setSummaries] = useState<WordbookSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  async function loadStats() {
    const books = await getAllWordbooks();
    const progresses = await Promise.all(books.map((b) => getProgress(b.id)));
    setOverall(computeOverallStats(progresses));
    setDaily(computeRecentDaily(progresses, RECENT_DAYS));
    setWrongWords(computeWrongWords(books, progresses, TOP_WRONG));
    setSummaries(computeWordbookSummaries(books, progresses));
  }

  const maxDaily = Math.max(1, ...daily.map((d) => d.count));
  const accuracyPct = overall ? Math.round(overall.accuracy * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.paper[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>학습 통계</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 핵심 지표 ── */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
            <Text style={styles.summaryLabelOn}>정답률</Text>
            <Text style={styles.summaryValueOn}>{accuracyPct}%</Text>
            <Text style={styles.summarySubOn}>
              {overall?.totalCorrect ?? 0} / {(overall?.totalCorrect ?? 0) + (overall?.totalWrong ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>연속 학습</Text>
            <Text style={styles.summaryValue}>{overall?.currentStreak ?? 0}<Text style={styles.summaryUnit}>일</Text></Text>
            <Text style={styles.summarySub}>최장 {overall?.longestStreak ?? 0}일</Text>
          </View>
        </View>

        <View style={styles.miniRow}>
          <View style={styles.miniCard}>
            <Ionicons name="book-outline" size={16} color={colors.sage[600]} />
            <Text style={styles.miniValue}>{overall?.totalLearnedWords ?? 0}</Text>
            <Text style={styles.miniLabel}>학습 단어</Text>
          </View>
          <View style={styles.miniCard}>
            <Ionicons name="calendar-outline" size={16} color={colors.sage[600]} />
            <Text style={styles.miniValue}>{overall?.studyDays ?? 0}</Text>
            <Text style={styles.miniLabel}>학습일</Text>
          </View>
          <View style={styles.miniCard}>
            <Ionicons name="alarm-outline" size={16} color={colors.terra[500]} />
            <Text style={[styles.miniValue, { color: colors.terra[500] }]}>{overall?.dueCount ?? 0}</Text>
            <Text style={styles.miniLabel}>복습 대기</Text>
          </View>
        </View>

        {/* ── 주간 학습 차트 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최근 7일</Text>
          <View style={styles.chartCard}>
            <View style={styles.chartRow}>
              {daily.map((d) => {
                const heightRatio = d.count / maxDaily;
                const isToday = d.date === daily[daily.length - 1].date;
                return (
                  <View key={d.date} style={styles.chartCol}>
                    <Text style={styles.chartCount}>{d.count > 0 ? d.count : ''}</Text>
                    <View style={styles.chartBarTrack}>
                      <View
                        style={[
                          styles.chartBarFill,
                          { height: `${Math.max(heightRatio * 100, d.count > 0 ? 8 : 0)}%` },
                          isToday && styles.chartBarFillToday,
                        ]}
                      />
                    </View>
                    <Text style={[styles.chartDay, isToday && styles.chartDayToday]}>
                      {d.dayLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── 자주 틀리는 단어 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>자주 틀리는 단어</Text>
          {wrongWords.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>아직 틀린 단어가 없어요</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {wrongWords.map((w, i) => (
                <View
                  key={`${w.wordbookId}:${w.wordId}`}
                  style={[styles.wrongRow, i < wrongWords.length - 1 && styles.rowDivider]}
                >
                  <View style={styles.wrongRank}>
                    <Text style={styles.wrongRankText}>{i + 1}</Text>
                  </View>
                  <View style={styles.wrongInfo}>
                    <Text style={styles.wrongWord}>{w.word}</Text>
                    <Text style={styles.wrongMeaning} numberOfLines={1}>{w.meaning}</Text>
                  </View>
                  <View style={styles.wrongStats}>
                    <Text style={styles.wrongCount}>×{w.wrongCount}</Text>
                    <Text style={styles.wrongCorrect}>○{w.correctCount}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── 단어장별 진도 ── */}
        {summaries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>단어장별 진도</Text>
            <View style={styles.listCard}>
              {summaries.map((s, i) => (
                <View
                  key={s.id}
                  style={[styles.bookRow, i < summaries.length - 1 && styles.rowDivider]}
                >
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.bookSub}>
                      {s.learnedWords} / {s.totalWords} · 정답률 {Math.round(s.accuracy * 100)}%
                    </Text>
                    <View style={styles.bookBarBg}>
                      <View style={[styles.bookBarFill, { width: `${s.ratio * 100}%` }]} />
                    </View>
                  </View>
                  <Text style={styles.bookPct}>{Math.round(s.ratio * 100)}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.paper.bg },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.paper[200],
      backgroundColor: colors.paper.white,
    },
    backBtn: { padding: spacing.xs, marginRight: spacing.sm },
    headerTitle: {
      flex: 1,
      fontSize: fontSize.h2,
      fontWeight: fontWeight.semibold,
      color: colors.paper[900],
    },
    placeholder: { width: 36 },

    scrollContent: { padding: spacing.lg, gap: spacing.lg },

    section: { gap: spacing.sm },
    sectionTitle: {
      fontSize: fontSize.label,
      fontWeight: fontWeight.semibold,
      color: colors.paper[500],
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginLeft: spacing.xs,
    },

    // 핵심 카드
    summaryRow: { flexDirection: 'row', gap: spacing.md },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.paper.white,
      borderRadius: radius.xl,
      borderWidth: 0.5,
      borderColor: colors.paper[200],
      padding: spacing.lg,
      gap: 4,
    },
    summaryCardPrimary: {
      backgroundColor: colors.sage[600],
      borderColor: colors.sage[600],
    },
    summaryLabel: {
      fontSize: fontSize.caption,
      color: colors.paper[500],
      fontWeight: fontWeight.medium,
    },
    summaryLabelOn: {
      fontSize: fontSize.caption,
      color: 'rgba(255,255,255,0.75)',
      fontWeight: fontWeight.medium,
    },
    summaryValue: {
      fontSize: 32,
      fontWeight: fontWeight.extrabold,
      color: colors.paper[900],
    },
    summaryValueOn: {
      fontSize: 32,
      fontWeight: fontWeight.extrabold,
      color: colors.paper.white,
    },
    summaryUnit: {
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: colors.paper[500],
    },
    summarySub: {
      fontSize: fontSize.caption,
      color: colors.paper[400],
    },
    summarySubOn: {
      fontSize: fontSize.caption,
      color: 'rgba(255,255,255,0.7)',
    },

    // 미니 카드 3개
    miniRow: { flexDirection: 'row', gap: spacing.sm },
    miniCard: {
      flex: 1,
      backgroundColor: colors.paper.white,
      borderRadius: radius.lg,
      borderWidth: 0.5,
      borderColor: colors.paper[200],
      padding: spacing.md,
      alignItems: 'center',
      gap: 4,
    },
    miniValue: {
      fontSize: fontSize.h2,
      fontWeight: fontWeight.bold,
      color: colors.paper[900],
    },
    miniLabel: {
      fontSize: fontSize.caption - 1,
      color: colors.paper[500],
    },

    // 차트
    chartCard: {
      backgroundColor: colors.paper.white,
      borderRadius: radius.xl,
      borderWidth: 0.5,
      borderColor: colors.paper[200],
      padding: spacing.lg,
      paddingTop: spacing.lg + 4,
    },
    chartRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 140,
      gap: 6,
    },
    chartCol: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      height: '100%',
      justifyContent: 'flex-end',
    },
    chartCount: {
      fontSize: fontSize.caption - 2,
      color: colors.paper[500],
      fontWeight: fontWeight.semibold,
      height: 14,
    },
    chartBarTrack: {
      width: '100%',
      flex: 1,
      backgroundColor: colors.paper[100],
      borderRadius: 4,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    chartBarFill: {
      width: '100%',
      backgroundColor: colors.sage[400],
      borderRadius: 4,
    },
    chartBarFillToday: {
      backgroundColor: colors.sage[600],
    },
    chartDay: {
      fontSize: fontSize.caption - 1,
      color: colors.paper[400],
      fontWeight: fontWeight.medium,
    },
    chartDayToday: {
      color: colors.sage[600],
      fontWeight: fontWeight.bold,
    },

    // 리스트 카드 공통
    listCard: {
      backgroundColor: colors.paper.white,
      borderRadius: radius.xl,
      borderWidth: 0.5,
      borderColor: colors.paper[200],
      overflow: 'hidden',
    },
    rowDivider: {
      borderBottomWidth: 0.5,
      borderBottomColor: colors.paper[100],
    },

    emptyCard: {
      backgroundColor: colors.paper.white,
      borderRadius: radius.xl,
      borderWidth: 0.5,
      borderColor: colors.paper[200],
      paddingVertical: spacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: fontSize.bodySmall,
      color: colors.paper[400],
    },

    // 자주 틀리는 단어 행
    wrongRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    wrongRank: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.terra[100],
      justifyContent: 'center',
      alignItems: 'center',
    },
    wrongRankText: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: colors.terra[500],
    },
    wrongInfo: { flex: 1 },
    wrongWord: {
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: colors.paper[900],
    },
    wrongMeaning: {
      fontSize: fontSize.caption,
      color: colors.paper[500],
      marginTop: 2,
    },
    wrongStats: {
      alignItems: 'flex-end',
      gap: 2,
    },
    wrongCount: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      color: colors.terra[500],
    },
    wrongCorrect: {
      fontSize: fontSize.caption - 1,
      color: colors.paper[400],
    },

    // 단어장별
    bookRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    bookInfo: { flex: 1, gap: 4 },
    bookName: {
      fontSize: fontSize.bodySmall,
      fontWeight: fontWeight.semibold,
      color: colors.paper[900],
    },
    bookSub: {
      fontSize: fontSize.caption - 1,
      color: colors.paper[500],
    },
    bookBarBg: {
      height: 4,
      backgroundColor: colors.paper[100],
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: 4,
    },
    bookBarFill: {
      height: '100%',
      backgroundColor: colors.sage[500],
      borderRadius: 2,
    },
    bookPct: {
      fontSize: fontSize.bodySmall,
      fontWeight: fontWeight.bold,
      color: colors.sage[600],
      minWidth: 40,
      textAlign: 'right',
    },
  });
}

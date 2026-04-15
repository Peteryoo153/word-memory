import { useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, ScrollView, StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllWordbooks, getActiveWordbookId, getProgress, getTodayLearnedCount,
} from '../../src/storage/wordbookStorage';
import { Wordbook, WordbookProgress } from '../../src/types/wordbook';
import { fontSize, fontWeight, spacing, radius, lineHeight, letterSpacing, useColors, ColorPalette } from '../../src/theme';

interface BookWithMeta {
  book: Wordbook;
  progress: WordbookProgress;
  learnedCount: number;
  todayCount: number;
  isActive: boolean;
}

export default function WordbookListScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [items, setItems] = useState<BookWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    setLoading(true);
    const [books, activeId] = await Promise.all([
      getAllWordbooks(),
      getActiveWordbookId(),
    ]);

    const withMeta = await Promise.all(
      books.map(async (book) => {
        const progress = await getProgress(book.id);
        return {
          book,
          progress,
          learnedCount: progress.learnedWordIds.length,
          todayCount:   getTodayLearnedCount(progress),
          isActive:     book.id === activeId,
        };
      })
    );

    setItems(withMeta);
    setLoading(false);
  }

  function formatLastStudied(dateStr: string): string {
    if (!dateStr) return '아직 학습 안 함';
    const date = new Date(dateStr);
    const today = new Date();
    const diff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return '오늘';
    if (diff === 1) return '어제';
    if (diff < 7) return `${diff}일 전`;
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  }

  const sourceLabel: Record<string, string> = {
    builtin: '내장',
    custom:  '직접 만들기',
    shared:  '공유',
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.paper[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>내 단어장</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/wordbook/add')}
        >
          <Ionicons name="add" size={24} color={colors.sage[600]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>불러오는 중...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>단어장이 없어요</Text>
            <Text style={styles.emptyText}>우상단 [+]로 단어장을 추가해보세요</Text>
          </View>
        ) : (
          items.map(({ book, progress, learnedCount, isActive }) => {
            const progressRatio = book.totalWords > 0
              ? learnedCount / book.totalWords
              : 0;
            const progressPct = Math.round(progressRatio * 100);

            return (
              <TouchableOpacity
                key={book.id}
                style={[styles.card, isActive && styles.cardActive]}
                onPress={() => router.push(`/wordbook/${book.id}`)}
                activeOpacity={0.8}
              >
                {/* 상단 행: 이름 + 뱃지 */}
                <View style={styles.cardTop}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardName} numberOfLines={1}>{book.name}</Text>
                    {isActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>학습 중</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.sourceTag}>
                    <Text style={styles.sourceTagText}>{sourceLabel[book.source] ?? book.source}</Text>
                  </View>
                </View>

                {book.description ? (
                  <Text style={styles.cardDesc} numberOfLines={1}>{book.description}</Text>
                ) : null}

                {/* 진행률 */}
                <View style={styles.progressRow}>
                  <Text style={styles.progressText}>
                    {learnedCount} / {book.totalWords} 단어
                  </Text>
                  <Text style={styles.progressPct}>{progressPct}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progressPct}%` },
                      isActive && styles.progressBarActive,
                    ]}
                  />
                </View>

                {/* 하단: 마지막 학습일 */}
                <Text style={styles.lastStudied}>
                  마지막 학습: {formatLastStudied(progress.lastStudiedAt)}
                </Text>

                {/* 활성 단어장 오른쪽 화살표 */}
                <View style={styles.chevron}>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={isActive ? colors.sage[400] : colors.paper[300]}
                  />
                </View>
              </TouchableOpacity>
            );
          })
        )}
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.sage[50],
    justifyContent: 'center',
    alignItems: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.md },

  // 단어장 카드
  card: {
    backgroundColor: colors.paper.white,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: colors.paper[200],
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    position: 'relative',
  },
  cardActive: {
    borderColor: colors.sage[400],
    borderWidth: 1.5,
    backgroundColor: colors.sage[50],
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  cardName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.paper[900],
    flexShrink: 1,
  },
  activeBadge: {
    backgroundColor: colors.sage[600],
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colors.paper.white,
    letterSpacing: letterSpacing.label * 0.5,
  },
  sourceTag: {
    backgroundColor: colors.paper[50],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.paper[200],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  sourceTagText: {
    fontSize: fontSize.label,
    color: colors.paper[500],
    fontWeight: fontWeight.medium,
  },

  cardDesc: {
    fontSize: fontSize.caption,
    color: colors.paper[500],
    marginBottom: spacing.md,
    lineHeight: fontSize.caption * lineHeight.normal,
  },

  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressText: {
    fontSize: fontSize.caption,
    color: colors.paper[600],
    fontWeight: fontWeight.medium,
  },
  progressPct: {
    fontSize: fontSize.caption,
    color: colors.paper[400],
    fontWeight: fontWeight.medium,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: colors.paper[200],
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.paper[400],
    borderRadius: 2,
  },
  progressBarActive: {
    backgroundColor: colors.sage[600],
  },

  lastStudied: {
    fontSize: fontSize.caption - 1,
    color: colors.paper[400],
  },

  chevron: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
  },

  // 빈 상태
  empty: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing['3xl'],
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.semibold,
    color: colors.paper[700],
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.bodySmall,
    color: colors.paper[400],
    textAlign: 'center',
  },
  });
}

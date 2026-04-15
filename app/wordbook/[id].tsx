import { useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, ScrollView, StatusBar, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getWordbook, getProgress, switchActiveWordbook,
  deleteWordbook, getActiveWordbookId,
} from '../../src/storage/wordbookStorage';
import { Wordbook, WordbookProgress, WordbookWord } from '../../src/types/wordbook';
import { fontSize, fontWeight, spacing, radius, lineHeight, letterSpacing, useColors, ColorPalette } from '../../src/theme';

const sourceLabel: Record<string, string> = {
  builtin: '내장',
  custom: '직접 만들기',
  shared: '공유',
};

const partLabel: Record<string, string> = {
  noun: '명사', verb: '동사', adj: '형용사', adv: '부사',
};

export default function WordbookDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [book, setBook] = useState<Wordbook | null>(null);
  const [progress, setProgress] = useState<WordbookProgress | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  async function loadData() {
    const [b, activeId] = await Promise.all([
      getWordbook(id),
      getActiveWordbookId(),
    ]);
    if (!b) return;
    const p = await getProgress(b.id);
    setBook(b);
    setProgress(p);
    setIsActive(b.id === activeId);
  }

  async function handleSetActive() {
    if (!book) return;
    await switchActiveWordbook(book.id);
    setIsActive(true);
    Alert.alert('학습 단어장 변경', `'${book.name}'으로 학습 단어장이 변경됐어요.`);
  }

  async function handleDelete() {
    if (!book) return;
    Alert.alert(
      '단어장 삭제',
      `'${book.name}'을 삭제할까요?\n학습 기록도 함께 삭제됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteWordbook(book.id);
            if (result.ok) {
              router.back();
            } else {
              Alert.alert('삭제 불가', result.reason ?? '삭제할 수 없어요.');
            }
          },
        },
      ]
    );
  }

  if (!book || !progress) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>단어장을 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const learnedCount = progress.learnedWordIds.length;
  const progressRatio = book.totalWords > 0 ? learnedCount / book.totalWords : 0;
  const displayWords: WordbookWord[] = showAll ? book.words : book.words.slice(0, 20);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.paper[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{book.name}</Text>
        {book.source !== 'builtin' && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.semantic.error} />
          </TouchableOpacity>
        )}
        {book.source === 'builtin' && <View style={styles.deleteBtn} />}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 단어장 정보 카드 */}
        <View style={styles.infoCard}>
          <View style={styles.infoTop}>
            <View style={[styles.sourceTag, isActive && styles.sourceTagActive]}>
              <Text style={[styles.sourceTagText, isActive && styles.sourceTagActiveText]}>
                {isActive ? '학습 중' : sourceLabel[book.source] ?? book.source}
              </Text>
            </View>
          </View>

          <Text style={styles.bookName}>{book.name}</Text>
          {book.description ? (
            <Text style={styles.bookDesc}>{book.description}</Text>
          ) : null}

          {/* 진행률 */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{book.totalWords}</Text>
              <Text style={styles.statLabel}>전체 단어</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{learnedCount}</Text>
              <Text style={styles.statLabel}>학습 완료</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.sage[600] }]}>
                {Math.round(progressRatio * 100)}%
              </Text>
              <Text style={styles.statLabel}>진행률</Text>
            </View>
          </View>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
          </View>
        </View>

        {/* 학습 시작 버튼 */}
        {isActive ? (
          <View style={styles.activeNotice}>
            <Ionicons name="checkmark-circle" size={18} color={colors.sage[600]} />
            <Text style={styles.activeNoticeText}>현재 이 단어장으로 학습 중이에요</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.activateBtn} onPress={handleSetActive}>
            <Ionicons name="book-outline" size={18} color={colors.paper.white} />
            <Text style={styles.activateBtnText}>이 단어장으로 학습하기</Text>
          </TouchableOpacity>
        )}

        {/* 단어 목록 */}
        <Text style={styles.sectionTitle}>단어 목록</Text>
        <View style={styles.wordListCard}>
          {displayWords.map((w, i) => (
            <View
              key={w.id}
              style={[styles.wordRow, i < displayWords.length - 1 && styles.wordRowBorder]}
            >
              <View style={styles.wordLeft}>
                <Text style={styles.wordText}>{w.word}</Text>
                {w.partOfSpeech ? (
                  <Text style={styles.wordPos}>{partLabel[w.partOfSpeech] ?? w.partOfSpeech}</Text>
                ) : null}
              </View>
              <Text style={styles.wordMeaning} numberOfLines={1}>
                {w.meanings.join(' / ')}
              </Text>
              {progress.ebbinghausData[w.id]?.learned && (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={colors.sage[400]}
                  style={styles.learnedIcon}
                />
              )}
            </View>
          ))}
        </View>

        {book.words.length > 20 && !showAll && (
          <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAll(true)}>
            <Text style={styles.showMoreText}>
              전체 {book.totalWords}개 단어 보기
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.sage[600]} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: fontSize.body, color: colors.paper[400] },

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
  deleteBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 40 },

  infoCard: {
    backgroundColor: colors.paper.white,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: colors.paper[200],
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  infoTop: { flexDirection: 'row', marginBottom: spacing.sm },
  sourceTag: {
    backgroundColor: colors.paper[50],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.paper[200],
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  sourceTagActive: {
    backgroundColor: colors.sage[100],
    borderColor: colors.sage[400],
  },
  sourceTagText: { fontSize: fontSize.label, color: colors.paper[500], fontWeight: fontWeight.medium },
  sourceTagActiveText: { color: colors.sage[700] },

  bookName: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    color: colors.paper[900],
    marginBottom: spacing.xs,
  },
  bookDesc: {
    fontSize: fontSize.bodySmall,
    color: colors.paper[500],
    marginBottom: spacing.lg,
    lineHeight: fontSize.bodySmall * lineHeight.relaxed,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    color: colors.paper[900],
  },
  statLabel: {
    fontSize: fontSize.label,
    color: colors.paper[400],
    marginTop: spacing.xs,
    letterSpacing: letterSpacing.label * 0.5,
  },
  statDivider: { width: 0.5, backgroundColor: colors.paper[200], marginVertical: spacing.xs },

  progressBarBg: {
    height: 4,
    backgroundColor: colors.sage[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.sage[600],
    borderRadius: 2,
  },

  activeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.sage[50],
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.sage[300],
    padding: spacing.md,
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  activeNoticeText: {
    fontSize: fontSize.bodySmall,
    color: colors.sage[700],
    fontWeight: fontWeight.medium,
  },
  activateBtn: {
    flexDirection: 'row',
    backgroundColor: colors.sage[600],
    borderRadius: radius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  activateBtnText: {
    color: colors.paper.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },

  sectionTitle: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colors.paper[400],
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  wordListCard: {
    backgroundColor: colors.paper.white,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: colors.paper[200],
    overflow: 'hidden',
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  wordRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.paper[100],
  },
  wordLeft: { width: 120 },
  wordText: {
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.semibold,
    color: colors.paper[900],
  },
  wordPos: {
    fontSize: fontSize.label,
    color: colors.terra[500],
    marginTop: 2,
  },
  wordMeaning: {
    flex: 1,
    fontSize: fontSize.bodySmall,
    color: colors.paper[600],
  },
  learnedIcon: { marginLeft: spacing.xs },

  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  showMoreText: {
    fontSize: fontSize.bodySmall,
    color: colors.sage[600],
    fontWeight: fontWeight.medium,
  },
  });
}

import { useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, ScrollView, StatusBar, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllWordbooks, addWordbook, getActiveWordbookId, switchActiveWordbook,
} from '../../src/storage/wordbookStorage';
import { BUILTIN_CATEGORIES } from '../../src/data/builtinWordbooks';
import { Wordbook } from '../../src/types/wordbook';
import { fontSize, fontWeight, spacing, radius, lineHeight, useColors, ColorPalette } from '../../src/theme';

export default function AddWordbookScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadOwned();
    }, [])
  );

  async function loadOwned() {
    const books = await getAllWordbooks();
    setOwnedIds(new Set(books.map((b) => b.id)));
  }

  async function handleAdd(book: Wordbook) {
    setAdding(book.id);
    try {
      await addWordbook(book);

      const activeId = await getActiveWordbookId();
      if (!activeId) {
        await switchActiveWordbook(book.id);
      }

      setOwnedIds((prev) => new Set([...prev, book.id]));
      Alert.alert('추가 완료', `'${book.name}'을 내 단어장에 추가했어요!`);
    } finally {
      setAdding(null);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.paper[700]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>단어장 추가</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {BUILTIN_CATEGORIES.map((category) => (
          <View key={category.id}>
            {/* 카테고리 헤더 */}
            <Text style={styles.categoryTitle}>{category.label}</Text>

            {category.books.map((book) => {
              const owned = ownedIds.has(book.id);
              const isAdding = adding === book.id;

              return (
                <View key={book.id} style={styles.card}>
                  <View style={styles.cardLeft}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardName}>{book.name}</Text>
                      {owned && (
                        <View style={styles.ownedBadge}>
                          <Ionicons name="checkmark" size={11} color={colors.sage[600]} />
                          <Text style={styles.ownedBadgeText}>추가됨</Text>
                        </View>
                      )}
                    </View>
                    {book.description ? (
                      <Text style={styles.cardDesc} numberOfLines={2}>{book.description}</Text>
                    ) : null}
                    <Text style={styles.cardWordCount}>{book.totalWords}개 단어</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.addBtn, owned && styles.addBtnOwned]}
                    onPress={() => !owned && handleAdd(book)}
                    disabled={owned || isAdding}
                  >
                    {isAdding ? (
                      <Text style={styles.addBtnText}>추가 중...</Text>
                    ) : owned ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.sage[400]} />
                    ) : (
                      <Text style={styles.addBtnText}>추가</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}

        {/* 커스텀 단어장 안내 */}
        <Text style={[styles.categoryTitle, { marginTop: spacing.xl }]}>직접 만들기</Text>
        <View style={[styles.card, styles.customCard]}>
          <Ionicons name="construct-outline" size={32} color={colors.paper[300]} />
          <Text style={styles.customTitle}>준비 중이에요</Text>
          <Text style={styles.customDesc}>
            직접 단어를 입력해서{'\n'}
            나만의 단어장을 만드는 기능을 준비 중이에요
          </Text>
        </View>
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

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 40 },

  categoryTitle: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colors.paper[400],
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    marginLeft: spacing.xs,
  },

  card: {
    backgroundColor: colors.paper.white,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: colors.paper[200],
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardLeft: { flex: 1, marginRight: spacing.md },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  cardName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.paper[900],
    flexShrink: 1,
  },
  ownedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.sage[50],
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: colors.sage[300],
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  ownedBadgeText: {
    fontSize: fontSize.label,
    color: colors.sage[600],
    fontWeight: fontWeight.medium,
  },
  cardDesc: {
    fontSize: fontSize.caption,
    color: colors.paper[500],
    marginBottom: spacing.xs,
    lineHeight: fontSize.caption * lineHeight.relaxed,
  },
  cardWordCount: {
    fontSize: fontSize.caption,
    color: colors.paper[400],
    fontWeight: fontWeight.medium,
  },

  addBtn: {
    backgroundColor: colors.sage[600],
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    minWidth: 60,
    alignItems: 'center',
  },
  addBtnOwned: {
    backgroundColor: 'transparent',
  },
  addBtnText: {
    color: colors.paper.white,
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.medium,
  },

  customCard: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.sm,
  },
  customTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.paper[500],
  },
  customDesc: {
    fontSize: fontSize.caption,
    color: colors.paper[400],
    textAlign: 'center',
    lineHeight: fontSize.caption * lineHeight.relaxed,
  },
  });
}

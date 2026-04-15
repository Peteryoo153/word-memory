import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Word } from '../src/types';
import { speakWord, speakSentence } from '../src/tts';
import { fontSize, fontWeight, fontFamily, spacing, radius, lineHeight, letterSpacing, useColors, ColorPalette } from '../src/theme';
import { Label, ExampleBox } from '../src/components/ui';

const { width } = Dimensions.get('window');
const CARD_WIDTH  = width - 48;
const CARD_HEIGHT = 440;

interface Props {
  word: Word;
  index: number;
  total: number;
}

const partLabel: Record<string, string> = {
  noun: 'NOUN · 명사',
  verb: 'VERB · 동사',
  adj:  'ADJ · 형용사',
  adv:  'ADV · 부사',
};

export default function WordCard({ word, index, total }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [flipped, setFlipped] = useState(false);
  const rotate = useSharedValue(0);

  function handleFlip() {
    const next = flipped ? 0 : 1;
    rotate.value = withTiming(next, { duration: 380 });
    setFlipped(!flipped);
  }

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(rotate.value, [0, 1], [0, 90])}deg` }],
    opacity: interpolate(rotate.value, [0, 0.45, 1], [1, 0, 0]),
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(rotate.value, [0, 1], [-90, 0])}deg` }],
    opacity: interpolate(rotate.value, [0, 0.55, 1], [0, 0, 1]),
  }));

  return (
    <TouchableOpacity onPress={handleFlip} activeOpacity={0.97}>
      <View style={styles.cardWrapper}>

        {/* ── 앞면 ── */}
        <Animated.View style={[styles.card, styles.front, frontStyle]}>
          {/* 상단 카운터 + 품사 */}
          <View style={styles.frontTopRow}>
            <Label
              text={partLabel[word.partOfSpeech] ?? word.partOfSpeech}
              style={styles.partLabel}
            />
            <Text style={styles.counter}>{index + 1} / {total}</Text>
          </View>

          {/* 단어 */}
          <View style={styles.wordArea}>
            <Text style={styles.wordText}>{word.word}</Text>

            {/* 발음 버튼 */}
            <TouchableOpacity
              style={styles.speakBtn}
              onPress={(e) => { e.stopPropagation(); speakWord(word.word); }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="volume-medium" size={22} color={colors.sage[500]} />
            </TouchableOpacity>
          </View>

          {/* 동의어 미리보기 (있을 때만) */}
          {word.synonyms.length > 0 && (
            <View style={styles.synPreview}>
              <Text style={styles.synPreviewLabel}>syn.</Text>
              <Text style={styles.synPreviewText} numberOfLines={1}>
                {word.synonyms.slice(0, 2).join(', ')}
              </Text>
            </View>
          )}

          {/* 하단 힌트 */}
          <View style={styles.hintRow}>
            <Ionicons name="swap-horizontal-outline" size={14} color={colors.paper[300]} />
            <Text style={styles.hint}>탭하면 뜻을 볼 수 있어요</Text>
          </View>
        </Animated.View>

        {/* ── 뒷면 ── */}
        <Animated.View style={[styles.card, styles.back, backStyle]}>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.backScroll}>
            {/* 상단 */}
            <View style={styles.backTopRow}>
              <View style={styles.backWordRow}>
                <Text style={styles.wordTextSmall}>{word.word}</Text>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); speakWord(word.word); }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="volume-medium" size={16} color={colors.sage[400]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.counter}>{index + 1} / {total}</Text>
            </View>

            {/* 뜻 — 가장 크게 */}
            <View style={styles.meaningBlock}>
              <View style={styles.meaningAccentBar} />
              <Text style={styles.meaning}>{word.meaning}</Text>
            </View>

            <View style={styles.divider} />

            {/* 예문 */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>예문</Text>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); speakSentence(word.example); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="volume-medium-outline" size={14} color={colors.paper[400]} />
              </TouchableOpacity>
            </View>
            <ExampleBox text={word.example} style={styles.exampleBox} />

            {/* 동의어 */}
            {word.synonyms.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, styles.sectionTop]}>동의어</Text>
                <View style={styles.tagRow}>
                  {word.synonyms.map((s) => (
                    <View key={s} style={[styles.tag, styles.synTag]}>
                      <Text style={styles.synTagText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* 반의어 */}
            {word.antonyms.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, styles.sectionTop]}>반의어</Text>
                <View style={styles.tagRow}>
                  {word.antonyms.map((a) => (
                    <View key={a} style={[styles.tag, styles.antTag]}>
                      <Text style={styles.antTagText}>{a}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* 여백 */}
            <View style={{ height: spacing.xl }} />
          </ScrollView>
        </Animated.View>

      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },

  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: radius['2xl'],
    backfaceVisibility: 'hidden',
    borderWidth: 1,
    borderColor: colors.paper[200],
    // 깊이감 있는 그림자
    shadowColor: colors.sage[800],
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 40,
    elevation: 10,
  },

  // ── 앞면
  front: {
    backgroundColor: colors.paper.white,
    justifyContent: 'space-between',
    padding: spacing['2xl'],
  },
  frontTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partLabel: {
    color: colors.sage[600],
    letterSpacing: letterSpacing.label,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
  },
  counter: {
    fontSize: fontSize.label,
    color: colors.paper[400],
    fontWeight: fontWeight.medium,
  },
  wordArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  wordText: {
    fontSize: fontSize.displayWord + 4,  // 42px
    fontFamily: fontFamily.serif,
    fontWeight: fontWeight.bold,
    color: colors.paper[900],
    textAlign: 'center',
    lineHeight: (fontSize.displayWord + 4) * lineHeight.tight,
  },
  speakBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.sage[50],
    borderWidth: 1,
    borderColor: colors.sage[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  synPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.paper[50],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'center',
  },
  synPreviewLabel: {
    fontSize: fontSize.label,
    color: colors.paper[400],
    fontStyle: 'italic',
    fontFamily: fontFamily.serif,
  },
  synPreviewText: {
    fontSize: fontSize.caption,
    color: colors.paper[600],
    fontWeight: fontWeight.medium,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  hint: {
    fontSize: fontSize.caption - 1,
    color: colors.paper[300],
  },

  // ── 뒷면
  back: {
    backgroundColor: colors.paper.white,
    overflow: 'hidden',
  },
  backScroll: {
    flex: 1,
    padding: spacing['2xl'],
  },
  backTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wordTextSmall: {
    fontSize: fontSize.h2,
    fontFamily: fontFamily.serif,
    fontWeight: fontWeight.semibold,
    color: colors.paper[500],
  },

  // 뜻 블록 — 가장 강조
  meaningBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  meaningAccentBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.sage[600],
    marginTop: 4,
    alignSelf: 'stretch',
    minHeight: 28,
  },
  meaning: {
    flex: 1,
    fontSize: fontSize.h1 + 2,
    fontWeight: fontWeight.bold,
    color: colors.paper[900],
    lineHeight: (fontSize.h1 + 2) * lineHeight.normal,
  },

  divider: {
    height: 1,
    backgroundColor: colors.paper[100],
    marginVertical: spacing.lg,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colors.paper[400],
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
  },
  sectionTop: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  exampleBox: {
    marginBottom: spacing.xs,
  },

  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  synTag: {
    backgroundColor: colors.sage[50],
    borderWidth: 1,
    borderColor: colors.sage[200],
  },
  synTagText: {
    color: colors.sage[700],
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  antTag: {
    backgroundColor: colors.terra[100],
    borderWidth: 1,
    borderColor: colors.terra[200],
  },
  antTagText: {
    color: colors.terra[600],
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  });
}

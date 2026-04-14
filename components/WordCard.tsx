import { useState } from 'react';
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

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

interface Props {
  word: Word;
  index: number;
  total: number;
}

export default function WordCard({ word, index, total }: Props) {
  const [flipped, setFlipped] = useState(false);
  const rotate = useSharedValue(0); // 0 = 앞면, 1 = 뒷면

  function handleFlip() {
    const next = flipped ? 0 : 1;
    rotate.value = withTiming(next, { duration: 350 });
    setFlipped(!flipped);
  }

  // 앞면 스타일: 0→90도 회전
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(rotate.value, [0, 1], [0, 90])}deg` }],
    opacity: interpolate(rotate.value, [0, 0.5, 1], [1, 0, 0]),
  }));

  // 뒷면 스타일: -90→0도 회전
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(rotate.value, [0, 1], [-90, 0])}deg` }],
    opacity: interpolate(rotate.value, [0, 0.5, 1], [0, 0, 1]),
  }));

  const partLabel: Record<string, string> = {
    noun: '명사',
    verb: '동사',
    adj: '형용사',
    adv: '부사',
  };

  return (
    <TouchableOpacity onPress={handleFlip} activeOpacity={0.95}>
      <View style={styles.cardWrapper}>
        {/* 앞면 */}
        <Animated.View style={[styles.card, styles.front, frontStyle]}>
          <Text style={styles.counter}>{index + 1} / {total}</Text>
          <Text style={styles.partOfSpeech}>{partLabel[word.partOfSpeech] ?? word.partOfSpeech}</Text>
          <Text style={styles.wordText}>{word.word}</Text>

          {/* 단어 발음 버튼 */}
          <TouchableOpacity
            style={styles.speakBtn}
            onPress={(e) => { e.stopPropagation(); speakWord(word.word); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="volume-high-outline" size={28} color="#4A90D9" />
          </TouchableOpacity>

          <Text style={styles.hint}>탭하면 뜻을 볼 수 있어요</Text>
        </Animated.View>

        {/* 뒷면 */}
        <Animated.View style={[styles.card, styles.back, backStyle]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.counter}>{index + 1} / {total}</Text>

            {/* 단어 + 발음 버튼 한 줄 */}
            <View style={styles.backWordRow}>
              <Text style={styles.wordTextSmall}>{word.word}</Text>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); speakWord(word.word); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="volume-high-outline" size={20} color="#4A90D9" />
              </TouchableOpacity>
            </View>

            <Text style={styles.meaning}>{word.meaning}</Text>

            <View style={styles.divider} />

            {/* 예문 + 발음 버튼 */}
            <View style={styles.exampleRow}>
              <Text style={styles.sectionLabel}>예문</Text>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); speakSentence(word.example); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="volume-medium-outline" size={16} color="#9BA3AF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.example}>{word.example}</Text>

            {word.synonyms.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>동의어</Text>
                <View style={styles.tagRow}>
                  {word.synonyms.map((s) => (
                    <View key={s} style={[styles.tag, styles.synTag]}>
                      <Text style={styles.synTagText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {word.antonyms.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>반의어</Text>
                <View style={styles.tagRow}>
                  {word.antonyms.map((a) => (
                    <View key={a} style={[styles.tag, styles.antTag]}>
                      <Text style={styles.antTagText}>{a}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const CARD_HEIGHT = 420;

const styles = StyleSheet.create({
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 24,
    padding: 28,
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  front: {
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  back: {
    backgroundColor: '#F0F7FF',
  },
  counter: {
    position: 'absolute',
    top: 20,
    right: 24,
    fontSize: 13,
    color: '#9BA3AF',
    fontWeight: '600',
  },
  partOfSpeech: {
    fontSize: 13,
    color: '#4A90D9',
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  wordText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  hint: {
    fontSize: 13,
    color: '#C4C9D4',
    marginTop: 8,
  },
  speakBtn: {
    marginBottom: 12,
  },
  backWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 6,
  },
  wordTextSmall: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4A90D9',
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 12,
  },
  meaning: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#D1E3F8',
    marginVertical: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9BA3AF',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 12,
  },
  example: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  synTag: {
    backgroundColor: '#DCFCE7',
  },
  synTagText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '600',
  },
  antTag: {
    backgroundColor: '#FEE2E2',
  },
  antTagText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
});

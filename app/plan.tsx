import { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, StatusBar, TextInput, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, fontWeight, spacing, radius, useColors, ColorPalette } from '../src/theme';
import { getStudyPlan, saveStudyPlan, saveSettings, deleteStudyPlan } from '../src/storage';
import { StudyPlan, StudyLevel } from '../src/types';
import { getAllWordbooks, resetAllProgress } from '../src/storage/wordbookStorage';
import { Wordbook } from '../src/types/wordbook';
import { scheduleStudyReminders, cancelStudyReminders } from '../src/notifications';

// ── 상수 ──────────────────────────────────────────────
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const DAY_KEYS   = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const HOURS      = Array.from({ length: 24 }, (_, i) => i);
const MINUTES    = [0, 10, 20, 30, 40, 50];
const ITEM_H     = 46;

const LEVELS: { key: StudyLevel; label: string; goal: number; sub: string; emoji: string }[] = [
  { key: 'beginner',     label: '초급',   goal: 10, sub: '하루 10개',    emoji: '🌱' },
  { key: 'intermediate', label: '중급',   goal: 20, sub: '하루 20개',    emoji: '📗' },
  { key: 'advanced',     label: '고급',   goal: 30, sub: '하루 30개',    emoji: '🔥' },
  { key: 'master',       label: '마스터', goal: 0,  sub: '직접 설정',    emoji: '👑' },
];

const PERIOD_OPTIONS: { days: number; label: string }[] = [
  { days: 14,  label: '2주'  },
  { days: 30,  label: '1달'  },
  { days: 60,  label: '2달'  },
  { days: 90,  label: '3달'  },
  { days: -1,  label: '직접' },  // -1 = custom
];

// ── 드럼 피커 ─────────────────────────────────────────
interface DrumPickerProps {
  values: number[];
  selected: number;
  onSelect: (v: number) => void;
  format?: (v: number) => string;
  width?: number;
}

function DrumPicker({ values, selected, onSelect, format, width = 100 }: DrumPickerProps) {
  const colors = useColors();
  const drum = useMemo(() => makeDrumStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);
  const idx = values.indexOf(selected);
  const fmt = format ?? ((v: number) => `${v}`);

  return (
    <View style={[drum.wrap, { width }]}>
      <View style={drum.indicator} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onLayout={() => scrollRef.current?.scrollTo({ y: Math.max(0, idx) * ITEM_H, animated: false })}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          onSelect(values[Math.max(0, Math.min(i, values.length - 1))]);
        }}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
      >
        {values.map((v, i) => {
          const isSelected = v === selected;
          return (
            <View key={i} style={drum.item}>
              <Text style={[drum.text, isSelected && drum.textSelected]}>{fmt(v)}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function makeDrumStyles(colors: ColorPalette) {
  return StyleSheet.create({
  wrap: { height: ITEM_H * 5, overflow: 'hidden', position: 'relative' },
  indicator: {
    position: 'absolute',
    top: ITEM_H * 2, left: 8, right: 8, height: ITEM_H,
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: colors.paper[200], zIndex: 2, borderRadius: 4,
  },
  item: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  text:         { fontSize: 20, color: colors.paper[300], fontWeight: '400' },
  textSelected: { color: colors.paper[900], fontWeight: '700', fontSize: 22 },
  });
}

// ── 메인 화면 ─────────────────────────────────────────
export default function PlanScreen() {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();

  const [wordbooks, setWordbooks]           = useState<Wordbook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [level, setLevel]                   = useState<StudyLevel>('beginner');
  const [masterGoal, setMasterGoal]         = useState(40);
  const [masterInput, setMasterInput]       = useState('40');
  const [periodDays, setPeriodDays]         = useState(30);
  const [customPeriodInput, setCustomPeriodInput] = useState('');
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);
  const [selectedDays, setSelectedDays]     = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [alarmHour, setAlarmHour]           = useState(7);
  const [alarmMinute, setAlarmMinute]       = useState(0);
  const [alarmEnabled, setAlarmEnabled]     = useState(false);

  useFocusEffect(
    useCallback(() => { loadData(); }, [])
  );

  async function loadData() {
    const [books, plan] = await Promise.all([getAllWordbooks(), getStudyPlan()]);
    setWordbooks(books);
    if (plan) {
      setSelectedBookId(plan.wordbookId);
      // 레벨 (이전 플랜 데이터 호환)
      if (plan.level) {
        setLevel(plan.level);
        if (plan.level === 'master') {
          setMasterGoal(plan.dailyGoal);
          setMasterInput(String(plan.dailyGoal));
        }
      }
      // 학습 기간
      if (plan.studyPeriodDays) {
        const preset = PERIOD_OPTIONS.find((o) => o.days === plan.studyPeriodDays);
        if (preset) {
          setPeriodDays(plan.studyPeriodDays);
          setIsCustomPeriod(false);
        } else {
          setPeriodDays(plan.studyPeriodDays);
          setCustomPeriodInput(String(plan.studyPeriodDays));
          setIsCustomPeriod(true);
        }
      }
      setSelectedDays(plan.days);
      const [h, m] = plan.alarmTime.split(':').map(Number);
      setAlarmHour(h);
      setAlarmMinute(m);
      setAlarmEnabled(plan.alarmEnabled);
    } else if (books.length > 0) {
      setSelectedBookId(books[0].id);
    }
  }

  function toggleDay(key: string) {
    setSelectedDays((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]
    );
  }

  function handleSelectPeriod(days: number) {
    if (days === -1) {
      setIsCustomPeriod(true);
    } else {
      setIsCustomPeriod(false);
      setPeriodDays(days);
    }
  }

  function getDailyGoal(): number {
    if (level === 'master') return Math.max(1, masterGoal);
    return LEVELS.find((l) => l.key === level)?.goal ?? 10;
  }

  function getActualPeriodDays(): number {
    if (isCustomPeriod) {
      const n = parseInt(customPeriodInput, 10);
      return isNaN(n) || n < 1 ? 30 : n;
    }
    return periodDays;
  }

  function handleReset() {
    Alert.alert(
      '학습 플랜 지우기',
      '플랜과 모든 단어 암기 기록이 초기화돼요.\n이 작업은 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            await Promise.all([
              deleteStudyPlan(),
              resetAllProgress(),
              saveSettings({ dailyGoal: 10 }),
              cancelStudyReminders(),
            ]);
            router.back();
          },
        },
      ],
    );
  }

  async function handleSave() {
    if (!selectedBookId) return;
    const dailyGoal = getDailyGoal();
    const studyPeriodDays = getActualPeriodDays();

    const plan: StudyPlan = {
      wordbookId: selectedBookId,
      level,
      dailyGoal,
      studyPeriodDays,
      days: selectedDays,
      alarmTime: `${String(alarmHour).padStart(2, '0')}:${String(alarmMinute).padStart(2, '0')}`,
      alarmEnabled,
    };
    await Promise.all([
      saveStudyPlan(plan),
      saveSettings({ dailyGoal }),   // 홈 진행바에 자동 반영
    ]);

    if (plan.alarmEnabled) {
      const ok = await scheduleStudyReminders(plan);
      if (!ok) {
        Alert.alert(
          '알림 권한이 필요해요',
          '플랜은 저장됐지만 알림은 울리지 않아요.\n설정에서 알림 권한을 켜주세요.',
        );
      }
    } else {
      await cancelStudyReminders();
    }

    router.back();
  }

  // ── 파생 계산 ──────────────────────────────────────
  const dailyGoal      = getDailyGoal();
  const actualPeriod   = getActualPeriodDays();
  const selectedBook   = wordbooks.find((b) => b.id === selectedBookId);
  const daysPerWeek    = selectedDays.length;

  const estimatedDays  = selectedBook && daysPerWeek > 0 && dailyGoal > 0
    ? Math.ceil(selectedBook.totalWords / dailyGoal / daysPerWeek) * 7
    : null;

  const onTrack = estimatedDays !== null ? estimatedDays <= actualPeriod : null;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle={colors.statusBarStyle} />

      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-down" size={24} color={colors.paper[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>학습 플랜 설정</Text>
        <TouchableOpacity onPress={handleSave} style={s.saveHitSlop}>
          <Text style={s.saveTxt}>저장</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── 단어장 선택 ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>암기할 단어장</Text>
          <View style={s.card}>
            {wordbooks.length === 0 && (
              <View style={s.bookRow}>
                <Text style={s.bookName}>단어장이 없어요</Text>
              </View>
            )}
            {wordbooks.map((book, i) => (
              <TouchableOpacity
                key={book.id}
                style={[s.bookRow, i < wordbooks.length - 1 && s.rowDivider]}
                onPress={() => setSelectedBookId(book.id)}
                activeOpacity={0.7}
              >
                <View style={s.bookInfo}>
                  <Text style={s.bookName}>{book.name}</Text>
                  <Text style={s.bookSub}>{book.totalWords}단어</Text>
                </View>
                {selectedBookId === book.id && (
                  <Ionicons name="checkmark" size={20} color={colors.sage[600]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── 학습 레벨 ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>학습 레벨</Text>
          <View style={s.levelGrid}>
            {LEVELS.map((lv) => {
              const selected = level === lv.key;
              return (
                <TouchableOpacity
                  key={lv.key}
                  style={[s.levelCard, selected && s.levelCardOn]}
                  onPress={() => setLevel(lv.key)}
                  activeOpacity={0.75}
                >
                  <Text style={s.levelEmoji}>{lv.emoji}</Text>
                  <Text style={[s.levelLabel, selected && s.levelLabelOn]}>{lv.label}</Text>
                  <Text style={[s.levelSub, selected && s.levelSubOn]}>{lv.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 마스터 직접 입력 */}
          {level === 'master' && (
            <View style={s.masterRow}>
              <Text style={s.masterLabel}>하루 목표 단어 수</Text>
              <View style={s.masterStepper}>
                <TouchableOpacity
                  style={s.stepBtn}
                  onPress={() => {
                    const next = Math.max(1, masterGoal - 10);
                    setMasterGoal(next);
                    setMasterInput(String(next));
                  }}
                >
                  <Text style={s.stepBtnTxt}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={s.masterInput}
                  value={masterInput}
                  onChangeText={(t) => {
                    setMasterInput(t);
                    const n = parseInt(t, 10);
                    if (!isNaN(n) && n > 0) setMasterGoal(n);
                  }}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={s.stepBtn}
                  onPress={() => {
                    const next = masterGoal + 10;
                    setMasterGoal(next);
                    setMasterInput(String(next));
                  }}
                >
                  <Text style={s.stepBtnTxt}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.masterUnit}>개</Text>
            </View>
          )}
        </View>

        {/* ── 학습 기간 ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>학습 기간</Text>
          <View style={s.periodRow}>
            {PERIOD_OPTIONS.map((opt) => {
              const isSelected = opt.days === -1
                ? isCustomPeriod
                : !isCustomPeriod && periodDays === opt.days;
              return (
                <TouchableOpacity
                  key={opt.days}
                  style={[s.periodChip, isSelected && s.periodChipOn]}
                  onPress={() => handleSelectPeriod(opt.days)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.periodChipTxt, isSelected && s.periodChipTxtOn]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isCustomPeriod && (
            <View style={s.customPeriodRow}>
              <TextInput
                style={s.customPeriodInput}
                value={customPeriodInput}
                onChangeText={setCustomPeriodInput}
                placeholder="예: 45"
                placeholderTextColor={colors.paper[400]}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <Text style={s.customPeriodUnit}>일</Text>
            </View>
          )}
        </View>

        {/* ── 요일 선택 ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>공부할 요일</Text>
          <View style={[s.card, s.daysCard]}>
            {DAY_KEYS.map((key, i) => {
              const on = selectedDays.includes(key);
              const isWeekend = key === 'sat' || key === 'sun';
              return (
                <TouchableOpacity
                  key={key}
                  style={[s.dayBtn, on && s.dayBtnOn, !on && isWeekend && s.dayBtnWeekend]}
                  onPress={() => toggleDay(key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    s.dayTxt,
                    on && s.dayTxtOn,
                    !on && isWeekend && s.dayTxtWeekend,
                  ]}>
                    {DAY_LABELS[i]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── 알람 설정 ── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>알람 설정</Text>
            <TouchableOpacity
              style={[s.toggle, alarmEnabled && s.toggleOn]}
              onPress={() => setAlarmEnabled(!alarmEnabled)}
              activeOpacity={0.8}
            >
              <View style={[s.thumb, alarmEnabled && s.thumbOn]} />
            </TouchableOpacity>
          </View>

          {alarmEnabled && (
            <View style={[s.card, s.alarmCard]}>
              <View style={s.timeRow}>
                <DrumPicker
                  values={HOURS}
                  selected={alarmHour}
                  onSelect={setAlarmHour}
                  format={(v) => String(v).padStart(2, '0')}
                  width={90}
                />
                <Text style={s.colon}>:</Text>
                <DrumPicker
                  values={MINUTES}
                  selected={alarmMinute}
                  onSelect={setAlarmMinute}
                  format={(v) => String(v).padStart(2, '0')}
                  width={90}
                />
              </View>
              <Text style={s.alarmCaption}>
                {String(alarmHour).padStart(2, '0')}:{String(alarmMinute).padStart(2, '0')} 알람
              </Text>
            </View>
          )}
        </View>

        {/* ── 예상 완료 카드 ── */}
        {estimatedDays !== null && (
          <View style={[s.estimateCard, onTrack === false && s.estimateCardWarn]}>
            <Ionicons
              name={onTrack ? 'trending-up-outline' : 'alert-circle-outline'}
              size={18}
              color={onTrack ? colors.sage[600] : colors.terra[500]}
            />
            <View style={{ flex: 1 }}>
              <Text style={[s.estimateTxt, onTrack === false && s.estimateTxtWarn]}>
                주 {daysPerWeek}일 · 하루 {dailyGoal}단어 기준,{' '}
                약 <Text style={s.estimateBold}>{estimatedDays}일</Text> 후 완성 예정
              </Text>
              {onTrack === false && (
                <Text style={s.estimateWarnSub}>
                  설정한 기간({actualPeriod}일)보다 길어요.{'\n'}
                  레벨을 올리거나 요일을 늘려보세요.
                </Text>
              )}
              {onTrack === true && (
                <Text style={s.estimateOkSub}>
                  설정한 기간({actualPeriod}일) 안에 완성할 수 있어요!
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── 플랜 초기화 ── */}
        <TouchableOpacity style={s.resetBtn} onPress={handleReset} activeOpacity={0.75}>
          <Ionicons name="trash-outline" size={15} color={colors.terra[500]} />
          <Text style={s.resetBtnTxt}>학습 플랜 지우기</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── 스타일 ────────────────────────────────────────────
function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.paper.white,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.paper[200],
  },
  backBtn:     { padding: spacing.xs },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.h2,
    fontWeight: fontWeight.semibold,
    color: colors.paper[900],
    textAlign: 'center',
  },
  saveHitSlop: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  saveTxt: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.sage[600],
  },

  content: { padding: spacing.lg, gap: 28, paddingBottom: 60 },

  section:      { gap: 10 },
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colors.paper[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingLeft: 2,
  },

  card: {
    backgroundColor: colors.paper.white,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: colors.paper[200],
    overflow: 'hidden',
  },

  // 단어장
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowDivider: { borderBottomWidth: 0.5, borderBottomColor: colors.paper[100] },
  bookInfo:   { flex: 1 },
  bookName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.paper[900],
  },
  bookSub: {
    fontSize: fontSize.caption,
    color: colors.paper[400],
    marginTop: 2,
  },

  // 레벨 그리드
  levelGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  levelCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    backgroundColor: colors.paper.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.paper[200],
    gap: 4,
  },
  levelCardOn: {
    backgroundColor: colors.sage[600],
    borderColor: colors.sage[600],
  },
  levelEmoji: { fontSize: 22 },
  levelLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: colors.paper[700],
  },
  levelLabelOn: { color: colors.paper.white },
  levelSub: {
    fontSize: 10,
    color: colors.paper[400],
    textAlign: 'center',
  },
  levelSubOn: { color: 'rgba(255,255,255,0.75)' },

  // 마스터 스테퍼
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper.white,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: colors.sage[200],
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    gap: 12,
  },
  masterLabel: {
    flex: 1,
    fontSize: fontSize.bodySmall,
    color: colors.paper[700],
    fontWeight: fontWeight.medium,
  },
  masterStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.paper.bg,
    borderWidth: 1,
    borderColor: colors.paper[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnTxt: {
    fontSize: 20,
    fontWeight: fontWeight.semibold,
    color: colors.paper[700],
    lineHeight: 24,
  },
  masterInput: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: colors.sage[600],
    minWidth: 50,
    textAlign: 'center',
  },
  masterUnit: {
    fontSize: fontSize.bodySmall,
    color: colors.paper[500],
    fontWeight: fontWeight.medium,
  },

  // 학습 기간
  periodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.paper.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.paper[200],
  },
  periodChipOn: {
    backgroundColor: colors.sage[600],
    borderColor: colors.sage[600],
  },
  periodChipTxt: {
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.semibold,
    color: colors.paper[600],
  },
  periodChipTxtOn: { color: colors.paper.white },
  customPeriodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.sage[200],
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
    gap: 8,
  },
  customPeriodInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: colors.sage[600],
    paddingVertical: 8,
    textAlign: 'center',
  },
  customPeriodUnit: {
    fontSize: fontSize.body,
    color: colors.paper[500],
    fontWeight: fontWeight.medium,
  },

  // 요일
  daysCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    paddingHorizontal: 8,
  },
  dayBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.paper.bg,
    borderWidth: 1, borderColor: colors.paper[200],
  },
  dayBtnOn:      { backgroundColor: colors.sage[600], borderColor: colors.sage[600] },
  dayBtnWeekend: { borderColor: colors.terra[200], backgroundColor: colors.terra[100] },
  dayTxt:        { fontSize: fontSize.bodySmall, fontWeight: fontWeight.medium, color: colors.paper[500] },
  dayTxtOn:      { color: colors.paper.white, fontWeight: fontWeight.bold },
  dayTxtWeekend: { color: colors.terra[400] },

  // 토글
  toggle: {
    width: 46, height: 28, borderRadius: 14,
    backgroundColor: colors.paper[200],
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: colors.sage[500] },
  thumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.paper.white,
    shadowColor: '#000', shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, elevation: 2,
  },
  thumbOn: { alignSelf: 'flex-end' },

  // 알람
  alarmCard:    { alignItems: 'center', paddingBottom: spacing.md, paddingTop: 4 },
  timeRow:      { flexDirection: 'row', alignItems: 'center' },
  colon: {
    fontSize: 32, fontWeight: fontWeight.bold,
    color: colors.paper[700], marginHorizontal: 4, marginBottom: 8,
  },
  alarmCaption: { fontSize: fontSize.caption, color: colors.paper[400], marginTop: 6 },

  // 예상 완료
  estimateCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.sage[50],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.sage[200],
    padding: spacing.lg,
  },
  estimateCardWarn: {
    backgroundColor: colors.terra[100],
    borderColor: colors.terra[200],
  },
  estimateTxt: {
    fontSize: fontSize.bodySmall,
    color: colors.sage[700],
    lineHeight: 22,
  },
  estimateTxtWarn: { color: colors.terra[700] },
  estimateBold:    { fontWeight: fontWeight.bold },
  estimateOkSub: {
    fontSize: fontSize.caption,
    color: colors.sage[500],
    marginTop: 4,
  },
  estimateWarnSub: {
    fontSize: fontSize.caption,
    color: colors.terra[500],
    marginTop: 4,
    lineHeight: 18,
  },

  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.terra[200],
    backgroundColor: colors.terra[100],
  },
  resetBtnTxt: {
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.semibold,
    color: colors.terra[500],
  },
  });
}

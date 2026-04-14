import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Modal, Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getSettings, saveSettings, getTodayLearnedCount, getTodayReviewWordIds } from '../../src/storage';

export default function HomeScreen() {
  const router = useRouter();
  const [dailyGoal, setDailyGoal] = useState(10);
  const [learnedCount, setLearnedCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [tempGoal, setTempGoal] = useState(10);

  // 탭으로 돌아올 때마다 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const settings = await getSettings();
    setDailyGoal(settings.dailyGoal);
    setTempGoal(settings.dailyGoal);

    const learned = await getTodayLearnedCount();
    setLearnedCount(learned);

    const reviewIds = await getTodayReviewWordIds();
    setReviewCount(reviewIds.length);
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>단어암기장</Text>
          <Text style={styles.subtitle}>오늘도 함께 공부해요!</Text>
        </View>
        {/* 목표 설정 버튼 */}
        <TouchableOpacity
          style={styles.settingBtn}
          onPress={() => { setTempGoal(dailyGoal); setShowGoalModal(true); }}
        >
          <Text style={styles.settingBtnText}>목표 설정</Text>
        </TouchableOpacity>
      </View>

      {/* 오늘의 진도 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>오늘의 목표</Text>
        <Text style={styles.progressText}>
          {learnedCount} / {dailyGoal} 단어
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        {learnedCount >= dailyGoal && (
          <Text style={styles.doneText}>오늘 목표 달성!</Text>
        )}
      </View>

      {/* 복습 알림 */}
      {reviewCount > 0 && (
        <View style={[styles.card, styles.reviewCard]}>
          <Text style={styles.reviewText}>복습할 단어 {reviewCount}개가 있어요!</Text>
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => router.push('/(tabs)/test')}
          >
            <Text style={styles.reviewBtnText}>복습하러 가기</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 학습 시작 버튼 */}
      <TouchableOpacity
        style={styles.startBtn}
        onPress={() => router.push('/(tabs)/study')}
      >
        <Text style={styles.startBtnText}>학습 시작하기</Text>
      </TouchableOpacity>

      {/* 목표 설정 모달 */}
      <Modal visible={showGoalModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowGoalModal(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>하루 목표 설정</Text>
            <Text style={styles.modalSub}>5개 단위로 조절할 수 있어요</Text>

            <View style={styles.goalRow}>
              <TouchableOpacity style={styles.goalBtn} onPress={() => adjustGoal(-5)}>
                <Text style={styles.goalBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.goalValue}>{tempGoal}개</Text>
              <TouchableOpacity style={styles.goalBtn} onPress={() => adjustGoal(5)}>
                <Text style={styles.goalBtnText}>+</Text>
              </TouchableOpacity>
            </View>

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
    backgroundColor: '#F3F4F6',
    padding: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
  },
  settingBtn: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  settingBtnText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4A90D9',
    borderRadius: 5,
  },
  doneText: {
    marginTop: 10,
    fontSize: 15,
    color: '#10B981',
    fontWeight: '600',
  },
  reviewCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  reviewText: {
    fontSize: 15,
    color: '#92400E',
    fontWeight: '600',
    marginBottom: 12,
  },
  reviewBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reviewBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  startBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: 300,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    color: '#9BA3AF',
    marginBottom: 24,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 8,
  },
  goalBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalBtnText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
  },
  goalValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#4A90D9',
    minWidth: 80,
    textAlign: 'center',
  },
  goalMin: {
    fontSize: 12,
    color: '#C4C9D4',
    marginBottom: 24,
  },
  saveBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Share, ActivityIndicator, Platform,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Unsubscribe } from 'firebase/firestore';
import { useGoogleAuth } from '../../src/firebase/auth';
import {
  getUserGroupId, getGroupData, createGroup, joinGroup, leaveGroup,
  subscribeGroupActivities,
} from '../../src/firebase/groupStorage';
import type { Group, GroupMember, GroupActivity } from '../../src/types/group';
import { fontSize, fontWeight, spacing, radius, useColors, ColorPalette } from '../../src/theme';

type FlowView = 'home' | 'create' | 'join';

const CARD_R = radius.xl;

export default function GroupScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, signInWithGoogle, signInWithApple, signInWithEmail, signingIn, error } = useGoogleAuth();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const [loading, setLoading]           = useState(true);
  const [flowView, setFlowView]         = useState<FlowView>('home');
  const [group, setGroup]               = useState<Group | null>(null);
  const [members, setMembers]           = useState<GroupMember[]>([]);
  const [activities, setActivities]     = useState<GroupActivity[]>([]);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [inviteInput, setInviteInput]   = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const unsubRef = useRef<Unsubscribe | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadGroup(user.uid);
      } else {
        setLoading(false);
      }
      return () => {
        unsubRef.current?.();
        unsubRef.current = null;
      };
    }, [user])
  );

  async function loadGroup(userId: string) {
    setLoading(true);
    try {
      const groupId = await getUserGroupId(userId);
      if (!groupId) { setGroup(null); return; }

      const data = await getGroupData(groupId);
      if (!data) { setGroup(null); return; }

      setGroup(data.group);
      setMembers(data.members);
      setActivities(data.activities);

      // 실시간 업데이트
      unsubRef.current?.();
      unsubRef.current = subscribeGroupActivities(groupId, setActivities);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!user || !groupNameInput.trim() || submitting) return;
    setSubmitting(true);
    try {
      const g = await createGroup(
        user.uid,
        user.displayName ?? '사용자',
        user.photoURL ?? '',
        groupNameInput,
      );
      setGroup(g);
      setMembers([{
        userId: user.uid,
        displayName: user.displayName ?? '사용자',
        photoURL: user.photoURL ?? '',
        role: 'owner',
        joinedAt: new Date().toISOString(),
      }]);
      setActivities([]);
      setFlowView('home');
      setGroupNameInput('');
    } catch {
      Alert.alert('오류', '그룹을 만들지 못했어요. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin() {
    if (!user || !inviteInput.trim() || submitting) return;
    setSubmitting(true);
    try {
      const g = await joinGroup(
        user.uid,
        user.displayName ?? '사용자',
        user.photoURL ?? '',
        inviteInput,
      );
      if (!g) {
        Alert.alert('코드 오류', '올바르지 않은 초대 코드예요. 다시 확인해주세요.');
        return;
      }
      await loadGroup(user.uid);
      setFlowView('home');
      setInviteInput('');
    } catch {
      Alert.alert('오류', '그룹 참여에 실패했어요. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLeave() {
    if (!user || !group) return;
    const isOwner = group.ownerId === user.uid;
    Alert.alert(
      isOwner ? '그룹 해체' : '그룹 탈퇴',
      isOwner
        ? '그룹을 해체하면 모든 멤버가 그룹에서 나가게 돼요.'
        : '그룹에서 나가시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: isOwner ? '해체하기' : '탈퇴하기',
          style: 'destructive',
          onPress: async () => {
            await leaveGroup(user.uid, group.id, isOwner);
            unsubRef.current?.();
            unsubRef.current = null;
            setGroup(null);
            setMembers([]);
            setActivities([]);
          },
        },
      ],
    );
  }

  async function handleShare() {
    if (!group) return;
    await Share.share({
      message: `단어암기장 그룹 "${group.name}"에 초대합니다!\n초대 코드: ${group.inviteCode}`,
    });
  }

  // ── 로그아웃 상태 ──────────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.loginWrap} keyboardShouldPersistTaps="handled">
          <View style={styles.emptyIconBox}>
            <Ionicons name="people" size={40} color={colors.sage[400]} />
          </View>
          <Text style={styles.emptyTitle}>그룹 기능</Text>
          <Text style={styles.emptySub}>
            친구들과 함께 학습하고{'\n'}서로의 진도를 확인해봐요
          </Text>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.loginBtn, signingIn && styles.loginBtnDisabled]}
            onPress={signInWithGoogle}
            disabled={signingIn}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-google" size={17} color={colors.paper.white} />
            <Text style={styles.loginBtnText}>
              {signingIn ? '로그인 중...' : 'Google로 로그인'}
            </Text>
          </TouchableOpacity>
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={
                colors.statusBarStyle === 'dark-content'
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE
              }
              cornerRadius={radius.lg}
              style={styles.appleBtn}
              onPress={signInWithApple}
            />
          )}
          {/* 이메일 로그인 구분선 */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>
          <TextInput
            style={styles.emailInput}
            value={emailInput}
            onChangeText={setEmailInput}
            placeholder="이메일"
            placeholderTextColor={colors.paper[400]}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <TextInput
            style={styles.emailInput}
            value={passwordInput}
            onChangeText={setPasswordInput}
            placeholder="비밀번호"
            placeholderTextColor={colors.paper[400]}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={() => {
              if (emailInput && passwordInput) signInWithEmail(emailInput, passwordInput);
            }}
          />
          <TouchableOpacity
            style={[styles.emailBtn, (signingIn || !emailInput || !passwordInput) && styles.loginBtnDisabled]}
            onPress={() => signInWithEmail(emailInput, passwordInput)}
            disabled={signingIn || !emailInput || !passwordInput}
            activeOpacity={0.85}
          >
            {signingIn ? (
              <ActivityIndicator color={colors.paper.white} />
            ) : (
              <Text style={styles.loginBtnText}>이메일로 로그인</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 로딩 ──────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.sage[600]} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── 그룹 만들기 ────────────────────────────────────────────
  if (flowView === 'create') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
          <TouchableOpacity onPress={() => setFlowView('home')} style={styles.backRow}>
            <Ionicons name="arrow-back" size={20} color={colors.paper[600]} />
            <Text style={styles.backText}>뒤로</Text>
          </TouchableOpacity>

          <Text style={styles.pageTitle}>그룹 만들기</Text>
          <Text style={styles.pageSub}>그룹 이름을 정해주세요</Text>

          <TextInput
            style={styles.textInput}
            value={groupNameInput}
            onChangeText={setGroupNameInput}
            placeholder="예: 토익 스터디, 수능 영어…"
            placeholderTextColor={colors.paper[400]}
            maxLength={20}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <Text style={styles.inputHint}>{groupNameInput.length} / 20자</Text>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (!groupNameInput.trim() || submitting) && styles.primaryBtnDisabled,
            ]}
            onPress={handleCreate}
            disabled={!groupNameInput.trim() || submitting}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {submitting ? '만드는 중…' : '그룹 만들기'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 초대코드로 참여 ────────────────────────────────────────
  if (flowView === 'join') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
          <TouchableOpacity onPress={() => setFlowView('home')} style={styles.backRow}>
            <Ionicons name="arrow-back" size={20} color={colors.paper[600]} />
            <Text style={styles.backText}>뒤로</Text>
          </TouchableOpacity>

          <Text style={styles.pageTitle}>그룹 참여</Text>
          <Text style={styles.pageSub}>친구에게 받은 6자리 초대 코드를 입력해주세요</Text>

          <TextInput
            style={[styles.textInput, styles.textInputCode]}
            value={inviteInput}
            onChangeText={(t) => setInviteInput(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="A1B2C3"
            placeholderTextColor={colors.paper[400]}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleJoin}
          />

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (inviteInput.length < 6 || submitting) && styles.primaryBtnDisabled,
            ]}
            onPress={handleJoin}
            disabled={inviteInput.length < 6 || submitting}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {submitting ? '참여 중…' : '그룹 참여하기'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 그룹 없음 ──────────────────────────────────────────────
  if (!group) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.pageTitle}>그룹</Text>
          <Text style={styles.pageSub}>함께 공부하면 더 오래 기억돼요</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setFlowView('create')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.sage[100] }]}>
              <Ionicons name="add-circle-outline" size={26} color={colors.sage[600]} />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>그룹 만들기</Text>
              <Text style={styles.actionSub}>새 그룹을 만들고 친구를 초대해요</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.paper[300]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setFlowView('join')}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.terra[100] }]}>
              <Ionicons name="enter-outline" size={26} color={colors.terra[500]} />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>초대 코드로 참여</Text>
              <Text style={styles.actionSub}>친구의 6자리 코드를 입력해요</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.paper[300]} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 그룹 메인 화면 ─────────────────────────────────────────
  const todayKey = new Date().toISOString().split('T')[0];

  const memberList = members.map((m) => {
    const act = activities.find((a) => a.userId === m.userId) ?? null;
    const todayCount  = act?.todayDate === todayKey ? (act?.todayLearnedCount ?? 0) : 0;
    const todayMins   = act?.todayDate === todayKey ? (act?.todayStudyMinutes  ?? 0) : 0;
    const testScore   = act?.lastTestScore ?? null;
    const testToday   = act?.lastTestDate === todayKey;
    return { ...m, act, todayCount, todayMins, testScore, testToday };
  });

  memberList.sort((a, b) => {
    if (b.todayCount !== a.todayCount) return b.todayCount - a.todayCount;
    return (b.testScore ?? -1) - (a.testScore ?? -1);
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.memberCountTxt}>{members.length}명 참여 중</Text>
          </View>
          <TouchableOpacity style={styles.codeChip} onPress={handleShare} activeOpacity={0.8}>
            <Text style={styles.codeTxt}>{group.inviteCode}</Text>
            <Ionicons name="share-social-outline" size={14} color={colors.sage[600]} />
          </TouchableOpacity>
        </View>

        {/* 오늘의 랭킹 */}
        <Text style={styles.sectionLabel}>오늘의 학습 랭킹</Text>

        <View style={styles.rankCard}>
          {memberList.map((m, i) => {
            const isMe = m.userId === user.uid;
            const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;

            return (
              <View
                key={m.userId}
                style={[
                  styles.memberRow,
                  isMe && styles.memberRowMe,
                  i < memberList.length - 1 && styles.memberRowDivider,
                ]}
              >
                {/* 순위 */}
                <View style={styles.rankCol}>
                  {rankEmoji ? (
                    <Text style={styles.rankEmoji}>{rankEmoji}</Text>
                  ) : (
                    <Text style={styles.rankNum}>{i + 1}</Text>
                  )}
                </View>

                {/* 프로필 */}
                {m.photoURL ? (
                  <Image
                    source={{ uri: m.photoURL }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>
                      {(m.displayName || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )}

                {/* 이름 */}
                <View style={styles.memberInfoCol}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName} numberOfLines={1}>{m.displayName}</Text>
                    {isMe && (
                      <View style={styles.meBadge}>
                        <Text style={styles.meBadgeTxt}>나</Text>
                      </View>
                    )}
                    {m.role === 'owner' && (
                      <Ionicons name="star" size={11} color={colors.sage[500]} style={{ marginLeft: 3 }} />
                    )}
                  </View>
                  <Text style={styles.memberMeta}>
                    {m.todayMins > 0 ? `오늘 ${m.todayMins}분` : '오늘 아직 학습 전'}
                  </Text>
                </View>

                {/* 통계 */}
                <View style={styles.statsRow}>
                  {/* 단어 수 */}
                  <View style={styles.statBox}>
                    <Text style={[styles.statVal, m.todayCount > 0 && styles.statValActive]}>
                      {m.todayCount}
                    </Text>
                    <Text style={styles.statLbl}>단어</Text>
                  </View>

                  {/* 테스트 점수 */}
                  {m.testScore !== null ? (
                    <View style={styles.statBox}>
                      <Text style={[
                        styles.statVal,
                        m.testScore >= 80 ? styles.statValGood
                          : m.testScore >= 60 ? styles.statValActive
                          : styles.statValWeak,
                      ]}>
                        {m.testScore}
                      </Text>
                      <Text style={styles.statLbl}>점{m.testToday ? ' ★' : ''}</Text>
                    </View>
                  ) : (
                    <View style={styles.statBox}>
                      <Text style={styles.statValEmpty}>-</Text>
                      <Text style={styles.statLbl}>점수</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* 초대 안내 */}
        <View style={styles.inviteHint}>
          <Ionicons name="link-outline" size={13} color={colors.paper[400]} />
          <Text style={styles.inviteHintTxt}>
            초대 코드{' '}
            <Text style={styles.inviteCode}>{group.inviteCode}</Text>
            를 친구에게 공유해요
          </Text>
        </View>

        {/* 탈퇴 */}
        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave} activeOpacity={0.8}>
          <Text style={styles.leaveBtnTxt}>
            {group.ownerId === user.uid ? '그룹 해체' : '그룹 탈퇴'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper.bg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },

  // ── 빈 상태 / 로딩
  loginWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.sage[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    color: colors.paper[900],
    marginBottom: spacing.sm,
  },
  emptySub: {
    fontSize: fontSize.body,
    color: colors.paper[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing['2xl'],
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.sage[600],
    borderRadius: CARD_R,
    paddingVertical: 14,
    width: '100%',
  },
  loginBtnDisabled: { opacity: 0.55 },
  loginBtnText: {
    color: colors.paper.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  appleBtn: {
    width: '100%',
    height: 48,
    marginTop: spacing.sm,
  },
  errorBox: {
    backgroundColor: colors.terra[100],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    width: '100%',
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: colors.paper[200],
  },
  dividerText: {
    fontSize: fontSize.caption,
    color: colors.paper[400],
    marginHorizontal: spacing.sm,
  },
  emailInput: {
    width: '100%',
    backgroundColor: colors.paper.white,
    borderRadius: CARD_R,
    borderWidth: 1,
    borderColor: colors.paper[200],
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.body,
    color: colors.paper[900],
    marginBottom: spacing.sm,
  },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper[700],
    borderRadius: CARD_R,
    paddingVertical: 14,
    width: '100%',
    marginTop: spacing.xs,
  },

  // ── 뒤로 / 페이지 헤더
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  backText: {
    fontSize: fontSize.body,
    color: colors.paper[600],
    fontWeight: fontWeight.medium,
  },
  pageTitle: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.extrabold,
    color: colors.paper[900],
    marginBottom: spacing.xs,
  },
  pageSub: {
    fontSize: fontSize.bodySmall,
    color: colors.paper[500],
    marginBottom: spacing['2xl'],
  },

  // ── 텍스트 인풋
  textInput: {
    backgroundColor: colors.paper.white,
    borderRadius: CARD_R,
    borderWidth: 1,
    borderColor: colors.paper[200],
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: fontSize.body,
    color: colors.paper[900],
    marginBottom: spacing.sm,
  },
  textInputCode: {
    letterSpacing: 6,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: fontWeight.bold,
  },
  inputHint: {
    fontSize: fontSize.caption,
    color: colors.paper[400],
    textAlign: 'right',
    marginBottom: spacing.xl,
  },

  // ── 버튼
  primaryBtn: {
    backgroundColor: colors.sage[600],
    borderRadius: CARD_R,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.sage[800],
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: colors.paper[300],
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    color: colors.paper.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },

  // ── 액션 카드 (그룹 없을 때)
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper.white,
    borderRadius: CARD_R,
    borderWidth: 0.5,
    borderColor: colors.paper[200],
    padding: spacing.lg,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionTextWrap: { flex: 1 },
  actionTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.paper[900],
    marginBottom: 3,
  },
  actionSub: {
    fontSize: fontSize.caption,
    color: colors.paper[500],
  },

  // ── 그룹 메인 헤더
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  groupName: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.extrabold,
    color: colors.paper[900],
    letterSpacing: -0.5,
  },
  memberCountTxt: {
    fontSize: fontSize.caption,
    color: colors.paper[500],
    marginTop: 3,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.sage[50],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.sage[200],
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 4,
  },
  codeTxt: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    color: colors.sage[700],
    letterSpacing: 1.5,
  },

  // ── 섹션 레이블
  sectionLabel: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colors.paper[500],
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },

  // ── 랭킹 카드
  rankCard: {
    backgroundColor: colors.paper.white,
    borderRadius: CARD_R,
    borderWidth: 0.5,
    borderColor: colors.paper[200],
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  memberRowMe: {
    backgroundColor: colors.sage[50],
  },
  memberRowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.paper[100],
  },

  // 순위
  rankCol: {
    width: 28,
    alignItems: 'center',
  },
  rankEmoji: { fontSize: 20 },
  rankNum: {
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.bold,
    color: colors.paper[400],
  },

  // 아바타
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.paper[100],
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.sage[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.sage[600],
  },

  // 이름/메타
  memberInfoCol: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'nowrap',
  },
  memberName: {
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.semibold,
    color: colors.paper[900],
    flexShrink: 1,
  },
  meBadge: {
    backgroundColor: colors.sage[600],
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  meBadgeTxt: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.paper.white,
  },
  memberMeta: {
    fontSize: fontSize.caption,
    color: colors.paper[400],
    marginTop: 2,
  },

  // 통계
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    alignItems: 'center',
    minWidth: 36,
  },
  statVal: {
    fontSize: 18,
    fontWeight: fontWeight.extrabold,
    color: colors.paper[300],
  },
  statValActive: { color: colors.sage[600] },
  statValGood:   { color: colors.semantic.success },
  statValWeak:   { color: colors.terra[500] },
  statValEmpty:  {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: colors.paper[200],
  },
  statLbl: {
    fontSize: 10,
    color: colors.paper[400],
    fontWeight: fontWeight.medium,
  },

  // ── 초대 힌트
  inviteHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  inviteHintTxt: {
    fontSize: fontSize.caption,
    color: colors.paper[400],
    flex: 1,
  },
  inviteCode: {
    fontWeight: fontWeight.bold,
    color: colors.sage[500],
    letterSpacing: 1,
  },

  // ── 탈퇴
  leaveBtn: {
    borderRadius: CARD_R,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.terra[200],
    backgroundColor: colors.terra[100],
  },
  leaveBtnTxt: {
    fontSize: fontSize.bodySmall,
    fontWeight: fontWeight.semibold,
    color: colors.terra[600],
  },
  });
}

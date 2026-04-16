import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Image, Platform,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGoogleAuth } from '../../src/firebase/auth';
import { syncAll } from '../../src/firebase/sync';
import { deleteAccount } from '../../src/firebase/account';
import { fontSize, fontWeight, spacing, radius, lineHeight, useColors, useTheme, ColorPalette, ThemePref } from '../../src/theme';

const THEME_OPTIONS: { key: ThemePref; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'system', label: '시스템', icon: 'phone-portrait-outline' },
  { key: 'light',  label: '라이트', icon: 'sunny-outline' },
  { key: 'dark',   label: '다크',   icon: 'moon-outline' },
];

export default function SettingsScreen() {
  const colors = useColors();
  const { pref, setPref } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const {
    user, loading, signingIn, error,
    signInWithGoogle, signOutUser,
  } = useGoogleAuth();

  function signInWithApple() {
    Alert.alert('준비 중', 'Apple 로그인은 현재 준비 중이에요.\nGoogle 로그인을 이용해주세요.');
  }
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSync() {
    if (!user) return;
    setSyncing(true);
    try {
      await syncAll(user.uid);
      const now = new Date();
      setLastSynced(
        `${now.getHours()}시 ${now.getMinutes().toString().padStart(2, '0')}분`
      );
      Alert.alert('동기화 완료', '학습 데이터가 클라우드에 저장됐어요!');
    } catch {
      Alert.alert('오류', '동기화 중 문제가 발생했어요. 인터넷 연결을 확인해주세요.');
    } finally {
      setSyncing(false);
    }
  }

  function handleSignOut() {
    Alert.alert(
      '로그아웃',
      '로그아웃 하시겠어요?\n로컬 학습 데이터는 유지됩니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: signOutUser },
      ]
    );
  }

  async function performDelete() {
    if (!user) return;
    setDeleting(true);
    try {
      await deleteAccount(user);
      Alert.alert('삭제 완료', '계정과 모든 데이터가 삭제됐어요.');
    } catch (e: any) {
      if (e?.code === 'auth/requires-recent-login') {
        Alert.alert(
          '재로그인 필요',
          '보안을 위해 다시 로그인이 필요해요.\n로그아웃 후 다시 로그인한 뒤 삭제를 시도해주세요.',
          [{ text: '확인', onPress: signOutUser }],
        );
      } else {
        Alert.alert('오류', '계정 삭제 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setDeleting(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      '계정 삭제',
      '계정과 클라우드에 저장된 모든 학습 데이터·그룹 정보가 영구 삭제돼요.\n이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              '정말 삭제할까요?',
              '마지막 확인이에요. 삭제하면 복구할 수 없어요.',
              [
                { text: '취소', style: 'cancel' },
                { text: '영구 삭제', style: 'destructive', onPress: performDelete },
              ],
            ),
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.sage[600]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>설정</Text>

        {/* ── 계정 ── */}
        <Text style={styles.sectionLabel}>계정</Text>
        {user ? (
          <View style={styles.sectionGroup}>
            <View style={[styles.row, styles.rowFirst]}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={22} color={colors.paper[300]} />
                </View>
              )}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.displayName ?? '사용자'}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.row, styles.rowDivider]}
              onPress={handleSync}
              disabled={syncing}
              activeOpacity={0.7}
            >
              <View style={styles.iconBox}>
                <Ionicons name="cloud-upload-outline" size={18} color={colors.sage[600]} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>클라우드 동기화</Text>
                <Text style={styles.rowSub}>
                  {syncing ? '동기화 중...' : lastSynced ? `마지막 동기화: ${lastSynced}` : '학습 진도를 서버에 백업'}
                </Text>
              </View>
              {syncing ? (
                <ActivityIndicator size="small" color={colors.sage[600]} />
              ) : (
                <Ionicons name="chevron-forward" size={16} color={colors.paper[400]} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.row, styles.rowDivider]}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, styles.iconBoxDanger]}>
                <Ionicons name="log-out-outline" size={18} color={colors.semantic.error} />
              </View>
              <Text style={[styles.rowTitle, { color: colors.semantic.error }]}>로그아웃</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.row, styles.rowDivider]}
              onPress={handleDeleteAccount}
              disabled={deleting}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, styles.iconBoxDanger]}>
                <Ionicons name="trash-outline" size={18} color={colors.semantic.error} />
              </View>
              <View style={styles.rowTextCol}>
                <Text style={[styles.rowTitle, { color: colors.semantic.error }]}>계정 삭제</Text>
                <Text style={styles.rowSub}>모든 클라우드 데이터가 영구 삭제돼요</Text>
              </View>
              {deleting && <ActivityIndicator size="small" color={colors.semantic.error} />}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sectionGroup}>
            <View style={styles.loginIntro}>
              <Text style={styles.loginEmoji}>☁️</Text>
              <Text style={styles.loginTitle}>Google 로그인</Text>
              <Text style={styles.loginSub}>
                로그인하면 학습 데이터가 클라우드에 저장돼{'\n'}
                기기 간 이어서 공부할 수 있어요
              </Text>
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.googleBtn, signingIn && styles.btnDisabled]}
                onPress={signInWithGoogle}
                disabled={signingIn}
              >
                {signingIn ? (
                  <ActivityIndicator color={colors.paper.white} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={18} color={colors.paper.white} />
                    <Text style={styles.googleBtnText}>Google로 로그인</Text>
                  </>
                )}
              </TouchableOpacity>
              {Platform.OS === 'ios' && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={
                    colors.paper.bg === '#FDFBF0'
                      ? AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                      : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  }
                  cornerRadius={radius.lg}
                  style={styles.appleBtn}
                  onPress={signInWithApple}
                />
              )}
              <Text style={styles.loginNote}>
                로그인 없이도 모든 학습 기능을 사용할 수 있어요
              </Text>
            </View>
          </View>
        )}

        {/* ── 학습 ── */}
        <Text style={styles.sectionLabel}>학습</Text>
        <View style={styles.sectionGroup}>
          <SettingRow
            icon="options-outline"
            iconColor={colors.sage[600]}
            title="학습 플랜 설정"
            sub="단어장 · 레벨 · 요일 · 알람"
            onPress={() => router.push('/plan' as any)}
            isFirst
            colors={colors}
            styles={styles}
          />
          <SettingRow
            icon="stats-chart-outline"
            iconColor={colors.sage[600]}
            title="학습 통계"
            sub="정답률 · 연속 학습 · 자주 틀리는 단어"
            onPress={() => router.push('/stats' as any)}
            colors={colors}
            styles={styles}
          />
          <SettingRow
            icon="albums-outline"
            iconColor={colors.sage[600]}
            title="단어장 관리"
            sub="추가 · 삭제 · 활성화"
            onPress={() => router.push('/wordbook/list')}
            colors={colors}
            styles={styles}
          />
        </View>

        {/* ── 화면 ── */}
        <Text style={styles.sectionLabel}>화면</Text>
        <View style={[styles.sectionGroup, styles.themePadding]}>
          <View style={styles.themeHeader}>
            <View style={styles.iconBox}>
              <Ionicons name="color-palette-outline" size={18} color={colors.paper[600]} />
            </View>
            <Text style={styles.rowTitle}>테마</Text>
          </View>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const on = pref === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.themeChip, on && styles.themeChipOn]}
                  onPress={() => setPref(opt.key)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={opt.icon}
                    size={16}
                    color={on ? colors.paper.white : colors.paper[600]}
                  />
                  <Text style={[styles.themeChipTxt, on && styles.themeChipTxtOn]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  sub?: string;
  onPress: () => void;
  isFirst?: boolean;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
}

function SettingRow({ icon, iconColor, title, sub, onPress, isFirst, colors, styles }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={[styles.row, isFirst ? styles.rowFirst : styles.rowDivider]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.rowTextCol}>
        <Text style={styles.rowTitle}>{title}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.paper[400]} />
    </TouchableOpacity>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.paper.bg,
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    wrap: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing['2xl'],
      paddingBottom: spacing.lg,
    },
    pageTitle: {
      fontSize: fontSize.h1,
      fontWeight: fontWeight.bold,
      color: colors.paper[900],
      marginBottom: spacing.xl,
    },

    // 섹션
    sectionLabel: {
      fontSize: fontSize.label,
      fontWeight: fontWeight.semibold,
      color: colors.paper[500],
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginLeft: spacing.xs,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    sectionGroup: {
      backgroundColor: colors.paper.white,
      borderRadius: radius.xl,
      borderWidth: 0.5,
      borderColor: colors.paper[200],
      overflow: 'hidden',
      marginBottom: spacing.lg,
    },

    // 행 공통
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 14,
      paddingHorizontal: spacing.lg,
    },
    rowFirst: {},
    rowDivider: {
      borderTopWidth: 0.5,
      borderTopColor: colors.paper[100],
    },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      backgroundColor: colors.sage[50],
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconBoxDanger: {
      backgroundColor: colors.terra[100],
    },
    rowTextCol: { flex: 1 },
    rowTitle: {
      fontSize: fontSize.bodySmall,
      fontWeight: fontWeight.semibold,
      color: colors.paper[900],
    },
    rowSub: {
      fontSize: fontSize.caption,
      color: colors.paper[500],
      marginTop: 2,
    },

    // 사용자 정보
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarPlaceholder: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.paper[50],
      borderWidth: 0.5,
      borderColor: colors.paper[200],
      justifyContent: 'center',
      alignItems: 'center',
    },
    userInfo: { flex: 1 },
    userName: {
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: colors.paper[900],
    },
    userEmail: {
      fontSize: fontSize.caption,
      color: colors.paper[500],
      marginTop: 2,
    },

    // 로그인 인트로
    loginIntro: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    loginEmoji: {
      fontSize: 44,
      marginBottom: spacing.sm,
    },
    loginTitle: {
      fontSize: fontSize.h2,
      fontWeight: fontWeight.semibold,
      color: colors.paper[900],
      marginBottom: spacing.sm,
    },
    loginSub: {
      fontSize: fontSize.bodySmall,
      color: colors.paper[500],
      textAlign: 'center',
      lineHeight: fontSize.bodySmall * lineHeight.relaxed,
      marginBottom: spacing.lg,
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
    googleBtn: {
      backgroundColor: '#4285F4',
      borderRadius: radius.lg,
      paddingVertical: 14,
      paddingHorizontal: spacing.xl,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.sm,
      width: '100%',
      marginBottom: spacing.sm,
    },
    googleBtnText: {
      color: colors.paper.white,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
    },
    appleBtn: {
      width: '100%',
      height: 48,
      marginBottom: spacing.sm,
    },
    btnDisabled: { opacity: 0.55 },
    loginNote: {
      fontSize: fontSize.caption - 1,
      color: colors.paper[400],
      textAlign: 'center',
    },

    // 테마
    themePadding: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    themeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    themeRow: {
      flexDirection: 'row',
      gap: 8,
      width: '100%',
    },
    themeChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      backgroundColor: colors.paper.bg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.paper[200],
    },
    themeChipOn: {
      backgroundColor: colors.sage[600],
      borderColor: colors.sage[600],
    },
    themeChipTxt: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: colors.paper[600],
    },
    themeChipTxtOn: { color: colors.paper.white },
  });
}

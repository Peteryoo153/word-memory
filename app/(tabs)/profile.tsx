import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGoogleAuth } from '../../src/firebase/auth';
import { syncAll } from '../../src/firebase/sync';
import { colors, fontSize, fontWeight, spacing, radius, lineHeight, letterSpacing } from '../../src/theme';

export default function ProfileScreen() {
  const { user, loading, signingIn, error, signInWithGoogle, signOutUser } = useGoogleAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

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

  async function handleSignOut() {
    Alert.alert(
      '로그아웃',
      '로그아웃 하시겠어요?\n로컬 학습 데이터는 유지됩니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: signOutUser },
      ]
    );
  }

  // 로딩 중
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.sage[600]} />
        </View>
      </SafeAreaView>
    );
  }

  // ── 로그인 전 ────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.wrap}>
          <Text style={styles.pageTitle}>프로필</Text>

          <View style={styles.card}>
            <Text style={styles.illustEmoji}>☁️</Text>
            <Text style={styles.illustTitle}>Google로 로그인하면</Text>
            <Text style={styles.illustSub}>
              학습 데이터가 클라우드에 저장돼서{'\n'}
              어느 기기에서든 이어서 공부할 수 있어요
            </Text>
          </View>

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

          <Text style={styles.loginNote}>
            로그인 없이도 모든 학습 기능을 사용할 수 있어요
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── 로그인 후 ────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrap}>
        <Text style={styles.pageTitle}>프로필</Text>

        {/* 사용자 정보 카드 */}
        <View style={[styles.card, styles.userCardRow]}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={28} color={colors.paper[300]} />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.displayName ?? '사용자'}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </View>

        {/* 동기화 카드 */}
        <View style={[styles.card, styles.syncCard]}>
          <View style={styles.syncHeader}>
            <Ionicons name="cloud-outline" size={20} color={colors.sage[500]} />
            <Text style={styles.syncTitle}>클라우드 동기화</Text>
          </View>
          <Text style={styles.syncSub}>
            버튼을 누르면 학습 진도가 서버에 저장되고,{'\n'}
            다른 기기에서도 이어서 공부할 수 있어요
          </Text>
          {lastSynced && (
            <Text style={styles.lastSynced}>마지막 동기화: {lastSynced}</Text>
          )}
          <TouchableOpacity
            style={[styles.syncBtn, syncing && styles.btnDisabled]}
            onPress={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color={colors.paper.white} />
            ) : (
              <>
                <Ionicons name="sync-outline" size={16} color={colors.paper.white} />
                <Text style={styles.syncBtnText}>지금 동기화</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={16} color={colors.semantic.error} />
          <Text style={styles.signOutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper.bg,
    paddingTop: spacing.lg,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  wrap: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.lg,
  },

  pageTitle: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.bold,
    color: colors.paper[900],
    marginBottom: spacing['2xl'],
  },

  // 공통 카드
  card: {
    backgroundColor: colors.paper.white,
    borderRadius: radius['2xl'],
    borderWidth: 0.5,
    borderColor: colors.paper[100],
    padding: spacing['2xl'],
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 3,
    // 로그인 전 카드는 중앙 정렬
    alignItems: 'center' as const,
  },

  // 로그인 전
  illustEmoji: { fontSize: 52, marginBottom: spacing.lg },
  illustTitle: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.semibold,
    color: colors.paper[900],
    marginBottom: spacing.sm,
  },
  illustSub: {
    fontSize: fontSize.bodySmall,
    color: colors.paper[500],
    textAlign: 'center',
    lineHeight: fontSize.bodySmall * lineHeight.relaxed,
  },
  errorBox: {
    backgroundColor: colors.terra[100],
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  errorText: { color: colors.semantic.error, fontSize: fontSize.caption, textAlign: 'center' },

  googleBtn: {
    backgroundColor: '#4285F4',
    borderRadius: radius['2xl'],
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 3,
  },
  googleBtnText: { color: colors.paper.white, fontSize: fontSize.body, fontWeight: fontWeight.medium },
  btnDisabled: { opacity: 0.55 },
  loginNote: { fontSize: fontSize.caption - 1, color: colors.paper[400], textAlign: 'center' },

  // 로그인 후 — 사용자 카드 (row layout으로 override)
  userCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.paper[50],
    borderWidth: 0.5,
    borderColor: colors.paper[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.paper[900], marginBottom: spacing.xs },
  userEmail: { fontSize: fontSize.caption, color: colors.paper[500] },

  // 동기화 카드
  syncCard: {
    backgroundColor: colors.sage[50],
    borderColor: colors.sage[200],
    alignItems: 'flex-start',
  },
  syncHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  syncTitle: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.sage[800] },
  syncSub: {
    fontSize: fontSize.caption,
    color: colors.sage[600],
    lineHeight: fontSize.caption * lineHeight.relaxed,
    marginBottom: spacing.md,
  },
  lastSynced: { fontSize: fontSize.caption - 1, color: colors.sage[500], marginBottom: spacing.md },
  syncBtn: {
    backgroundColor: colors.sage[600],
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  syncBtnText: { color: colors.paper.white, fontSize: fontSize.bodySmall, fontWeight: fontWeight.medium },

  // 로그아웃
  signOutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.terra[100],
    borderWidth: 0.5,
    borderColor: colors.terra[200],
  },
  signOutText: { color: colors.semantic.error, fontSize: fontSize.bodySmall, fontWeight: fontWeight.medium },
});

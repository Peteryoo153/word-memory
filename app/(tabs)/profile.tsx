import { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGoogleAuth } from '../../src/firebase/auth';
import { syncAll } from '../../src/firebase/sync';

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
    } catch (e) {
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
          <ActivityIndicator size="large" color="#4A90D9" />
        </View>
      </SafeAreaView>
    );
  }

  // 로그인 전
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginWrap}>
          <Text style={styles.pageTitle}>프로필</Text>

          <View style={styles.illustBox}>
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
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#fff" />
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

  // 로그인 후
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileWrap}>
        <Text style={styles.pageTitle}>프로필</Text>

        {/* 사용자 정보 카드 */}
        <View style={styles.userCard}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={32} color="#9BA3AF" />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.displayName ?? '사용자'}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </View>

        {/* 동기화 카드 */}
        <View style={styles.syncCard}>
          <View style={styles.syncHeader}>
            <Ionicons name="cloud-outline" size={22} color="#4A90D9" />
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
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sync-outline" size={18} color="#fff" />
                <Text style={styles.syncBtnText}>지금 동기화</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // 로그인 전
  loginWrap: { flex: 1, padding: 24, paddingTop: 32 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 32 },
  illustBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  illustEmoji: { fontSize: 56, marginBottom: 16 },
  illustTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  illustSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#B91C1C', fontSize: 13, textAlign: 'center' },
  googleBtn: {
    backgroundColor: '#4285F4',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  googleBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  loginNote: { fontSize: 12, color: '#9BA3AF', textAlign: 'center' },

  // 로그인 후
  profileWrap: { flex: 1, padding: 24, paddingTop: 32 },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  userEmail: { fontSize: 13, color: '#6B7280' },
  syncCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  syncHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  syncTitle: { fontSize: 16, fontWeight: '700', color: '#1E40AF' },
  syncSub: { fontSize: 13, color: '#3B82F6', lineHeight: 20, marginBottom: 12 },
  lastSynced: { fontSize: 12, color: '#60A5FA', marginBottom: 12 },
  syncBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  syncBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  signOutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
  },
  signOutText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
});

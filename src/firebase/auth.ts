import { useState, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './config';

// Expo가 OAuth 리다이렉트를 처리하도록 등록
WebBrowser.maybeCompleteAuthSession();

// ─────────────────────────────────────────────────────────────────────────────
// 실행 환경별 iOS 클라이언트 ID
//
//  storeClient (Expo Go)  → 번들 ID: host.exp.exponent
//  bare (Development Build) / standalone (Production)
//                         → 번들 ID: com.wordmemo.app
//
// Google Cloud Console에서 각 번들 ID에 맞는 iOS 클라이언트를 별도 등록해야 함.
// ─────────────────────────────────────────────────────────────────────────────
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const GOOGLE_CLIENT_IDS = {
  webClientId: '80364629052-u4vc4mq4rrukaj3dikmjitjuqrpcu50n.apps.googleusercontent.com',
  // Expo Go: host.exp.exponent 번들용 클라이언트 ID
  iosClientIdExpoGo: '80364629052-foutf6riq3eo56qgm5f1bek34j9q2i4p.apps.googleusercontent.com',
  // Development Build / Production: com.wordmemo.app 번들용 클라이언트 ID
  iosClientIdNative: '80364629052-n5g5hjt60nnptv6fskdks5oabpuub5sm.apps.googleusercontent.com',
};

const iosClientId = isExpoGo
  ? GOOGLE_CLIENT_IDS.iosClientIdExpoGo
  : GOOGLE_CLIENT_IDS.iosClientIdNative;

// Google 로그인 전체 흐름을 관리하는 훅
export function useGoogleAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.webClientId,
    iosClientId,
  });

  // 앱 시작 시 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Google OAuth 응답 처리
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleToken(authentication.accessToken);
      }
    } else if (response?.type === 'error') {
      setError('Google 로그인 중 오류가 발생했어요. 다시 시도해주세요.');
      setSigningIn(false);
    }
  }, [response]);

  async function handleGoogleToken(accessToken: string) {
    try {
      setSigningIn(true);
      const credential = GoogleAuthProvider.credential(null, accessToken);
      await signInWithCredential(auth, credential);
      setError(null);
    } catch (e) {
      setError('Firebase 인증 중 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setSigningIn(false);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    setSigningIn(true);
    try {
      await promptAsync();
    } catch (e) {
      setError('로그인 창을 열 수 없어요. 다시 시도해주세요.');
      setSigningIn(false);
    }
  }

  async function signOutUser() {
    await signOut(auth);
  }

  return { user, loading, signingIn, error, signInWithGoogle, signOutUser, request };
}

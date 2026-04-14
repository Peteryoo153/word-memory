import { useState, useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
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

const GOOGLE_CLIENT_IDS = {
  webClientId: '80364629052-u4vc4mq4rrukaj3dikmjitjuqrpcu50n.apps.googleusercontent.com',
  iosClientId: '80364629052-foutf6riq3eo56qgm5f1bek34j9q2i4p.apps.googleusercontent.com',
};

// Google 로그인 전체 흐름을 관리하는 훅
export function useGoogleAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.webClientId,
    iosClientId: GOOGLE_CLIENT_IDS.iosClientId,
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

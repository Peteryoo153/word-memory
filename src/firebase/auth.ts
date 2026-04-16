import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Expo가 OAuth 리다이렉트를 처리하도록 등록
WebBrowser.maybeCompleteAuthSession();

// ─────────────────────────────────────────────────────────────────────────────
// 실행 환경별 iOS 클라이언트 ID
//
//  storeClient (Expo Go)  → 번들 ID: host.exp.exponent
//  bare (Development Build) / standalone (Production)
//                         → 번들 ID: com.peteryoo153.wordmemo
//
// Google Cloud Console에서 각 번들 ID에 맞는 iOS 클라이언트를 별도 등록해야 함.
// ─────────────────────────────────────────────────────────────────────────────
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const GOOGLE_CLIENT_IDS = {
  webClientId: '80364629052-u4vc4mq4rrukaj3dikmjitjuqrpcu50n.apps.googleusercontent.com',
  iosClientIdExpoGo: '80364629052-foutf6riq3eo56qgm5f1bek34j9q2i4p.apps.googleusercontent.com',
  iosClientIdNative: '80364629052-n5g5hjt60nnptv6fskdks5oabpuub5sm.apps.googleusercontent.com',
};

const iosClientId = isExpoGo
  ? GOOGLE_CLIENT_IDS.iosClientIdExpoGo
  : GOOGLE_CLIENT_IDS.iosClientIdNative;

// Google + Apple 로그인을 함께 관리하는 통합 훅 (@react-native-firebase/auth 사용)
export function useAuth() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_IDS.webClientId,
    iosClientId,
  });

  // 앱 시작 시 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Apple 로그인 가능 여부(iOS 13+ 실기기/시뮬레이터) 확인
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  // Google OAuth 응답 처리
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleToken(authentication.accessToken, authentication.idToken ?? null);
      }
    } else if (response?.type === 'error') {
      setError('Google 로그인 중 오류가 발생했어요. 다시 시도해주세요.');
      setSigningIn(false);
    }
  }, [response]);

  async function handleGoogleToken(accessToken: string, idToken: string | null) {
    try {
      setSigningIn(true);
      const credential = auth.GoogleAuthProvider.credential(idToken, accessToken);
      await auth().signInWithCredential(credential);
      setError(null);
    } catch {
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
    } catch {
      setError('로그인 창을 열 수 없어요. 다시 시도해주세요.');
      setSigningIn(false);
    }
  }

  async function signInWithApple() {
    setError(null);
    setSigningIn(true);
    try {
      console.log('[AppleSignIn] ===== START =====');
      console.log('[AppleSignIn] executionEnvironment:', Constants.executionEnvironment);
      console.log('[AppleSignIn] bundleId(app.json):', 'com.peteryoo153.wordmemo');
      console.log('[AppleSignIn] using @react-native-firebase/auth');

      // Apple 로그인은 nonce 검증을 요구. raw nonce를 SHA256으로 해시해 전달.
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      console.log('[AppleSignIn] rawNonce:', rawNonce);
      console.log('[AppleSignIn] hashedNonce:', hashedNonce);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      console.log('[AppleSignIn] Apple credential received');
      console.log('[AppleSignIn] user:', credential.user);
      console.log('[AppleSignIn] email:', credential.email);
      console.log('[AppleSignIn] realUserStatus:', credential.realUserStatus);
      console.log('[AppleSignIn] identityToken prefix:', credential.identityToken?.slice(0, 20));
      console.log('[AppleSignIn] authorizationCode prefix:', credential.authorizationCode?.slice(0, 20));

      // identityToken의 aud(audience) 확인을 위해 JWT payload decode
      if (credential.identityToken) {
        try {
          const parts = credential.identityToken.split('.');
          const payload = JSON.parse(
            // base64url → base64 변환 후 atob로 디코드
            globalThis.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
          );
          console.log('[AppleSignIn] idToken payload.iss:', payload.iss);
          console.log('[AppleSignIn] idToken payload.aud:', payload.aud);
          console.log('[AppleSignIn] idToken payload.sub:', payload.sub);
          console.log('[AppleSignIn] idToken payload.nonce:', payload.nonce);
          console.log('[AppleSignIn] idToken payload.nonce_supported:', payload.nonce_supported);
        } catch (decodeErr) {
          console.log('[AppleSignIn] failed to decode idToken payload:', decodeErr);
        }
      }

      if (!credential.identityToken) {
        throw new Error('Apple identity token missing');
      }

      // @react-native-firebase/auth의 AppleAuthProvider로 credential 생성
      // native SDK가 aud 검증을 올바르게 처리 (JS SDK의 host.exp.exponent 버그 회피)
      const appleCredential = auth.AppleAuthProvider.credential(
        credential.identityToken,
        rawNonce,
      );

      console.log('[AppleSignIn] appleCredential.providerId:', appleCredential.providerId);
      console.log('[AppleSignIn] calling auth().signInWithCredential (RNFB)...');

      const userCred = await auth().signInWithCredential(appleCredential);
      console.log('[AppleSignIn] SUCCESS uid:', userCred.user.uid);
    } catch (e: any) {
      // 사용자 취소는 에러 메시지 표시하지 않음
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        console.log('[AppleSignIn] ===== ERROR =====');
        console.log('[AppleSignIn] error.code:', e?.code);
        console.log('[AppleSignIn] error.message:', e?.message);
        console.log('[AppleSignIn] error.name:', e?.name);
        console.log('[AppleSignIn] error.customData:', JSON.stringify(e?.customData, null, 2));
        console.log('[AppleSignIn] error keys:', Object.keys(e ?? {}));
        console.log('[AppleSignIn] full error:', JSON.stringify(e, Object.getOwnPropertyNames(e ?? {}), 2));
        const code = e?.code ? ` (${e.code})` : '';
        setError(`Apple 로그인 오류${code}: ${e?.message ?? '알 수 없는 오류'}`);
      }
    } finally {
      setSigningIn(false);
    }
  }

  async function signOutUser() {
    await auth().signOut();
  }

  return {
    user,
    loading,
    signingIn,
    error,
    appleAvailable,
    signInWithGoogle,
    signInWithApple,
    signOutUser,
    request,
  };
}

// 기존 호출부 호환용 alias (점진적 마이그레이션)
export const useGoogleAuth = useAuth;

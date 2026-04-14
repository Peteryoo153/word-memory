import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            'AIzaSyAWarV57fltGl4MCZdScpvrla4g0nHZXGM',
  authDomain:        'word-memo-74c42.firebaseapp.com',
  projectId:         'word-memo-74c42',
  storageBucket:     'word-memo-74c42.firebasestorage.app',
  messagingSenderId: '80364629052',
  appId:             '1:80364629052:web:c9876553e732f654256739',
  measurementId:     'G-69DE6T3W26',
};

// 앱이 이미 초기화됐을 때 중복 초기화 방지
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth: AsyncStorage로 로그인 상태 유지 (앱 껐다 켜도 로그인 유지)
const auth = getApps().length === 0
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);

const db = getFirestore(app);

export { app, auth, db };

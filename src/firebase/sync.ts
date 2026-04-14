import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { getAllProgress, saveWordProgress } from '../storage';
import { AppSettings, WordProgress } from '../types';

// Firestore 경로 구조:
// users/{userId}/progress/{wordId}  ← 단어별 학습 진도
// users/{userId}/settings/app       ← 앱 설정

// ── 업로드: 로컬 진도 → Firestore ───────────────────────────
export async function uploadProgress(userId: string): Promise<void> {
  const local = await getAllProgress();
  const entries = Object.values(local);
  if (entries.length === 0) return;

  // writeBatch: 여러 문서를 한 번에 저장 (빠르고 안전)
  const batch = writeBatch(db);
  for (const progress of entries) {
    const ref = doc(db, 'users', userId, 'progress', progress.wordId);
    batch.set(ref, progress, { merge: true });
  }
  await batch.commit();
}

// ── 다운로드: Firestore → 로컬 진도 (머지) ─────────────────
export async function downloadProgress(userId: string): Promise<void> {
  const snap = await getDocs(collection(db, 'users', userId, 'progress'));
  for (const docSnap of snap.docs) {
    const remote = docSnap.data() as WordProgress;
    const local = (await getAllProgress())[remote.wordId];

    // 더 최근에 학습한 쪽 데이터를 채택
    if (!local || remote.lastStudiedAt >= local.lastStudiedAt) {
      await saveWordProgress(remote);
    }
  }
}

// ── 설정 업로드 ─────────────────────────────────────────────
export async function uploadSettings(userId: string, settings: AppSettings): Promise<void> {
  const ref = doc(db, 'users', userId, 'settings', 'app');
  await setDoc(ref, settings, { merge: true });
}

// ── 설정 다운로드 ───────────────────────────────────────────
export async function downloadSettings(userId: string): Promise<AppSettings | null> {
  const ref = doc(db, 'users', userId, 'settings', 'app');
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as AppSettings;
  return null;
}

// ── 전체 동기화 (업로드 + 다운로드) ────────────────────────
export async function syncAll(userId: string): Promise<void> {
  await uploadProgress(userId);
  await downloadProgress(userId);
}

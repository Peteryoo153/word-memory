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
import { WordbookProgress } from '../types/wordbook';
import { getProgress, saveProgress, getWordbookIds } from '../storage/wordbookStorage';

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

// ── WordbookProgress Firestore 동기화 ───────────────────
// 경로: users/{userId}/wordbook_progress/{wordbookId}

export async function uploadWordbookProgress(
  userId: string,
  wordbookId: string,
): Promise<void> {
  const progress = await getProgress(wordbookId);
  const ref = doc(db, 'users', userId, 'wordbook_progress', wordbookId);
  await setDoc(ref, progress, { merge: true });
}

export async function downloadWordbookProgress(
  userId: string,
  wordbookId: string,
): Promise<void> {
  const ref = doc(db, 'users', userId, 'wordbook_progress', wordbookId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const remote = snap.data() as WordbookProgress;
  const local = await getProgress(wordbookId);

  // 더 최근 데이터 채택 (lastStudiedAt 비교)
  if (!local.lastStudiedAt || remote.lastStudiedAt >= local.lastStudiedAt) {
    await saveProgress(remote);
  }
}

/** 보유한 모든 단어장 진도 업로드 */
export async function uploadAllWordbookProgress(userId: string): Promise<void> {
  const ids = await getWordbookIds();
  await Promise.all(ids.map((id) => uploadWordbookProgress(userId, id)));
}

/** 보유한 모든 단어장 진도 다운로드 (다기기 동기화) */
export async function downloadAllWordbookProgress(userId: string): Promise<void> {
  const snap = await getDocs(collection(db, 'users', userId, 'wordbook_progress'));
  await Promise.all(
    snap.docs.map(async (d) => {
      const remote = d.data() as WordbookProgress;
      const local = await getProgress(remote.wordbookId);
      if (!local.lastStudiedAt || remote.lastStudiedAt >= local.lastStudiedAt) {
        await saveProgress(remote);
      }
    }),
  );
}

/** 단어장 진도 전체 동기화 (업로드 + 다운로드) */
export async function syncAllWordbookProgress(userId: string): Promise<void> {
  await uploadAllWordbookProgress(userId);
  await downloadAllWordbookProgress(userId);
}

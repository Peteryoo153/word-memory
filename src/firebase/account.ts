import {
  collection, getDocs, deleteDoc, doc, writeBatch,
} from 'firebase/firestore';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { db } from './config';
import { getUserGroupId, leaveGroup, getGroupData } from './groupStorage';

// ── Firestore 사용자 데이터 전체 삭제 ─────────────────────────
async function deleteCollection(path: string[]): Promise<void> {
  const snap = await getDocs(collection(db, path[0], ...path.slice(1)));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function deleteFirestoreUserData(userId: string): Promise<void> {
  // 1) 그룹 정리: 오너면 그룹 해체, 아니면 탈퇴
  const groupId = await getUserGroupId(userId);
  if (groupId) {
    const data = await getGroupData(groupId);
    const isOwner = data?.group.ownerId === userId;
    await leaveGroup(userId, groupId, isOwner);
  }

  // 2) users/{uid} 하위 컬렉션 일괄 삭제
  await Promise.all([
    deleteCollection(['users', userId, 'progress']),
    deleteCollection(['users', userId, 'wordbook_progress']),
    deleteCollection(['users', userId, 'settings']),
  ]);

  // 3) userGroups/{uid} 매핑 문서 (남아 있다면)
  await deleteDoc(doc(db, 'userGroups', userId)).catch(() => {});
}

/**
 * 계정 완전 삭제: Firestore 데이터 → Firebase Auth 계정.
 * 최근 로그인이 만료된 경우 'auth/requires-recent-login' 에러를 그대로 throw.
 * 호출부에서 catch 후 재로그인 안내 필요.
 */
export async function deleteAccount(user: FirebaseAuthTypes.User): Promise<void> {
  await deleteFirestoreUserData(user.uid);
  await user.delete();
}

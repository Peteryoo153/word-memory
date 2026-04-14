import {
  doc, setDoc, getDoc, getDocs,
  collection, query, where,
  runTransaction, deleteDoc,
  onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { Group, GroupMember, GroupActivity } from '../types/group';

// ── 내부 유틸 ────────────────────────────────────────────────

function generateInviteCode(): string {
  // 혼동하기 쉬운 문자(0, O, I, 1) 제외
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

// ── 유저 그룹 조회 ───────────────────────────────────────────

/**
 * 유저가 속한 그룹 ID 조회.
 * userGroups/{userId} 문서의 groupId 필드를 읽음.
 */
export async function getUserGroupId(userId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'userGroups', userId));
  return snap.exists() ? (snap.data().groupId as string) : null;
}

// ── 그룹 CRUD ────────────────────────────────────────────────

/** 새 그룹 생성 + 오너 멤버로 등록 */
export async function createGroup(
  userId: string,
  displayName: string,
  photoURL: string,
  groupName: string,
): Promise<Group> {
  const groupId = `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const inviteCode = generateInviteCode();
  const now = new Date().toISOString();

  const group: Group = { id: groupId, name: groupName.trim(), inviteCode, ownerId: userId, createdAt: now };
  const member: GroupMember = { userId, displayName, photoURL, role: 'owner', joinedAt: now };

  await setDoc(doc(db, 'groups', groupId), group);
  await setDoc(doc(db, 'groups', groupId, 'members', userId), member);
  await setDoc(doc(db, 'userGroups', userId), { groupId });

  return group;
}

/** 초대 코드로 그룹 참여 */
export async function joinGroup(
  userId: string,
  displayName: string,
  photoURL: string,
  inviteCode: string,
): Promise<Group | null> {
  const q = query(
    collection(db, 'groups'),
    where('inviteCode', '==', inviteCode.toUpperCase().trim()),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const group = snap.docs[0].data() as Group;
  const now = new Date().toISOString();
  const member: GroupMember = { userId, displayName, photoURL, role: 'member', joinedAt: now };

  await setDoc(doc(db, 'groups', group.id, 'members', userId), member);
  await setDoc(doc(db, 'userGroups', userId), { groupId: group.id });

  return group;
}

/** 그룹 탈퇴. 오너라면 그룹 전체 해체 */
export async function leaveGroup(
  userId: string,
  groupId: string,
  isOwner: boolean,
): Promise<void> {
  if (isOwner) {
    // 모든 멤버의 userGroups 문서 삭제 후 그룹 해체
    const membersSnap = await getDocs(collection(db, 'groups', groupId, 'members'));
    for (const d of membersSnap.docs) {
      await deleteDoc(doc(db, 'userGroups', d.id));
      await deleteDoc(d.ref);
    }
    const activitiesSnap = await getDocs(collection(db, 'groups', groupId, 'activities'));
    for (const d of activitiesSnap.docs) await deleteDoc(d.ref);
    await deleteDoc(doc(db, 'groups', groupId));
  } else {
    await deleteDoc(doc(db, 'groups', groupId, 'members', userId));
    await deleteDoc(doc(db, 'groups', groupId, 'activities', userId));
    await deleteDoc(doc(db, 'userGroups', userId));
  }
}

// ── 데이터 조회 ──────────────────────────────────────────────

export interface GroupData {
  group: Group;
  members: GroupMember[];
  activities: GroupActivity[];
}

/** 그룹 전체 데이터 1회 조회 */
export async function getGroupData(groupId: string): Promise<GroupData | null> {
  const groupSnap = await getDoc(doc(db, 'groups', groupId));
  if (!groupSnap.exists()) return null;

  const group = groupSnap.data() as Group;

  const [membersSnap, activitiesSnap] = await Promise.all([
    getDocs(collection(db, 'groups', groupId, 'members')),
    getDocs(collection(db, 'groups', groupId, 'activities')),
  ]);

  return {
    group,
    members: membersSnap.docs.map((d) => d.data() as GroupMember),
    activities: activitiesSnap.docs.map((d) => d.data() as GroupActivity),
  };
}

/** 그룹 활동 실시간 구독 */
export function subscribeGroupActivities(
  groupId: string,
  onUpdate: (activities: GroupActivity[]) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'groups', groupId, 'activities'),
    (snap) => onUpdate(snap.docs.map((d) => d.data() as GroupActivity)),
  );
}

// ── 활동 기록 ────────────────────────────────────────────────

/**
 * 학습 세션 완료 후 호출.
 * 오늘 날짜가 바뀌면 todayLearnedCount / todayStudyMinutes 리셋.
 */
export async function updateStudyActivity(
  userId: string,
  displayName: string,
  photoURL: string,
  learnedCount: number,
  studyMinutes: number,
): Promise<void> {
  const groupId = await getUserGroupId(userId);
  if (!groupId) return;

  const t = today();
  const ref = doc(db, 'groups', groupId, 'activities', userId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      const data = snap.data() as GroupActivity;
      const isToday = data.todayDate === t;
      tx.set(ref, {
        ...data,
        displayName,
        photoURL,
        todayDate: t,
        todayLearnedCount: isToday ? data.todayLearnedCount + learnedCount : learnedCount,
        todayStudyMinutes: isToday ? data.todayStudyMinutes + studyMinutes : studyMinutes,
        totalLearnedWords: (data.totalLearnedWords ?? 0) + learnedCount,
        updatedAt: new Date().toISOString(),
      });
    } else {
      tx.set(ref, {
        userId, displayName, photoURL,
        todayDate: t,
        todayLearnedCount: learnedCount,
        todayStudyMinutes: studyMinutes,
        lastTestScore: null,
        lastTestDate: null,
        totalLearnedWords: learnedCount,
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

/**
 * 테스트 완료 후 호출.
 * lastTestScore / lastTestDate 업데이트.
 */
export async function updateTestScore(
  userId: string,
  displayName: string,
  photoURL: string,
  score: number,
): Promise<void> {
  const groupId = await getUserGroupId(userId);
  if (!groupId) return;

  const t = today();
  const ref = doc(db, 'groups', groupId, 'activities', userId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await setDoc(ref, {
      ...snap.data(),
      displayName,
      photoURL,
      lastTestScore: score,
      lastTestDate: t,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } else {
    await setDoc(ref, {
      userId, displayName, photoURL,
      todayDate: t,
      todayLearnedCount: 0,
      todayStudyMinutes: 0,
      lastTestScore: score,
      lastTestDate: t,
      totalLearnedWords: 0,
      updatedAt: new Date().toISOString(),
    });
  }
}

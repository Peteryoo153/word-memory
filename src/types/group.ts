export interface Group {
  id: string;
  name: string;
  inviteCode: string;   // 6자리 대문자
  ownerId: string;
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  displayName: string;
  photoURL: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface GroupActivity {
  userId: string;
  displayName: string;
  photoURL: string;
  todayDate: string;              // YYYY-MM-DD (오늘 날짜 기준 리셋)
  todayLearnedCount: number;      // 오늘 학습한 단어 수
  todayStudyMinutes: number;      // 오늘 학습한 시간(분)
  lastTestScore: number | null;   // 마지막 테스트 점수 (0–100)
  lastTestDate: string | null;    // 마지막 테스트 날짜
  totalLearnedWords: number;      // 누적 학습 단어 수
  updatedAt: string;
}

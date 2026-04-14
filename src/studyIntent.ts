/**
 * 학습 완료 화면에서 "테스트하기" 버튼을 눌렀을 때
 * 테스트 화면에 "오늘 단어 전체 테스트" 의도를 전달하는 모듈.
 * 탭 내비게이션에서 query param 없이 안정적으로 신호를 전달하기 위해 사용.
 */

let _todayTestPending = false;

export function setTodayTestIntent(): void {
  _todayTestPending = true;
}

/** 호출 후 플래그는 즉시 초기화됨 (one-shot) */
export function consumeTodayTestIntent(): boolean {
  const v = _todayTestPending;
  _todayTestPending = false;
  return v;
}

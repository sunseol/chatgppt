function item(index, screen, role, name, options = {}) {
  return {
    id: `GPPT-UI-${String(index).padStart(3, "0")}`,
    screen,
    role,
    name,
    exact: true,
    expectedEnabled: options.expectedEnabled ?? true,
  };
}

export const GPPT_UI_CONTRACT = [
  item(1, "home-empty", "button", "새 프로젝트"),
  item(2, "home-empty", "button", "첫 프로젝트 만들기"),
  item(3, "home-empty", "button", "연결 및 실행 환경"),
  item(4, "home-empty", "button", "로컬 데이터"),
  item(5, "home-empty", "button", "도움말"),
  item(6, "home-empty", "button", "로컬 데이터 보기"),
  item(7, "settings-dialog", "button", "Codex 상태 확인"),
  item(8, "settings-dialog", "button", "Codex 로그인"),
  item(9, "settings-dialog", "button", "연결 확인"),
  item(10, "settings-dialog", "button", "Provider 기능 상세"),
  item(11, "local-data-empty", "button", "전체 프로젝트 내보내기", {
    expectedEnabled: false,
  }),
  item(12, "local-data-empty", "button", "전체 로컬 삭제", { expectedEnabled: false }),
  item(13, "new-project-dialog", "button", "AI 슬라이드 제작 시스템 피치덱"),
  item(14, "new-project-dialog", "button", "2026 상반기 마케팅 성과 보고"),
  item(15, "new-project-dialog", "button", "한국 전기차 시장 분석"),
  item(16, "new-project-dialog", "textbox", "프로젝트 이름"),
  item(17, "new-project-dialog", "textbox", "초기 프롬프트"),
  item(18, "new-project-dialog", "spinbutton", "슬라이드 수"),
  item(19, "new-project-dialog", "radio", "16:9"),
  item(20, "new-project-dialog", "radio", "4:3"),
  item(21, "new-project-dialog", "radio", "한국어"),
  item(22, "new-project-dialog", "radio", "English"),
  item(23, "new-project-dialog", "radio", "Mixed"),
  item(24, "new-project-dialog", "button", "Codex 상태 확인"),
  item(25, "new-project-dialog", "button", "프로젝트 만들기"),
  item(26, "interview-initial", "link", "프로젝트 목록"),
  item(27, "interview-initial", "button", "Codex 연결 설정 열기"),
  item(28, "interview-initial", "button", "라이브 인터뷰 실행"),
  item(29, "interview-questions", "textbox", "이 덱으로 어떤 다음 행동을 유도하나요?"),
  item(30, "interview-questions", "button", "아래 답변 입력 영역 사용", {
    expectedEnabled: false,
  }),
  item(31, "interview-questions", "button", "답변 제출하고 브리프 생성", {
    expectedEnabled: false,
  }),
  item(32, "interview-answered", "button", "답변 제출하고 브리프 생성"),
  item(33, "interview-brief", "button", "Live brief 승인하고 조사로 이동"),
  item(34, "research", "link", "프로젝트 목록"),
  item(35, "research", "button", "Codex 연결 설정 열기"),
  item(36, "research", "button", "조사팩 생성 시작"),
  item(37, "home-project", "button", "Finder에서 열기"),
  item(38, "home-project", "button", "프로젝트 폴더 내보내기"),
  item(39, "home-project", "button", "프로젝트 카드 로컬 삭제"),
  item(40, "home-project", "button", "프로젝트 열기"),
];

export function validateContractDefinition(contract) {
  const issues = [];
  const seen = new Set();
  contract.forEach((entry, index) => {
    const expectedId = `GPPT-UI-${String(index + 1).padStart(3, "0")}`;
    if (entry.id !== expectedId) issues.push(`${entry.id}: expected ${expectedId}`);
    if (seen.has(entry.id)) issues.push(`${entry.id}: duplicate id`);
    seen.add(entry.id);
    if (entry.exact !== true) issues.push(`${entry.id}: exact must be true`);
    if (!entry.screen || !entry.role || !entry.name) issues.push(`${entry.id}: incomplete entry`);
  });
  if (contract.length !== 40) issues.push(`expected 40 entries, received ${contract.length}`);
  return issues;
}

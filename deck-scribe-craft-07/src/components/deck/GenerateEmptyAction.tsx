import { EmptyAction } from "@/components/deck/stage-shared";

export function GenerateEmptyAction({
  generationReady,
  missingLiveRunner,
  busy,
  onGenerate,
}: {
  readonly generationReady: boolean;
  readonly missingLiveRunner: boolean;
  readonly busy: boolean;
  readonly onGenerate: () => void;
}) {
  const label = !generationReady
    ? "실제 이미지 경로 결정 레코드가 필요합니다."
    : missingLiveRunner
      ? "네이티브 OpenAI image transport 연결 필요"
      : "승인한 레이아웃으로 슬라이드 이미지 생성";
  return (
    <EmptyAction
      label={label}
      actionLabel={label}
      busy={busy}
      disabled={!generationReady || missingLiveRunner}
      onClick={onGenerate}
    />
  );
}

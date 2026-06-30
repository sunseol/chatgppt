import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createClientNewProjectProviderMatrixInput } from "@/lib/client-provider-runtime-selection";
import { createProject } from "@/lib/deck-store";
import { getDesktopAppServerBridgeStatus } from "@/lib/desktop-app-server-bridge";
import {
  createProviderCapabilityMatrixView,
  type ProviderCapabilityMatrixView,
} from "@/lib/provider-capability-view";
import type { ProductionTextWorkflowBridgeStatus } from "@/lib/production-text-workflow-gate";

const SAMPLES = [
  {
    name: "AI 슬라이드 제작 시스템 피치덱",
    prompt:
      "초기 VC 대상으로 우리 제품(검증 기반 AI PPT 도구)을 소개하는 5장 분량 피치덱을 만들어줘. 문제 정의, 시장, 솔루션, 차별점, 비즈니스 모델을 포함.",
    count: 5,
  },
  {
    name: "2026 상반기 마케팅 성과 보고",
    prompt:
      "임원 대상 내부 보고용. 채널별 성과, 핵심 캠페인, 학습, 다음 분기 계획. 데이터 기반으로 절제된 톤.",
    count: 10,
  },
  {
    name: "한국 전기차 시장 분석",
    prompt:
      "정책 변화, 신규 등록 추이, 충전 인프라, 주요 플레이어, 향후 시나리오를 다루는 리서치 발표 자료.",
    count: 8,
  },
];

export function NewProjectForm({
  onCreated,
  onOpenConnectionSettings,
}: {
  readonly onCreated?: () => void;
  readonly onOpenConnectionSettings?: () => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(5);
  const [ratio, setRatio] = useState<"16:9" | "4:3">("16:9");
  const [lang, setLang] = useState<"ko" | "en" | "mixed">("ko");
  const [appServerBridge, setAppServerBridge] =
    useState<ProductionTextWorkflowBridgeStatus>("missing");
  const providerMatrix = createProviderCapabilityMatrixView(
    createClientNewProjectProviderMatrixInput({
      isProductionBuild: import.meta.env.PROD,
      appServerBridge,
    }),
  );

  useEffect(() => {
    setAppServerBridge(getDesktopAppServerBridgeStatus());
  }, []);

  const submit = () => {
    if (!name.trim() || !prompt.trim()) return;
    const p = createProject({
      name: name.trim(),
      initialPrompt: prompt.trim(),
      slideCount: count,
      aspectRatio: ratio,
      language: lang,
    });
    onCreated?.();
    navigate({ to: "/project/$projectId/$step", params: { projectId: p.id, step: "interview" } });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SAMPLES.map((s) => (
          <button
            key={s.name}
            aria-label={s.name}
            onClick={() => {
              setName(s.name);
              setPrompt(s.prompt);
              setCount(s.count);
            }}
            className="min-w-0 rounded border border-border bg-paper p-4 text-left transition-colors hover:border-foreground/40"
          >
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              프로젝트 프리셋
            </div>
            <div className="mt-2 text-sm font-medium">{s.name}</div>
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.prompt}</div>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">프로젝트 이름</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 2026 Q3 투자 유치 피치덱"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt">초기 프롬프트</Label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder="누구에게, 무엇을, 왜 보여주고 싶은지 한 문단으로 적어주세요."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        <div className="space-y-2">
          <Label htmlFor="slide-count">슬라이드 수</Label>
          <Input
            id="slide-count"
            type="number"
            min={5}
            max={12}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>화면 비율</Label>
          <RadioGroup
            value={ratio}
            onValueChange={(v) => setRatio(v as "16:9" | "4:3")}
            className="flex flex-wrap gap-x-4 gap-y-2 pt-2"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="16:9" /> 16:9
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="4:3" /> 4:3
            </label>
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label>언어</Label>
          <RadioGroup
            value={lang}
            onValueChange={(v) => setLang(v as "ko" | "en" | "mixed")}
            className="flex flex-wrap gap-x-4 gap-y-2 pt-2"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="ko" /> 한국어
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="en" /> English
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="mixed" /> Mixed
            </label>
          </RadioGroup>
        </div>
      </div>

      <ProviderReadinessBadge
        view={providerMatrix}
        onOpenConnectionSettings={onOpenConnectionSettings}
      />

      <div className="flex justify-stretch sm:justify-end">
        <Button
          onClick={submit}
          aria-label="프로젝트 만들기"
          className="h-auto min-h-10 w-full whitespace-normal bg-foreground text-background hover:bg-foreground/90 sm:w-auto"
        >
          프로젝트 만들기
        </Button>
      </div>
    </div>
  );
}

export function ProviderReadinessBadge({
  view,
  onOpenConnectionSettings,
}: {
  readonly view: ProviderCapabilityMatrixView;
  readonly onOpenConnectionSettings?: () => void;
}) {
  const isConnected = view.isLiveReady;
  const lockedCount = view.rows.filter((row) => row.status === "locked").length;
  const readinessLabel =
    view.statusKind === "bridgeDetected"
      ? "Bridge 감지"
      : isConnected
        ? "라이브 연결됨"
        : "라이브 연결 필요";
  const summaryLabel = isConnected
    ? "라이브 실행 가능"
    : view.isMockProvider
      ? "샘플 기능만 사용 가능"
      : view.statusKind === "bridgeDetected"
        ? "앱 실행 통로 확인됨"
        : "라이브 전환 필요";
  const submitHint =
    view.statusKind === "bridgeDetected"
      ? "실행 시 Codex 상태 확인으로 로그인과 app-server smoke를 검증합니다."
      : isConnected
        ? "자세한 연결 상태는 연결 및 실행 환경에서 확인합니다."
        : "라이브 생성과 조사는 연결 및 실행 환경에서 Codex 연결 후 진행됩니다.";

  return (
    <section className="border border-border bg-paper p-4 text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            실행 준비 상태
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            {isConnected ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
            ) : (
              <CircleAlert className="h-4 w-4 shrink-0 text-warning" />
            )}
            <span className="font-medium">{view.providerName}</span>
            <span className="text-xs text-muted-foreground">{readinessLabel}</span>
          </div>
          <p className="mt-2 break-words text-xs text-muted-foreground">
            {view.providerStatusMessage}
          </p>
        </div>
        <div className="shrink-0 text-left text-xs text-muted-foreground sm:text-right">
          <div>{summaryLabel}</div>
          <div className="mt-1">
            {lockedCount === 0 && isConnected ? "확인 필요 없음" : `확인 필요 ${lockedCount}개`}
          </div>
          <div className="mt-1">{submitHint}</div>
          {onOpenConnectionSettings ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Codex 상태 확인"
              className="mt-3 w-full justify-center sm:w-auto"
              onClick={onOpenConnectionSettings}
            >
              <Settings className="h-4 w-4" />
              Codex 상태 확인
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

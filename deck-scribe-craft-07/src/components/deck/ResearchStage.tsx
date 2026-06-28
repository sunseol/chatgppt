import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { GateBar } from "@/components/deck/GateBar";
import {
  ClaimReviewList,
  DatasetReviewList,
  FactCheckReview,
  ReinforcementRequest,
} from "@/components/deck/ResearchPanels";
import { SourceReviewList } from "@/components/deck/ResearchSourcePreview";
import {
  EmptyAction,
  InvalidatedBanner,
  StageHeader,
  StageScroll,
  StageShell,
} from "@/components/deck/stage-shared";
import { approveStage, invalidateDownstream, updateProject } from "@/lib/deck-store";
import type { DeckProject, ResearchPack } from "@/lib/deck-types";
import { hash, mockResearch } from "@/lib/mock-ai";
import { excludeResearchSource, requestResearchReinforcement } from "@/lib/research-review-actions";
import { validateResearchPack } from "@/lib/research-validator";

async function delay<T>(value: T, ms = 900): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function ResearchStage({ project }: { readonly project: DeckProject }) {
  const navigate = useNavigate();
  const [pack, setPack] = useState<ResearchPack | undefined>(project.research);
  const [busy, setBusy] = useState(false);
  const [reinforcementRequest, setReinforcementRequest] = useState("");
  const invalidated = !!project.invalidated.research;

  useEffect(() => setPack(project.research), [project.research]);

  const generate = async () => {
    if (!project.brief) return;
    setBusy(true);
    const research = await delay(mockResearch(project.brief), 1100);
    updateProject(project.id, { research, stage: "RESEARCH_APPROVAL_PENDING" });
    setPack(research);
    invalidateDownstream(project.id, "research");
    setBusy(false);
  };

  const applyReinforcementRequest = () => {
    if (!pack || !reinforcementRequest.trim()) return;
    const next = requestResearchReinforcement({
      pack,
      prompt: reinforcementRequest,
      requestedAt: Date.now(),
    });
    persistResearchReview(next);
    setReinforcementRequest("");
  };

  const excludeSource = (sourceId: string) => {
    if (!pack) return;
    persistResearchReview(
      excludeResearchSource({
        pack,
        sourceId,
        reason: "User excluded source during research review.",
        decidedAt: Date.now(),
      }),
    );
  };

  const persistResearchReview = (next: ResearchPack) => {
    setPack(next);
    updateProject(project.id, { research: next, stage: "RESEARCH_APPROVAL_PENDING" });
    invalidateDownstream(project.id, "research");
  };

  const approve = () => {
    if (!pack) return;
    const approvedHash = hash(JSON.stringify(pack));
    updateProject(project.id, { research: { ...pack, approvedHash } });
    approveStage(project.id, "research", "PLANNING", approvedHash);
    navigate({ to: "/project/$projectId/$step", params: { projectId: project.id, step: "plan" } });
  };

  const validation = pack ? validateResearchPack(pack) : undefined;

  return (
    <StageShell>
      <StageScroll className="mx-auto max-w-6xl px-8">
        <StageHeader num="02" sub="Research" title="조사 자료 검증" />
        <SampleResearchModeNotice />
        <InvalidatedBanner on={invalidated && !!pack} />
        {!pack ? (
          <EmptyAction
            label="샘플 조사팩 생성 (실제 웹 출처나 Codex 실행 결과가 아닙니다)"
            actionLabel="샘플 생성"
            busy={busy}
            onClick={generate}
          />
        ) : (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-8">
              <SourceReviewList
                sources={pack.sources}
                claims={pack.claims}
                onExcludeSource={excludeSource}
              />
              <ClaimReviewList claims={pack.claims} />
              <DatasetReviewList datasets={pack.datasets} charts={pack.charts} />
            </div>
            <aside className="space-y-4">
              <FactCheckReview report={pack.factCheckReport} />
              <ReinforcementRequest
                value={reinforcementRequest}
                disabled={!pack}
                onChange={setReinforcementRequest}
                onApply={applyReinforcementRequest}
              />
            </aside>
          </div>
        )}
      </StageScroll>
      <GateBar
        hint={
          pack
            ? "이 결과는 샘플 데이터입니다. 실제 승인이 아니라 다음 화면 구조를 확인하는 용도입니다."
            : ""
        }
        regenerate={pack ? { label: "샘플 보강", onClick: generate } : undefined}
        approve={
          pack
            ? {
                label: "샘플 결과로 슬라이드 기획 화면 보기",
                onClick: approve,
                disabled: (validation?.fatalIssues.length ?? 0) > 0,
              }
            : undefined
        }
      />
    </StageShell>
  );
}

export function SampleResearchModeNotice() {
  return (
    <div className="mb-6 flex items-start gap-3 border border-warning/40 bg-warning/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div>
        <div className="font-medium">샘플 조사 모드</div>
        <div className="mt-1 text-xs text-muted-foreground">
          현재 화면은 실제 웹 조사나 Codex 실행 결과가 아닙니다. 라이브 조사 검증은 DMG/Tauri 앱에서
          Codex를 연결한 뒤 실행하세요.
        </div>
      </div>
    </div>
  );
}

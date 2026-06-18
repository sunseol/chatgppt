import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import type { DeckProject, FactCheckIssue, ResearchPack } from "@/lib/deck-types";
import { hash, mockResearch } from "@/lib/mock-ai";
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
    const message = `보강 요청: ${reinforcementRequest.trim()}`;
    const issue: FactCheckIssue = {
      id: `issue_reinforce_${pack.factCheckReport.issues.length + 1}`,
      severity: "info",
      message,
      uncertain: true,
    };
    const next = {
      ...pack,
      factCheckReport: {
        ...pack.factCheckReport,
        issues: [...pack.factCheckReport.issues, issue],
        uncertainItems: [...pack.factCheckReport.uncertainItems, message],
      },
    };
    setPack(next);
    updateProject(project.id, { research: next, stage: "RESEARCH_APPROVAL_PENDING" });
    setReinforcementRequest("");
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
        <InvalidatedBanner on={invalidated && !!pack} />
        {!pack ? (
          <EmptyAction
            label="브리프를 바탕으로 조사팩 생성 (출처·주장·데이터셋)"
            busy={busy}
            onClick={generate}
          />
        ) : (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-8">
              <SourceReviewList sources={pack.sources} claims={pack.claims} />
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
            ? "출처, 주장, 데이터셋, 불확실 항목을 검토한 뒤 승인하면 슬라이드 기획이 시작됩니다."
            : ""
        }
        regenerate={pack ? { label: "보강 조사", onClick: generate } : undefined}
        approve={
          pack
            ? {
                label: "조사 결과를 승인하고 슬라이드 기획 시작",
                onClick: approve,
                disabled: (validation?.fatalIssues.length ?? 0) > 0,
              }
            : undefined
        }
      />
    </StageShell>
  );
}

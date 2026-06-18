import { useEffect, useState } from "react";
import { ReinforcementRequest } from "@/components/deck/ResearchPanels";
import { SourceReviewList } from "@/components/deck/ResearchSourcePreview";
import { approveStage, updateProject } from "@/lib/deck-store";
import type { DeckProject, ResearchPack } from "@/lib/deck-types";
import { createLiveResearchApprovalPatch } from "@/lib/live-research-approval-action";
import {
  evaluateLiveResearchApprovalGate,
  type LiveResearchApprovalIssue,
} from "@/lib/live-research-approval-gate";
import { excludeResearchSource, requestResearchReinforcement } from "@/lib/research-review-actions";

export function ProductionResearchReview({ project }: { readonly project: DeckProject }) {
  const [research, setResearch] = useState<ResearchPack | undefined>(project.research);
  const [reinforcementRequest, setReinforcementRequest] = useState("");

  useEffect(() => setResearch(project.research), [project.research]);

  if (!research) return null;

  const persistResearchReview = (next: ResearchPack) => {
    setResearch(next);
    updateProject(project.id, { research: next, stage: "RESEARCH_APPROVAL_PENDING" });
  };
  const excludeSource = (sourceId: string) => {
    persistResearchReview(
      excludeResearchSource({
        pack: research,
        sourceId,
        reason: "User excluded source during production research review.",
        decidedAt: Date.now(),
      }),
    );
  };
  const applyReinforcementRequest = () => {
    if (!reinforcementRequest.trim()) return;
    persistResearchReview(
      requestResearchReinforcement({
        pack: research,
        prompt: reinforcementRequest,
        requestedAt: Date.now(),
      }),
    );
    setReinforcementRequest("");
  };
  const approveResearch = () => {
    const result = createLiveResearchApprovalPatch({
      pack: research,
      projectId: project.id,
      version: nextResearchApprovalVersion(project),
      approvedAt: Date.now(),
    });
    if (result.kind === "blocked") return;
    setResearch(result.patch.research);
    updateProject(project.id, { research: result.patch.research });
    approveStage(
      project.id,
      "research",
      result.patch.stage,
      result.approvedHash,
      result.approvalArtifact.record,
    );
  };
  const gate = evaluateLiveResearchApprovalGate({
    pack: research,
    evidenceRefs: research.liveEvidenceRefs ?? [],
    provenanceLineage: research.provenanceLineage ?? [],
  });
  const issues = gate.kind === "blocked" ? gate.issues : [];
  return (
    <section className="mt-6 space-y-5">
      <div className="border border-border bg-paper p-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-medium">Live research approval gate</div>
            <div className="mt-2 text-muted-foreground">
              {gate.kind === "ready"
                ? "Live evidence and provenance are ready for approval."
                : "Live evidence refs and provider provenance must be complete before approval."}
            </div>
          </div>
          <button
            type="button"
            onClick={approveResearch}
            disabled={gate.kind !== "ready"}
            className="border border-foreground px-4 py-2 text-xs font-medium uppercase disabled:cursor-not-allowed disabled:opacity-40"
          >
            Live Research Pack 승인
          </button>
        </div>
        {issues.length > 0 ? <ProductionResearchIssues issues={issues} /> : null}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SourceReviewList
          sources={research.sources}
          claims={research.claims}
          liveEvidenceRefs={research.liveEvidenceRefs ?? []}
          onExcludeSource={excludeSource}
        />
        <ReinforcementRequest
          value={reinforcementRequest}
          disabled={false}
          onChange={setReinforcementRequest}
          onApply={applyReinforcementRequest}
        />
      </div>
    </section>
  );
}

function nextResearchApprovalVersion(project: DeckProject): number {
  return project.approvalLog.filter((entry) => entry.stage === "research").length + 1;
}

function ProductionResearchIssues({
  issues,
}: {
  readonly issues: readonly LiveResearchApprovalIssue[];
}) {
  return (
    <ul className="mt-4 space-y-2">
      {issues.map((issue, index) => (
        <li key={`${issue.code}-${index}`} className="border border-border bg-background p-3">
          <div className="font-mono text-xs">{issue.code}</div>
          <div className="mt-1 text-muted-foreground">{issue.message}</div>
        </li>
      ))}
    </ul>
  );
}

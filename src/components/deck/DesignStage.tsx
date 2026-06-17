import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  DESIGN_APPROVAL_CTA_LABEL,
  DesignSystemEditorPanel,
  DesignSystemJsonPanel,
  DesignSystemPreviewPanel,
  DesignSystemSummaryPanel,
} from "@/components/deck/DesignPanels";
import { GateBar } from "@/components/deck/GateBar";
import { EmptyAction, InvalidatedBanner, StageHeader } from "@/components/deck/stage-shared";
import { approveStage, invalidateDownstream, updateProject } from "@/lib/deck-store";
import { createApprovedDesignSystemArtifact } from "@/lib/design-system";
import { createDesignDraftUpdate } from "@/lib/design-editor-model";
import { mockDesign } from "@/lib/mock-ai";
import type { DeckProject, DesignSystem } from "@/lib/deck-types";

async function fakeAsync<T>(value: T, ms = 900): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function DesignStage({ project }: { readonly project: DeckProject }) {
  const navigate = useNavigate();
  const [ds, setDs] = useState<DesignSystem | undefined>(project.design);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const invalidated = !!project.invalidated.design;

  useEffect(() => {
    setDs(project.design);
    setDirty(false);
  }, [project.design]);

  const generate = async () => {
    if (!project.brief || !project.plan?.approvedHash) return;
    setBusy(true);
    const design = await fakeAsync(mockDesign(project.brief, project.plan), 800);
    updateProject(project.id, { design, stage: "DESIGN_APPROVAL_PENDING" });
    setDs(design);
    setDirty(false);
    invalidateDownstream(project.id, "design");
    setBusy(false);
  };

  const updateDesignDraft = (design: DesignSystem) => {
    setDs(design);
    setDirty(true);
  };

  const saveEditedDesign = () => {
    if (!ds) return;
    const draft = createDesignDraftUpdate(ds);
    updateProject(project.id, (current) => ({
      design: draft.design,
      stage: "DESIGN_APPROVAL_PENDING",
      invalidated: { ...current.invalidated, ...draft.invalidated },
    }));
    setDirty(false);
  };

  const approve = () => {
    if (!ds) return;
    const draft = dirty ? createDesignDraftUpdate(ds) : undefined;
    const designForApproval = draft?.design ?? ds;
    const artifact = createApprovedDesignSystemArtifact({
      projectId: project.id,
      design: designForApproval,
      version: nextDesignVersion(project),
      approvedAt: Date.now(),
    });
    const approvedHash = artifact.record.hash;
    updateProject(project.id, (current) => ({
      design: { ...designForApproval, approvedHash },
      invalidated: draft ? { ...current.invalidated, ...draft.invalidated } : current.invalidated,
    }));
    setDirty(false);
    approveStage(project.id, "design", "PROTOTYPING_LAYOUT", approvedHash, artifact.record);
    navigate({
      to: "/project/$projectId/$step",
      params: { projectId: project.id, step: "layout" },
    });
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-12 sm:px-8">
        <StageHeader num="04" sub="Design System" title="디자인 시스템" />
        <InvalidatedBanner on={invalidated && !!ds} />
        {!ds ? (
          <EmptyAction
            label="승인된 기획에 맞는 디자인 토큰·타이포·룰 생성"
            busy={busy}
            onClick={generate}
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <DesignSystemSummaryPanel design={ds} />
              <DesignSystemPreviewPanel design={ds} previewTitle={project.brief?.goal ?? "Title"} />
            </div>
            <div className="space-y-6">
              <DesignSystemEditorPanel
                design={ds}
                dirty={dirty}
                disabled={busy}
                onChange={updateDesignDraft}
                onSave={saveEditedDesign}
              />
              <DesignSystemJsonPanel design={ds} />
            </div>
          </div>
        )}
      </div>
      <GateBar
        hint={ds ? "모든 슬라이드는 이 시스템을 강제 적용합니다." : ""}
        regenerate={ds ? { label: "다시 생성", onClick: generate } : undefined}
        approve={ds ? { label: DESIGN_APPROVAL_CTA_LABEL, onClick: approve } : undefined}
      />
    </div>
  );
}

function nextDesignVersion(project: DeckProject): number {
  return project.approvalLog.filter((entry) => entry.stage === "design").length + 1;
}

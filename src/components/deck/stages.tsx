import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
export { InterviewStage } from "@/components/deck/InterviewStage";
export { PlanStage } from "@/components/deck/PlanStage";
export { ResearchStage } from "@/components/deck/ResearchStage";
export { DesignStage } from "@/components/deck/DesignStage";
export { LayoutStage } from "@/components/deck/LayoutStage";
export { EditorStage } from "@/components/deck/EditorStage";
export { ExportStage } from "@/components/deck/ExportStage";
export { GenerateStage } from "@/components/deck/GenerateStage";
export { VectorizeStage } from "@/components/deck/VectorizeStage";
import { GateBar } from "@/components/deck/GateBar";
import { RevisionComparePanel } from "@/components/deck/RevisionComparePanel";
import { SlidePreview } from "@/components/deck/SlidePreview";
import { StageHeader } from "@/components/deck/stage-shared";
import { fakeAsync } from "@/components/deck/stage-timing";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveStage, updateProject } from "@/lib/deck-store";
import { hash } from "@/lib/mock-ai";
import type { DeckProject, GeneratedSlide } from "@/lib/deck-types";
import type { SlideRevisionComparison } from "@/lib/slide-revision-generation";
import { ChevronRight } from "lucide-react";

// ============= Stage panels =============

export function ProjectStage({ project }: { project: DeckProject }) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-12">
      <StageHeader num="00" sub="Project Brief" title="프로젝트 정보" />
      <dl className="grid grid-cols-2 gap-x-12 gap-y-6 border-t border-border pt-6 text-sm">
        <Field label="이름" value={project.name} />
        <Field label="생성일" value={new Date(project.createdAt).toLocaleString("ko-KR")} />
        <Field label="화면 비율" value={project.aspectRatio} />
        <Field label="언어" value={project.language} />
        <Field label="슬라이드 수" value={String(project.slideCount)} />
        <Field label="현재 단계" value={project.stage} />
        <div className="col-span-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            초기 프롬프트
          </div>
          <p className="mt-2 whitespace-pre-wrap text-foreground">{project.initialPrompt}</p>
        </div>
      </dl>
      <div className="mt-12 flex justify-end">
        <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
          <a
            href={`/project/${project.id}/interview`}
            onClick={() => updateProject(project.id, { stage: "INTERVIEWING" })}
          >
            인터뷰 시작
            <ChevronRight className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

// ---------- Review ----------
export function ReviewStage({ project }: { project: DeckProject }) {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<GeneratedSlide[]>(project.slides ?? []);
  const [selected, setSelected] = useState<number | null>(slides[0]?.number ?? null);
  const [edit, setEdit] = useState("");
  const [busy, setBusy] = useState(false);
  const [revisionComparison, setRevisionComparison] = useState<SlideRevisionComparison | null>(
    null,
  );

  useEffect(() => setSlides(project.slides ?? []), [project.slides]);

  const regenSelected = async () => {
    if (selected == null) return;
    const original = slides.find((s) => s.number === selected);
    const instruction = edit.trim();
    if (!original || !instruction) return;
    setBusy(true);
    await fakeAsync(null, 800);
    const next = slides.map((s) =>
      s.number === selected
        ? {
            ...s,
            version: s.version + 1,
            imageDescriptor: `${s.imageDescriptor}|revision:v${s.version + 1}|${instruction}`,
            notes: instruction,
          }
        : s,
    );
    const revised = next.find((s) => s.number === selected);
    if (revised) {
      setRevisionComparison(createReviewRevisionComparison(original, revised, instruction));
    }
    setSlides(next);
    updateProject(project.id, { slides: next });
    setEdit("");
    setBusy(false);
  };

  const approveRevision = () => {
    if (!revisionComparison) return;
    const approved = slides.map((s) =>
      s.number === revisionComparison.slideNumber ? { ...s, status: "approved" as const } : s,
    );
    setSlides(approved);
    updateProject(project.id, { slides: approved });
    setRevisionComparison(null);
  };

  const requestRevisionAgain = () => {
    if (!revisionComparison) return;
    setEdit(revisionComparison.requestedChanges.join(" "));
    setRevisionComparison(null);
  };

  const approveAll = () => {
    const approved = slides.map((s) => ({ ...s, status: "approved" as const }));
    updateProject(project.id, { slides: approved });
    approveStage(project.id, "review", "VECTORIZE_PENDING", hash(JSON.stringify(approved)));
    navigate({
      to: "/project/$projectId/$step",
      params: { projectId: project.id, step: "vectorize" },
    });
  };

  const spec = project.plan?.slides.find((p) => p.number === selected);
  const slide = slides.find((s) => s.number === selected);

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 px-8 py-12">
        <StageHeader num="07" sub="Review & Revise" title="슬라이드 검토" />
        <div className="grid grid-cols-[260px_1fr_320px] gap-6">
          <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
            {slides.map((s) => {
              const sp = project.plan?.slides.find((p) => p.number === s.number);
              return (
                <li key={s.number}>
                  <button
                    onClick={() => setSelected(s.number)}
                    className={`flex w-full items-center gap-3 border px-3 py-2 text-left text-xs ${selected === s.number ? "border-foreground bg-paper" : "border-transparent hover:bg-paper"}`}
                  >
                    <span className="font-mono text-muted-foreground">
                      {String(s.number).padStart(2, "0")}
                    </span>
                    <span className="flex-1 truncate">{sp?.title}</span>
                    <span className="text-muted-foreground">v{s.version}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border border-border bg-paper">
            <div className="aspect-video w-full bg-background">
              {spec && slide && project.design && (
                <SlidePreview design={project.design} spec={spec} slide={slide} mode="image" />
              )}
            </div>
          </div>
          <aside className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                수정 지시
              </div>
              <Textarea
                value={edit}
                onChange={(e) => setEdit(e.target.value)}
                rows={6}
                placeholder="예: 오른쪽 그래프를 더 크게, 하단 출처 캡션은 유지"
                className="mt-2"
              />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                반드시 유지
              </div>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>· 제목 텍스트</li>
                <li>· 주요 수치</li>
                <li>· 출처 캡션</li>
                <li>· 승인된 팔레트</li>
              </ul>
            </div>
            <Button
              onClick={regenSelected}
              disabled={!edit.trim() || busy}
              variant="outline"
              className="w-full"
            >
              {busy ? "수정 생성 중…" : "이 슬라이드만 수정 생성"}
            </Button>
          </aside>
        </div>
        {revisionComparison && revisionComparison.slideNumber === selected ? (
          <div className="mt-6">
            <RevisionComparePanel
              comparison={revisionComparison}
              onApproveRevision={approveRevision}
              onRequestRevision={requestRevisionAgain}
            />
          </div>
        ) : null}
      </div>
      <GateBar
        hint="모든 슬라이드를 승인하면 SVG/레이어 변환 단계로 넘어갑니다."
        approve={{ label: "전체 슬라이드 승인하고 편집 가능 변환", onClick: approveAll }}
      />
    </div>
  );
}

function createReviewRevisionComparison(
  original: GeneratedSlide,
  revised: GeneratedSlide,
  instruction: string,
): SlideRevisionComparison {
  const preservedTargets = [
    "title text",
    "main statistics",
    "source caption",
    "approved color palette",
  ];
  return {
    slideNumber: original.number,
    originalSlideVersion: original.version,
    revisedSlideVersion: revised.version,
    beforeImageDescriptor: original.imageDescriptor,
    afterImageDescriptor: revised.imageDescriptor,
    requestedChanges: [instruction],
    preservedTargets,
    preservationChecks: preservedTargets.map((target) => ({
      target,
      status: "kept",
      message: `${target} preserved.`,
    })),
    summary: `Slide ${original.number} revision v${revised.version} keeps ${preservedTargets.length} targets and changes ${instruction}.`,
  };
}

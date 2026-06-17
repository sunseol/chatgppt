import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { GateBar } from "@/components/deck/GateBar";
import { SlidePreview } from "@/components/deck/SlidePreview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  approveStage, invalidateDownstream, updateProject,
} from "@/lib/deck-store";
import {
  mockBrief, mockResearch, mockPlan, mockDesign, mockLayout,
  mockSlides, mockLayers, hash,
} from "@/lib/mock-ai";
import type {
  DeckProject, InterviewBrief, ResearchPack, DeckPlan, DesignSystem,
  LayoutPrototype, GeneratedSlide, EditableLayerModel,
} from "@/lib/deck-types";
import { CheckCircle2, AlertTriangle, FileText, ChevronRight, Sparkles } from "lucide-react";

// ---------- generic helpers ----------
function StageHeader({ num, title, sub }: { num: string; title: string; sub: string }) {
  return (
    <header className="mb-8">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{num} · {sub}</div>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">{title}</h1>
    </header>
  );
}

function InvalidatedBanner({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <div className="mb-6 flex items-start gap-3 border border-warning/40 bg-warning/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 text-warning shrink-0" />
      <div>
        <div className="font-medium">상위 단계가 변경되어 이 단계는 재승인이 필요합니다.</div>
        <div className="mt-1 text-muted-foreground text-xs">
          다시 생성하거나 검토 후 승인을 진행해주세요. 이전 승인 해시는 무효 처리됩니다.
        </div>
      </div>
    </div>
  );
}

async function fakeAsync<T>(value: T, ms = 900): Promise<T> {
  return new Promise((r) => setTimeout(() => r(value), ms));
}

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
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">초기 프롬프트</div>
          <p className="mt-2 whitespace-pre-wrap text-foreground">{project.initialPrompt}</p>
        </div>
      </dl>
      <div className="mt-12 flex justify-end">
        <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
          <a href={`/project/${project.id}/interview`}>
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

// ---------- Interview ----------
export function InterviewStage({ project }: { project: DeckProject }) {
  const navigate = useNavigate();
  const [brief, setBrief] = useState<InterviewBrief | undefined>(project.brief);
  const [busy, setBusy] = useState(false);
  const invalidated = !!project.invalidated.interview;

  useEffect(() => { setBrief(project.brief); }, [project.brief]);

  const generate = async () => {
    setBusy(true);
    const b = await fakeAsync(mockBrief(project.initialPrompt, project.slideCount, project.aspectRatio), 900);
    updateProject(project.id, { brief: b, stage: "INTERVIEW_APPROVAL_PENDING" });
    setBrief(b);
    invalidateDownstream(project.id, "interview");
    setBusy(false);
  };

  const approve = () => {
    if (!brief) return;
    const h = hash(JSON.stringify(brief));
    updateProject(project.id, { brief: { ...brief, approvedHash: h } });
    approveStage(project.id, "interview", "RESEARCHING", h);
    navigate({ to: "/project/$projectId/$step", params: { projectId: project.id, step: "research" } });
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-4xl flex-1 px-8 py-12">
        <StageHeader num="01" sub="Interview · Intent Discovery" title="사용자 의도 인터뷰" />
        <InvalidatedBanner on={invalidated} />

        {!brief ? (
          <EmptyAction
            label="초기 프롬프트를 바탕으로 인터뷰 브리프 초안 생성"
            busy={busy}
            onClick={generate}
          />
        ) : (
          <div className="space-y-6">
            <EditableRow label="목적 (Goal)" value={brief.goal} onChange={(v) => setBrief({ ...brief, goal: v })} />
            <EditableRow label="청중 (Audience)" value={brief.audience} onChange={(v) => setBrief({ ...brief, audience: v })} />
            <EditableRow label="원하는 결과" value={brief.desiredOutcome} multiline onChange={(v) => setBrief({ ...brief, desiredOutcome: v })} />
            <ChipRow label="톤앤매너" values={brief.tone} onChange={(v) => setBrief({ ...brief, tone: v })} />
            <ChipRow label="반드시 포함" values={brief.mustInclude} onChange={(v) => setBrief({ ...brief, mustInclude: v })} />
            <ChipRow label="금지 요소" values={brief.mustAvoid} onChange={(v) => setBrief({ ...brief, mustAvoid: v })} />
            {brief.openQuestions.length > 0 && (
              <div className="border-l-2 border-accent bg-paper p-4">
                <div className="text-[11px] uppercase tracking-wider text-accent">사용자 확인 필요</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {brief.openQuestions.map((q) => <li key={q}>{q}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      <GateBar
        hint={brief ? "인터뷰 브리프를 검토하고 승인하면 조사 단계가 시작됩니다." : "인터뷰 초안을 생성해주세요."}
        regenerate={brief ? { label: "다시 생성", onClick: generate } : undefined}
        approve={brief ? {
          label: "인터뷰 결과를 승인하고 조사 시작",
          onClick: () => { if (brief) { updateProject(project.id, { brief }); approve(); } },
        } : undefined}
      />
    </div>
  );
}

function EmptyAction({ label, onClick, busy }: { label: string; onClick: () => void; busy: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 border border-dashed border-border bg-paper py-16">
      <Sparkles className="h-8 w-8 text-accent" />
      <div className="text-sm text-muted-foreground">{label}</div>
      <Button onClick={onClick} disabled={busy} className="bg-foreground text-background hover:bg-foreground/90">
        {busy ? "생성 중…" : "초안 생성"}
      </Button>
    </div>
  );
}

function EditableRow({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div className="border-b border-border pb-4">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="mt-2 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-base" />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-base" />
      )}
    </div>
  );
}

function ChipRow({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="border-b border-border pb-4">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {values.map((v, i) => (
          <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => onChange(values.filter((_, j) => j !== i))}>
            {v} ×
          </Badge>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              onChange([...values, draft.trim()]);
              setDraft("");
            }
          }}
          placeholder="+ 추가하고 Enter"
          className="h-8 w-48 border-dashed text-sm"
        />
      </div>
    </div>
  );
}

// ---------- Research ----------
export function ResearchStage({ project }: { project: DeckProject }) {
  const navigate = useNavigate();
  const [pack, setPack] = useState<ResearchPack | undefined>(project.research);
  const [busy, setBusy] = useState(false);
  const invalidated = !!project.invalidated.research;

  useEffect(() => setPack(project.research), [project.research]);

  const generate = async () => {
    if (!project.brief) return;
    setBusy(true);
    const r = await fakeAsync(mockResearch(project.brief), 1100);
    updateProject(project.id, { research: r, stage: "RESEARCH_APPROVAL_PENDING" });
    setPack(r);
    invalidateDownstream(project.id, "research");
    setBusy(false);
  };

  const approve = () => {
    if (!pack) return;
    const h = hash(JSON.stringify(pack));
    updateProject(project.id, { research: { ...pack, approvedHash: h } });
    approveStage(project.id, "research", "PLANNING", h);
    navigate({ to: "/project/$projectId/$step", params: { projectId: project.id, step: "plan" } });
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-5xl flex-1 px-8 py-12">
        <StageHeader num="02" sub="Research · Sources & Claims" title="조사 자료 검증" />
        <InvalidatedBanner on={invalidated} />
        {!pack ? (
          <EmptyAction label="브리프를 바탕으로 조사팩 생성 (출처·주장·데이터셋)" busy={busy} onClick={generate} />
        ) : (
          <div className="grid grid-cols-2 gap-8">
            <section>
              <h2 className="mb-4 font-serif text-xl">출처 · Sources ({pack.sources.length})</h2>
              <ul className="space-y-3">
                {pack.sources.map((s) => (
                  <li key={s.id} className="border border-border bg-paper p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{s.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{s.publisher} · {s.year}</div>
                      </div>
                      <Badge variant={s.grade === "A" ? "default" : "secondary"} className={s.grade === "A" ? "bg-foreground text-background" : ""}>
                        등급 {s.grade}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="mb-4 font-serif text-xl">주장 · Claims ({pack.claims.length})</h2>
              <ul className="space-y-3">
                {pack.claims.map((c) => (
                  <li key={c.id} className="border border-border bg-paper p-4">
                    <div className="text-sm">{c.statement}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {c.sourceIds.length > 0 ? (
                        c.sourceIds.map((sid) => <Badge key={sid} variant="outline">{sid}</Badge>)
                      ) : (
                        <Badge variant="outline" className="border-warning text-warning">출처 없음 · 가설</Badge>
                      )}
                      <span className="text-muted-foreground">신뢰도 · {c.confidence}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
      <GateBar
        hint={pack ? "출처와 주장을 검토한 뒤 승인하면 슬라이드 기획이 시작됩니다." : ""}
        regenerate={pack ? { label: "보강 조사", onClick: generate } : undefined}
        approve={pack ? { label: "조사 결과를 승인하고 슬라이드 기획 시작", onClick: approve } : undefined}
      />
    </div>
  );
}

// ---------- Plan ----------
export function PlanStage({ project }: { project: DeckProject }) {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<DeckPlan | undefined>(project.plan);
  const [busy, setBusy] = useState(false);
  const [edited, setEdited] = useState<string>(project.plan?.markdown ?? "");
  const invalidated = !!project.invalidated.plan;

  useEffect(() => {
    setPlan(project.plan);
    setEdited(project.plan?.markdown ?? "");
  }, [project.plan]);

  const generate = async () => {
    if (!project.brief || !project.research) return;
    setBusy(true);
    const p = await fakeAsync(mockPlan(project.brief, project.research), 1100);
    updateProject(project.id, { plan: p, stage: "PLAN_APPROVAL_PENDING" });
    setPlan(p); setEdited(p.markdown);
    invalidateDownstream(project.id, "plan");
    setBusy(false);
  };

  const approve = () => {
    if (!plan) return;
    const updated = { ...plan, markdown: edited };
    const h = hash(edited);
    updateProject(project.id, { plan: { ...updated, approvedHash: h } });
    approveStage(project.id, "plan", "DESIGNING", h);
    navigate({ to: "/project/$projectId/$step", params: { projectId: project.id, step: "design" } });
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-8 py-12">
        <StageHeader num="03" sub="Plan · Markdown" title="슬라이드 기획" />
        <InvalidatedBanner on={invalidated} />
        {!plan ? (
          <EmptyAction label="조사 결과를 바탕으로 마크다운 덱 플랜 생성" busy={busy} onClick={generate} />
        ) : (
          <Tabs defaultValue="markdown">
            <TabsList>
              <TabsTrigger value="markdown"><FileText className="h-3.5 w-3.5" /> 마크다운</TabsTrigger>
              <TabsTrigger value="slides">슬라이드 목록 ({plan.slides.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="markdown" className="mt-4">
              <Textarea value={edited} onChange={(e) => setEdited(e.target.value)} rows={26} className="font-mono text-xs leading-relaxed" />
            </TabsContent>
            <TabsContent value="slides" className="mt-4">
              <ul className="divide-y divide-border border border-border bg-paper">
                {plan.slides.map((s) => (
                  <li key={s.number} className="grid grid-cols-[60px_1fr_140px_180px] items-start gap-4 p-4 text-sm">
                    <div className="font-mono text-xs text-muted-foreground">#{String(s.number).padStart(2, "0")}</div>
                    <div>
                      <div className="font-medium">{s.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{s.coreMessage}</div>
                    </div>
                    <Badge variant="outline" className="justify-self-start">{s.role}</Badge>
                    <div className="text-xs text-muted-foreground">{s.visualType}</div>
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        )}
      </div>
      <GateBar
        hint={plan ? "수정사항이 있다면 마크다운을 편집한 뒤 승인해주세요." : ""}
        regenerate={plan ? { label: "다시 생성", onClick: generate } : undefined}
        approve={plan ? { label: "기획을 승인하고 디자인 시스템 시작", onClick: approve } : undefined}
      />
    </div>
  );
}

// ---------- Design System ----------
export function DesignStage({ project }: { project: DeckProject }) {
  const navigate = useNavigate();
  const [ds, setDs] = useState<DesignSystem | undefined>(project.design);
  const [busy, setBusy] = useState(false);
  const invalidated = !!project.invalidated.design;

  useEffect(() => setDs(project.design), [project.design]);

  const generate = async () => {
    if (!project.brief) return;
    setBusy(true);
    const d = await fakeAsync(mockDesign(project.brief), 800);
    updateProject(project.id, { design: d, stage: "DESIGN_APPROVAL_PENDING" });
    setDs(d);
    invalidateDownstream(project.id, "design");
    setBusy(false);
  };

  const approve = () => {
    if (!ds) return;
    const h = hash(JSON.stringify(ds));
    updateProject(project.id, { design: { ...ds, approvedHash: h } });
    approveStage(project.id, "design", "PROTOTYPING_LAYOUT", h);
    navigate({ to: "/project/$projectId/$step", params: { projectId: project.id, step: "layout" } });
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-5xl flex-1 px-8 py-12">
        <StageHeader num="04" sub="Design System" title="디자인 시스템" />
        <InvalidatedBanner on={invalidated} />
        {!ds ? (
          <EmptyAction label="기획에 맞는 디자인 토큰·타이포·룰 생성" busy={busy} onClick={generate} />
        ) : (
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <Block label="Canvas">{ds.canvas.ratio} · {ds.canvas.w}×{ds.canvas.h}</Block>
              <Block label="Color Tokens">
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {Object.entries(ds.colors).map(([k, v]) => (
                    <label key={k} className="block text-[11px]">
                      <div className="h-12 w-full border border-border" style={{ background: v }} />
                      <div className="mt-1 text-muted-foreground">{k}</div>
                      <input
                        type="color"
                        value={v}
                        onChange={(e) => setDs({ ...ds, colors: { ...ds.colors, [k]: e.target.value } })}
                        className="mt-1 h-6 w-full"
                      />
                    </label>
                  ))}
                </div>
              </Block>
              <Block label="Typography">
                <div className="space-y-1 text-sm">
                  <div><span className="text-muted-foreground text-xs">Title · </span>{ds.typography.titleStyle}</div>
                  <div><span className="text-muted-foreground text-xs">Body · </span>{ds.typography.bodyStyle}</div>
                </div>
              </Block>
            </div>
            <div className="space-y-6">
              <Block label="Visual Language">{ds.visualLanguage}</Block>
              <Block label="Negative Rules">
                <ul className="space-y-1 text-sm">
                  {ds.negativeRules.map((r) => <li key={r}>· {r}</li>)}
                </ul>
              </Block>
              <div className="border border-border bg-paper p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Sample preview</div>
                <div className="mt-3 aspect-video w-full">
                  <SlidePreview
                    design={ds}
                    spec={{ number: 1, title: project.brief?.goal ?? "Title", role: "Cover", coreMessage: "디자인 시스템이 적용된 미리보기", visualType: "Cover", evidence: [], editableElements: [] }}
                    slide={{ number: 1, version: 1, status: "ready", imageDescriptor: "" }}
                    mode="image"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <GateBar
        hint={ds ? "모든 슬라이드는 이 시스템을 강제 적용합니다." : ""}
        regenerate={ds ? { label: "다시 생성", onClick: generate } : undefined}
        approve={ds ? { label: "디자인 시스템을 승인하고 레이아웃 초안 생성", onClick: approve } : undefined}
      />
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-paper p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

// ---------- Layout ----------
export function LayoutStage({ project }: { project: DeckProject }) {
  const navigate = useNavigate();
  const [lp, setLp] = useState<LayoutPrototype | undefined>(project.layout);
  const [busy, setBusy] = useState(false);
  const invalidated = !!project.invalidated.layout;

  useEffect(() => setLp(project.layout), [project.layout]);

  const generate = async () => {
    if (!project.plan || !project.design) return;
    setBusy(true);
    const l = await fakeAsync(mockLayout(project.plan, project.design), 1200);
    updateProject(project.id, { layout: l, stage: "LAYOUT_APPROVAL_PENDING" });
    setLp(l);
    invalidateDownstream(project.id, "layout");
    setBusy(false);
  };

  const approve = () => {
    if (!lp) return;
    const h = hash(JSON.stringify(lp));
    updateProject(project.id, { layout: { ...lp, approvedHash: h } });
    approveStage(project.id, "layout", "GENERATING_SLIDES", h);
    navigate({ to: "/project/$projectId/$step", params: { projectId: project.id, step: "generate" } });
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-8 py-12">
        <StageHeader num="05" sub="Layout · HTML Prototype" title="레이아웃 초안" />
        <InvalidatedBanner on={invalidated} />
        <div className="mb-6 border-l-2 border-accent bg-paper p-4 text-sm">
          <strong className="font-medium">이 화면은 최종 디자인이 아니라 레이아웃 초안입니다.</strong>
          <span className="ml-2 text-muted-foreground">정보 배치, 텍스트 밀도, 시각화 영역, 슬라이드 흐름을 확인해주세요. 최종 시각 스타일은 다음 이미지 생성 단계에서 개선됩니다.</span>
        </div>
        {!lp ? (
          <EmptyAction label="제한된 컴포넌트로 HTML 레이아웃 + DOM layer metadata 생성" busy={busy} onClick={generate} />
        ) : (
          <div className="grid grid-cols-2 gap-6 xl:grid-cols-3">
            {lp.slides.map((s) => {
              const spec = project.plan?.slides.find((p) => p.number === s.number);
              if (!spec || !project.design) return null;
              return (
                <div key={s.number} className="border border-border bg-paper">
                  <div className="aspect-video w-full bg-background">
                    <SlidePreview
                      design={project.design}
                      spec={spec}
                      slide={{ number: s.number, version: 1, status: "ready", imageDescriptor: "" }}
                      mode="layout"
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
                    <span className="font-mono text-muted-foreground">#{String(s.number).padStart(2, "0")} · {s.componentType}</span>
                    <span className="text-muted-foreground">layers · {s.domLayers.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <GateBar
        hint={lp ? "레이아웃을 승인하면 이미지 생성 단계로 진입합니다." : ""}
        regenerate={lp ? { label: "다시 생성", onClick: generate } : undefined}
        approve={lp ? { label: "레이아웃을 승인하고 슬라이드 생성 시작", onClick: approve } : undefined}
      />
    </div>
  );
}

// ---------- Generate ----------
export function GenerateStage({ project }: { project: DeckProject }) {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<GeneratedSlide[] | undefined>(project.slides);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => setSlides(project.slides), [project.slides]);

  const generate = async () => {
    if (!project.plan || !project.design) return;
    setBusy(true);
    setProgress(0);
    const target = mockSlides(project.plan);
    const draft: GeneratedSlide[] = target.map((t) => ({ ...t, status: "generating" }));
    setSlides(draft);
    for (let i = 0; i < target.length; i++) {
      await fakeAsync(null, 250);
      draft[i] = target[i];
      setSlides([...draft]);
      setProgress(Math.round(((i + 1) / target.length) * 100));
    }
    updateProject(project.id, { slides: target, stage: "SLIDE_REVIEW_PENDING" });
    invalidateDownstream(project.id, "generate");
    setBusy(false);
    navigate({ to: "/project/$projectId/$step", params: { projectId: project.id, step: "review" } });
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-8 py-12">
        <StageHeader num="06" sub="Generate · Parallel" title="슬라이드 이미지 병렬 생성" />
        {!slides ? (
          <EmptyAction label="Frozen Deck Context + 승인된 레이아웃으로 슬라이드 병렬 생성" busy={busy} onClick={generate} />
        ) : (
          <>
            <div className="mb-6 flex items-center gap-3">
              <div className="h-1 flex-1 overflow-hidden bg-secondary">
                <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="font-mono text-xs text-muted-foreground">{progress}%</div>
            </div>
            <div className="grid grid-cols-3 gap-4 xl:grid-cols-4">
              {slides.map((s) => {
                const spec = project.plan?.slides.find((p) => p.number === s.number);
                if (!spec || !project.design) return null;
                return (
                  <div key={s.number} className="border border-border bg-paper">
                    <div className="aspect-video w-full bg-background">
                      {s.status === "generating" ? (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          <Sparkles className="mr-2 h-3 w-3 animate-pulse" /> generating…
                        </div>
                      ) : (
                        <SlidePreview design={project.design} spec={spec} slide={s} mode="image" />
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
                      <span className="font-mono text-muted-foreground">#{String(s.number).padStart(2, "0")}</span>
                      <span className="text-muted-foreground">v{s.version}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
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

  useEffect(() => setSlides(project.slides ?? []), [project.slides]);

  const regenSelected = async () => {
    if (selected == null) return;
    setBusy(true);
    await fakeAsync(null, 800);
    const next = slides.map((s) => s.number === selected ? { ...s, version: s.version + 1, notes: edit } : s);
    setSlides(next);
    updateProject(project.id, { slides: next });
    setEdit("");
    setBusy(false);
  };

  const approveAll = () => {
    const approved = slides.map((s) => ({ ...s, status: "approved" as const }));
    updateProject(project.id, { slides: approved });
    approveStage(project.id, "review", "VECTORIZE_PENDING", hash(JSON.stringify(approved)));
    navigate({ to: "/project/$projectId/$step", params: { projectId: project.id, step: "vectorize" } });
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
                    <span className="font-mono text-muted-foreground">{String(s.number).padStart(2, "0")}</span>
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
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">수정 지시</div>
              <Textarea value={edit} onChange={(e) => setEdit(e.target.value)} rows={6} placeholder="예: 오른쪽 그래프를 더 크게, 하단 출처 캡션은 유지" className="mt-2" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">반드시 유지</div>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>· 제목 텍스트</li>
                <li>· 주요 수치</li>
                <li>· 출처 캡션</li>
                <li>· 승인된 팔레트</li>
              </ul>
            </div>
            <Button onClick={regenSelected} disabled={!edit.trim() || busy} variant="outline" className="w-full">
              {busy ? "수정 생성 중…" : "이 슬라이드만 수정 생성"}
            </Button>
          </aside>
        </div>
      </div>
      <GateBar
        hint="모든 슬라이드를 승인하면 SVG/레이어 변환 단계로 넘어갑니다."
        approve={{ label: "전체 슬라이드 승인하고 편집 가능 변환", onClick: approveAll }}
      />
    </div>
  );
}

// ---------- Vectorize ----------
export function VectorizeStage({ project }: { project: DeckProject }) {
  const navigate = useNavigate();
  const [layers, setLayers] = useState<EditableLayerModel[] | undefined>(project.layers);
  const [busy, setBusy] = useState(false);

  useEffect(() => setLayers(project.layers), [project.layers]);

  const convert = async () => {
    if (!project.plan || !project.design) return;
    setBusy(true);
    await fakeAsync(null, 1100);
    const l = mockLayers(project.plan, project.design);
    setLayers(l);
    updateProject(project.id, { layers: l, stage: "EDITABLE_REVIEW_PENDING" });
    setBusy(false);
  };

  const approve = () => {
    if (!layers) return;
    approveStage(project.id, "vectorize", "EDITOR", hash(JSON.stringify(layers)));
    navigate({ to: "/project/$projectId/$step", params: { projectId: project.id, step: "editor" } });
  };

  const stats = useMemo(() => {
    if (!layers) return null;
    const total = layers.reduce((a, m) => a + m.layers.length, 0);
    const editable = layers.reduce((a, m) => a + m.layers.filter((l) => l.editable).length, 0);
    return { total, editable, ratio: total ? Math.round((editable / total) * 100) : 0 };
  }, [layers]);

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-8 py-12">
        <StageHeader num="08" sub="Vectorize · PNG → Editable Layers" title="편집 가능 변환" />
        {!layers ? (
          <EmptyAction label="DOM layer metadata + Slide Spec 기반으로 편집 가능한 레이어 모델 생성" busy={busy} onClick={convert} />
        ) : (
          <>
            {stats && (
              <div className="mb-6 grid grid-cols-3 gap-4">
                <Metric label="총 레이어" value={String(stats.total)} />
                <Metric label="편집 가능 레이어" value={String(stats.editable)} />
                <Metric label="편집 가능률" value={`${stats.ratio}%`} accent />
              </div>
            )}
            <div className="grid grid-cols-2 gap-6 xl:grid-cols-3">
              {layers.map((m) => {
                const spec = project.plan?.slides.find((p) => p.number === m.slideNumber);
                if (!spec || !project.design) return null;
                return (
                  <div key={m.slideNumber} className="border border-border bg-paper">
                    <div className="aspect-video w-full bg-background">
                      <SlidePreview design={project.design} spec={spec} slide={{ number: m.slideNumber, version: 1, status: "approved", imageDescriptor: "" }} mode="layers" />
                    </div>
                    <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                      #{String(m.slideNumber).padStart(2, "0")} · {m.layers.length} layers
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      <GateBar
        hint={layers ? "변환 품질을 확인하고 편집기로 이동합니다." : ""}
        regenerate={layers ? { label: "재변환", onClick: convert } : undefined}
        approve={layers ? { label: "변환 결과를 승인하고 편집기 열기", onClick: approve } : undefined}
      />
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-border bg-paper p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 font-serif text-3xl ${accent ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}

// ---------- Editor ----------
export function EditorStage({ project }: { project: DeckProject }) {
  const navigate = useNavigate();
  const [layers, setLayers] = useState<EditableLayerModel[]>(project.layers ?? []);
  const [selected, setSelected] = useState<number>(layers[0]?.slideNumber ?? 1);
  const [layerSelected, setLayerSelected] = useState<string | null>(null);

  useEffect(() => setLayers(project.layers ?? []), [project.layers]);

  const current = layers.find((m) => m.slideNumber === selected);
  const layer = current?.layers.find((l) => l.id === layerSelected);

  const updateLayerText = (id: string, text: string) => {
    setLayers((prev) => {
      const next = prev.map((m) =>
        m.slideNumber !== selected ? m : {
          ...m,
          layers: m.layers.map((l) => l.id === id ? { ...l, text } : l),
        });
      updateProject(project.id, { layers: next });
      return next;
    });
  };

  const finalize = () => {
    updateProject(project.id, { stage: "FINAL_REPORTING" });
    navigate({ to: "/project/$projectId/$step", params: { projectId: project.id, step: "export" } });
  };

  // Build spec from edited layer texts for live preview
  const liveSpec = useMemo(() => {
    const base = project.plan?.slides.find((p) => p.number === selected);
    if (!base || !current) return base;
    const title = current.layers.find((l) => l.role === "title")?.text ?? base.title;
    const msg = current.layers.find((l) => l.role === "message")?.text ?? base.coreMessage;
    return { ...base, title, coreMessage: msg };
  }, [project.plan, selected, current]);

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 px-8 py-12">
        <StageHeader num="09" sub="Editor · Canvas" title="편집기" />
        <div className="grid grid-cols-[200px_1fr_300px] gap-6">
          <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
            {layers.map((m) => (
              <li key={m.slideNumber}>
                <button
                  onClick={() => { setSelected(m.slideNumber); setLayerSelected(null); }}
                  className={`w-full border px-3 py-2 text-left text-xs ${selected === m.slideNumber ? "border-foreground bg-paper" : "border-transparent hover:bg-paper"}`}
                >
                  <span className="font-mono text-muted-foreground">#{String(m.slideNumber).padStart(2, "0")}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border border-border bg-paper">
            <div className="aspect-video w-full bg-background">
              {liveSpec && project.design && (
                <SlidePreview design={project.design} spec={liveSpec} slide={{ number: selected, version: 1, status: "approved", imageDescriptor: "" }} mode="image" />
              )}
            </div>
          </div>
          <aside>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Layers</div>
            <ul className="mt-2 space-y-1">
              {current?.layers.map((l) => (
                <li key={l.id}>
                  <button
                    onClick={() => setLayerSelected(l.id)}
                    disabled={!l.editable}
                    className={`flex w-full items-center justify-between border px-3 py-2 text-left text-xs ${layerSelected === l.id ? "border-accent bg-paper" : "border-border"} ${!l.editable ? "opacity-40" : "hover:bg-paper"}`}
                  >
                    <span>{l.role}</span>
                    <span className="font-mono text-muted-foreground">{l.type}</span>
                  </button>
                </li>
              ))}
            </ul>
            {layer && layer.type === "text" && layer.editable && (
              <div className="mt-4">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">텍스트 편집</Label>
                <Textarea
                  value={layer.text ?? ""}
                  onChange={(e) => updateLayerText(layer.id, e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
            )}
          </aside>
        </div>
      </div>
      <GateBar
        hint="편집을 마치면 최종 보고서를 생성합니다."
        approve={{ label: "최종화하고 내보내기로 이동", onClick: finalize }}
      />
    </div>
  );
}

// ---------- Export ----------
export function ExportStage({ project }: { project: DeckProject }) {
  const layers = project.layers ?? [];
  const approvals = project.approvalLog;

  const reportMd = useMemo(() => buildReport(project), [project]);

  const finalize = () => {
    updateProject(project.id, { stage: "EXPORT_READY" });
  };

  useEffect(() => {
    if (project.stage === "FINAL_REPORTING") {
      const t = setTimeout(finalize, 600);
      return () => clearTimeout(t);
    }
  }, [project.stage]);

  const download = (filename: string, content: string, mime = "text/plain") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-5xl flex-1 px-8 py-12">
        <StageHeader num="10" sub="Final Report" title="최종 보고 · 내보내기" />

        <div className="mb-8 grid grid-cols-4 gap-3">
          <Metric label="슬라이드" value={String(layers.length)} />
          <Metric label="출처" value={String(project.research?.sources.length ?? 0)} />
          <Metric label="승인 이벤트" value={String(approvals.length)} accent />
          <Metric label="현재 상태" value={project.stage === "EXPORT_READY" ? "준비 완료" : "최종화 중"} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => download(`${project.name}_report.md`, reportMd, "text/markdown")}>Generation Report (.md)</Button>
          <Button variant="outline" onClick={() => download(`${project.name}.json`, JSON.stringify(project, null, 2), "application/json")}>Project (.json)</Button>
          <Button variant="outline" disabled>SVG export · 데모에서 비활성화</Button>
          <Button variant="outline" disabled>PPTX export · 데모에서 비활성화</Button>
        </div>

        <h2 className="mt-10 mb-3 font-serif text-2xl">승인 로그</h2>
        <ul className="divide-y divide-border border border-border bg-paper text-sm">
          {approvals.map((a, i) => (
            <li key={i} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="font-medium">{a.stage}</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{a.hash}</span>
              <span className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString("ko-KR")}</span>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 mb-3 font-serif text-2xl">Generation Report</h2>
        <pre className="overflow-x-auto whitespace-pre-wrap border border-border bg-paper p-4 font-mono text-xs leading-relaxed">{reportMd}</pre>
      </div>
    </div>
  );
}

function buildReport(p: DeckProject): string {
  const out: string[] = [];
  out.push(`# Generation Report — ${p.name}`);
  out.push(``);
  out.push(`- 생성: ${new Date(p.createdAt).toLocaleString("ko-KR")}`);
  out.push(`- 화면 비율: ${p.aspectRatio} · 언어: ${p.language} · 슬라이드: ${p.slideCount}`);
  out.push(``);
  out.push(`## 1. 사용자 프롬프트`);
  out.push(p.initialPrompt);
  if (p.brief) {
    out.push(``); out.push(`## 2. 승인된 인터뷰 브리프`);
    out.push(`- 목적: ${p.brief.goal}`);
    out.push(`- 청중: ${p.brief.audience}`);
    out.push(`- 톤: ${p.brief.tone.join(", ")}`);
  }
  if (p.research) {
    out.push(``); out.push(`## 3. 조사 출처`);
    p.research.sources.forEach((s) => out.push(`- [${s.grade}] ${s.title} — ${s.publisher} (${s.year})`));
    out.push(``); out.push(`## 4. 주장 · Claims`);
    p.research.claims.forEach((c) => out.push(`- ${c.statement} (${c.confidence}, ${c.sourceIds.join("/") || "출처 없음"})`));
  }
  if (p.design) {
    out.push(``); out.push(`## 5. 디자인 시스템`);
    out.push(`- Canvas: ${p.design.canvas.ratio} ${p.design.canvas.w}×${p.design.canvas.h}`);
    out.push(`- Visual Language: ${p.design.visualLanguage}`);
  }
  if (p.plan) {
    out.push(``); out.push(`## 6. 슬라이드`);
    p.plan.slides.forEach((s) => out.push(`- #${s.number} ${s.title} — ${s.coreMessage}`));
  }
  out.push(``); out.push(`## 7. 승인 로그`);
  p.approvalLog.forEach((a) => out.push(`- ${new Date(a.at).toISOString()} · ${a.stage} · ${a.hash}`));
  out.push(``); out.push(`## 8. 남은 리스크 / 확인 필요`);
  if (p.brief?.openQuestions.length) p.brief.openQuestions.forEach((q) => out.push(`- ${q}`));
  const unsourced = p.research?.claims.filter((c) => c.confidence === "assumption") ?? [];
  if (unsourced.length) out.push(`- 출처 없는 주장 ${unsourced.length}건 — 사실로 표시 금지`);
  return out.join("\n");
}

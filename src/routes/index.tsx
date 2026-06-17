import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useProjectList, deleteProject } from "@/lib/deck-store";
import { NewProjectForm } from "@/components/deck/NewProjectForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ArrowRight, Trash2 } from "lucide-react";
import { stageToStep, STEPS } from "@/lib/deck-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DeckForge — 검증 가능한 AI 슬라이드 제작 시스템" },
      { name: "description", content: "인터뷰 · 조사 · 기획 · 디자인 · 레이아웃 · 생성 · 검증 · 편집까지 승인 기반으로 강제 수행하는 슬라이드 제작 하네스의 웹 MVP 프로토타입." },
      { property: "og:title", content: "DeckForge — 검증 가능한 AI 슬라이드 제작 시스템" },
      { property: "og:description", content: "승인 기반 강제 워크플로우로 일관된 슬라이드를 만드는 웹 프로토타입." },
    ],
  }),
  component: Home,
});

function Home() {
  const projects = useProjectList();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <div className="font-serif text-lg leading-none">DeckForge</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Workflow Harness · Web MVP</div>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="h-4 w-4" /> 새 프로젝트
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">새 프로젝트 시작</DialogTitle>
              </DialogHeader>
              <NewProjectForm onCreated={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 py-16">
        <section className="mb-16 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-7">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">v0.1 · Workflow Prototype</div>
            <h1 className="mt-3 font-serif text-5xl leading-[1.05] tracking-tight md:text-6xl">
              생성이 아니라<br/>
              <span className="text-accent">검증</span>으로 완성되는<br/>
              슬라이드 제작.
            </h1>
            <p className="mt-6 max-w-xl text-base text-ink-soft">
              DeckForge는 인터뷰 → 조사 → 기획 → 디자인 시스템 → HTML 레이아웃 → 이미지 생성 → 검증 → 편집화 → 보고를
              <strong className="text-foreground"> 사용자 승인 없이 다음 단계로 넘어가지 않는</strong> 강제 워크플로우로 수행하는
              데스크탑 PPT 제작 시스템의 웹 프로토타입입니다.
            </p>
          </div>
          <div className="col-span-12 md:col-span-5">
            <div className="border-l border-border pl-6">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">설계 원칙</div>
              <ul className="mt-3 space-y-3 text-sm">
                <li><strong className="font-medium">Approval Gate</strong> · 승인 버튼이 유일한 상태 전이 경로</li>
                <li><strong className="font-medium">Frozen Context</strong> · 승인된 산출물의 해시를 다음 단계가 참조</li>
                <li><strong className="font-medium">Downstream Invalidation</strong> · 상위 수정 시 이후 자동 무효화</li>
                <li><strong className="font-medium">Editable Output</strong> · PNG 한 장이 아닌 레이어 모델로 종결</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-serif text-2xl">프로젝트</h2>
            <div className="text-xs text-muted-foreground">{projects.length}개</div>
          </div>

          {projects.length === 0 ? (
            <div className="border border-dashed border-border bg-paper p-12 text-center">
              <div className="text-sm text-muted-foreground">아직 프로젝트가 없습니다. 샘플 프롬프트로 빠르게 시작해보세요.</div>
              <Button className="mt-6 bg-foreground text-background hover:bg-foreground/90" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> 새 프로젝트
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border border border-border bg-paper">
              {projects.map((p) => {
                const step = stageToStep(p.stage);
                const label = STEPS.find((s) => s.key === step)?.label ?? step;
                const invalidated = Object.keys(p.invalidated).length;
                return (
                  <li key={p.id} className="group grid grid-cols-[1fr_140px_140px_120px_60px] items-center gap-4 px-5 py-4">
                    <Link
                      to="/project/$projectId/$step"
                      params={{ projectId: p.id, step }}
                      className="min-w-0"
                    >
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{p.initialPrompt}</div>
                    </Link>
                    <div className="text-xs">
                      <span className="rounded bg-secondary px-2 py-1 font-mono">{label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {invalidated > 0 ? <span className="text-warning">{invalidated} invalidated</span> : `${p.aspectRatio} · ${p.slideCount}장`}
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(p.updatedAt).toLocaleDateString("ko-KR")}</div>
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.preventDefault(); if (confirm("이 프로젝트를 삭제할까요?")) deleteProject(p.id); }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Link to="/project/$projectId/$step" params={{ projectId: p.id, step }}>
                        <Button variant="ghost" size="icon"><ArrowRight className="h-4 w-4" /></Button>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <footer className="border-t border-border bg-paper py-8">
        <div className="mx-auto max-w-6xl px-8 text-xs text-muted-foreground">
          DeckForge Web Prototype · 모든 AI 출력은 데모용으로 모킹되어 있으며, 워크플로우 강제성과 상태 전이 검증이 목적입니다.
        </div>
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="3" y="3" width="26" height="26" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="3" width="6" height="26" fill="oklch(0.74 0.16 60)" />
      <line x1="13" y1="11" x2="25" y2="11" stroke="currentColor" strokeWidth="1.5" />
      <line x1="13" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="1.5" />
      <line x1="13" y1="21" x2="20" y2="21" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

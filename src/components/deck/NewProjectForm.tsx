import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ProviderCapabilityMatrix } from "@/components/deck/ProviderCapabilityMatrix";
import { newProjectProviderMatrixInput } from "@/lib/client-provider-runtime-selection";
import { createProject } from "@/lib/deck-store";
import { createProviderCapabilityMatrixView } from "@/lib/provider-capability-view";

const SAMPLES = [
  {
    name: "AI 슬라이드 제작 시스템 피치덱",
    prompt:
      "초기 VC 대상으로 우리 제품(검증 기반 AI PPT 도구)을 소개하는 8장 분량 피치덱을 만들어줘. 문제 정의, 시장, 솔루션, 차별점, 비즈니스 모델을 포함.",
    count: 8,
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

const NEW_PROJECT_PROVIDER_MATRIX = createProviderCapabilityMatrixView(
  newProjectProviderMatrixInput,
);

export function NewProjectForm({ onCreated }: { onCreated?: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(8);
  const [ratio, setRatio] = useState<"16:9" | "4:3">("16:9");
  const [lang, setLang] = useState<"ko" | "en" | "mixed">("ko");

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
      <div className="grid grid-cols-3 gap-3">
        {SAMPLES.map((s) => (
          <button
            key={s.name}
            onClick={() => {
              setName(s.name);
              setPrompt(s.prompt);
              setCount(s.count);
            }}
            className="rounded border border-border bg-paper p-4 text-left transition-colors hover:border-foreground/40"
          >
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              샘플 프롬프트
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

      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label>슬라이드 수</Label>
          <Input
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
            className="flex gap-4 pt-2"
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
            className="flex gap-4 pt-2"
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

      <ProviderCapabilityMatrix view={NEW_PROJECT_PROVIDER_MATRIX} />

      <div className="flex justify-end">
        <Button onClick={submit} className="bg-foreground text-background hover:bg-foreground/90">
          프로젝트 생성하고 인터뷰 시작
        </Button>
      </div>
    </div>
  );
}

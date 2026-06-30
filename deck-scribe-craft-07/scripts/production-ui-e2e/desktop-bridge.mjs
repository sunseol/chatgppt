import { redactSensitiveText } from "./evidence-model.mjs";
import {
  deckPlanPayload,
  designSystemPayload,
  layoutIrPayload,
  researchPackPayload,
} from "./desktop-bridge-fixtures.mjs";

export async function installProductionE2eBridge(page, onIpcEvent) {
  await page.exposeFunction("__deckforgeProductionE2eInvoke", async (command, args) => {
    const startedAt = new Date().toISOString();
    try {
      const result = responseFor(command, args);
      onIpcEvent({
        command,
        startedAt,
        completedAt: new Date().toISOString(),
        ok: true,
        args: redactValue(args),
        result: redactValue(result),
      });
      return result;
    } catch (error) {
      onIpcEvent({
        command,
        startedAt,
        completedAt: new Date().toISOString(),
        ok: false,
        args: redactValue(args),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });

  await page.addInitScript(() => {
    window.__TAURI__ = {
      core: {
        invoke: (command, args) => window.__deckforgeProductionE2eInvoke(command, args),
      },
    };
  });
}

export function responseFor(command, args) {
  if (command === "deckforge_app_info") {
    return { name: "DeckForge", version: "0.0.0-local-e2e", desktopRuntime: "tauri-v2" };
  }
  if (command === "deckforge_codex_login_status") {
    return {
      command: "codex login status",
      exitCode: 0,
      success: true,
      stdout: "Logged in using ChatGPT",
      stderr: "",
    };
  }
  if (command === "deckforge_open_codex_login_terminal") {
    return { command: "codex login", launched: true };
  }
  if (command === "deckforge_codex_app_server_smoke") return smokeEvidence();
  if (command === "deckforge_codex_app_server_structured_turn") {
    return structuredTurnEvidence(args?.request?.prompt ?? "");
  }
  if (command === "deckforge_prepare_project_folder") {
    return {
      projectId: args?.request?.projectId ?? "project-ui-created",
      directoryPath: "/tmp/deckforge-production-ui-e2e",
      filesWritten: [],
    };
  }
  if (command === "deckforge_reveal_project_folder") return null;
  throw new Error(`Unexpected production UI E2E invoke: ${command}`);
}

function smokeEvidence() {
  return {
    initOk: true,
    accountType: "chatgpt",
    threadId: "thread_production_ui_e2e",
    turnId: "turn_production_ui_e2e_smoke",
    turnCompleted: true,
    eventMethods: ["turn/started", "item/completed", "turn/completed"],
    finalText: JSON.stringify({
      artifact: "deckforge_production_ui_e2e",
      stage: "smoke",
      mock: false,
      fixture: false,
      status: "ok",
    }),
  };
}

function structuredTurnEvidence(prompt) {
  const threadId = "thread_production_ui_e2e";
  const turnId = `turn_production_ui_e2e_${Date.now().toString(36)}`;
  const payload = payloadForPrompt(prompt);
  return {
    runtime: "production-ui-e2e-bridge",
    threadId,
    turnId,
    turnCompleted: true,
    durationMs: 1,
    eventMethods: ["turn/started", "item/completed", "turn/completed"],
    notifications: [
      { method: "turn/started", params: { threadId, turn: { id: turnId } } },
      {
        method: "item/completed",
        params: { threadId, turnId, item: { type: "agentMessage", text: JSON.stringify(payload) } },
      },
      { method: "turn/completed", params: { threadId, turn: { id: turnId } } },
    ],
  };
}

function payloadForPrompt(prompt) {
  if (prompt.includes("# Live Research Pack")) return researchPackPayload();
  if (prompt.includes("# Deck Plan Generation Package")) return deckPlanPayload();
  if (prompt.includes("# Design System Generation Package")) return designSystemPayload();
  if (prompt.includes("# Layout IR Generation Package")) return layoutIrPayload();
  if (prompt.includes("# Interview Question Plan")) return interviewQuestionPayload();
  return interviewBriefPayload();
}

function interviewQuestionPayload() {
  return {
    draft: {
      goal: "제품 피치덱 작성",
      audience: "초기 VC",
      desiredOutcome: "",
      coreMessage: "검증 기반 AI PPT 도구",
      slideCount: 8,
      aspectRatio: "16:9",
      language: "ko",
      tone: [],
      mustInclude: ["문제", "시장", "솔루션"],
      mustAvoid: [],
      successCriteria: [],
    },
    questions: [{ field: "desiredOutcome", question: "이 덱으로 어떤 다음 행동을 유도하나요?" }],
    openQuestions: [],
  };
}

function interviewBriefPayload() {
  return {
    id: "production_ui_e2e_brief",
    goal: "제품 피치덱 작성",
    audience: "초기 VC",
    desiredOutcome: "후속 미팅",
    slideCount: 8,
    aspectRatio: "16:9",
    language: "ko",
    tone: ["명료한"],
    mustInclude: ["문제", "솔루션"],
    mustAvoid: ["출처 없는 수치"],
    successCriteria: ["후속 미팅 요청"],
    openQuestions: [],
  };
}

function redactValue(value) {
  return JSON.parse(redactSensitiveText(JSON.stringify(value ?? null)));
}

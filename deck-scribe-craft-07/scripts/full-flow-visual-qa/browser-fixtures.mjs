import { PROJECT_STORAGE_KEY } from "./project.mjs";

export async function seedProject(page, project) {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, JSON.stringify([value]));
    },
    [PROJECT_STORAGE_KEY, project],
  );
}

export async function installDesktopBridge(page) {
  await page.addInitScript(() => {
    window.__TAURI__ = {
      core: {
        invoke: async (command, args) => {
          if (command === "deckforge_app_info") {
            return { name: "DeckForge", version: "0.0.12", desktopRuntime: "tauri-v2" };
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
              projectId: args?.request?.projectId ?? "p_visual_flow",
              directoryPath: "/tmp/deckforge-visual-qa",
              filesWritten: [],
            };
          }
          if (command === "deckforge_reveal_project_folder") return null;
          throw new Error(`Unexpected visual QA invoke: ${command}`);
        },
      },
    };

    function smokeEvidence() {
      return {
        initOk: true,
        accountType: "chatgpt",
        threadId: "thread_visual_qa",
        turnId: "turn_visual_qa_smoke",
        turnCompleted: true,
        eventMethods: ["turn/started", "item/completed", "turn/completed"],
        finalText: JSON.stringify({
          artifact: "deckforge_visual_qa",
          stage: "smoke",
          mock: false,
          fixture: false,
          status: "ok",
        }),
      };
    }

    function structuredTurnEvidence(prompt) {
      const threadId = "thread_visual_qa";
      const turnId = `turn_visual_qa_${Date.now().toString(36)}`;
      const payload = prompt.includes("# Interview Question Plan")
        ? interviewQuestionPayload()
        : interviewBriefPayload();
      return {
        runtime: "visual-qa-fake-tauri",
        threadId,
        turnId,
        turnCompleted: true,
        durationMs: 1,
        eventMethods: ["turn/started", "item/completed", "turn/completed"],
        notifications: [
          { method: "turn/started", params: { threadId, turn: { id: turnId } } },
          {
            method: "item/completed",
            params: {
              threadId,
              turnId,
              item: { type: "agentMessage", text: JSON.stringify(payload) },
            },
          },
          { method: "turn/completed", params: { threadId, turn: { id: turnId } } },
        ],
      };
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
        questions: [
          { field: "desiredOutcome", question: "이 덱으로 어떤 다음 행동을 유도하나요?" },
        ],
        openQuestions: [],
      };
    }

    function interviewBriefPayload() {
      return {
        id: "visual_qa_output",
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
  });
}

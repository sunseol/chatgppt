import { target } from "./interaction-recorder.mjs";

export async function runLiveTextEvidenceFlow({ page, recorder }) {
  const projectId = currentProjectId(page);

  await recorder.capture(
    11,
    "Run live research",
    target(page.getByRole("button", { name: "조사팩 생성 시작", exact: true }), {
      role: "button",
      accessibleName: "조사팩 생성 시작",
      exact: true,
    }),
    async () => {
      await page.getByRole("button", { name: "조사팩 생성 시작", exact: true }).click();
      await page.getByText(/Stored 1 claims from 1 live sources/).waitFor({ timeout: 10_000 });
      await page.getByRole("button", { name: "Live Research Pack 승인", exact: true }).waitFor({
        timeout: 10_000,
      });
    },
  );
  await recorder.capture(
    12,
    "Approve live research",
    target(page.getByRole("button", { name: "Live Research Pack 승인", exact: true }), {
      role: "button",
      accessibleName: "Live Research Pack 승인",
      exact: true,
    }),
    async () => {
      await page.getByRole("button", { name: "Live Research Pack 승인", exact: true }).click();
      await waitForProjectStage(page, projectId, "PLANNING");
    },
  );
  await recorder.capture(
    13,
    "Open plan step",
    target(page.getByRole("link", { name: /기획/ }).first(), {
      role: "link",
      accessibleName: "기획",
      exact: false,
    }),
    async () => {
      await page.getByRole("link", { name: /기획/ }).first().click();
      await page.waitForURL(/\/project\/[^/]+\/plan/, { timeout: 10_000 });
      await page
        .getByRole("button", { name: "라이브 텍스트 파이프라인 실행", exact: true })
        .waitFor({ timeout: 10_000 });
    },
  );
  await recorder.capture(
    14,
    "Run live text pipeline",
    target(page.getByRole("button", { name: "라이브 텍스트 파이프라인 실행", exact: true }), {
      role: "button",
      accessibleName: "라이브 텍스트 파이프라인 실행",
      exact: true,
    }),
    async () => {
      await page
        .getByRole("button", { name: "라이브 텍스트 파이프라인 실행", exact: true })
        .click();
      await page
        .getByText("라이브 텍스트 산출물이 준비되었습니다.", { exact: true })
        .waitFor({ timeout: 10_000 });
      await waitForProjectStage(page, projectId, "LAYOUT_APPROVAL_PENDING");
      await expectProjectArtifacts(page, projectId, ["plan", "design", "layout"]);
    },
  );
  await recorder.capture(
    15,
    "Open layout step",
    target(page.getByRole("link", { name: /레이아웃/ }).first(), {
      role: "link",
      accessibleName: "레이아웃",
      exact: false,
    }),
    async () => {
      await page
        .getByRole("link", { name: /레이아웃/ })
        .first()
        .click();
      await page.waitForURL(/\/project\/[^/]+\/layout/, { timeout: 10_000 });
      await page.getByText("레이아웃").first().waitFor({ timeout: 10_000 });
    },
  );
}

function currentProjectId(page) {
  const match = /\/project\/([^/]+)\//.exec(page.url());
  if (!match) throw new Error(`Could not read project id from ${page.url()}`);
  return decodeURIComponent(match[1]);
}

async function waitForProjectStage(page, projectId, stage) {
  await page.waitForFunction(
    ({ expectedProjectId, expectedStage }) => {
      const raw = window.localStorage.getItem("deckforge.projects.v1");
      const projects = raw ? JSON.parse(raw) : [];
      return projects.some(
        (project) => project.id === expectedProjectId && project.stage === expectedStage,
      );
    },
    { expectedProjectId: projectId, expectedStage: stage },
    { timeout: 10_000 },
  );
}

async function expectProjectArtifacts(page, projectId, artifactKeys) {
  const missing = await page.evaluate(
    ({ expectedProjectId, keys }) => {
      const raw = window.localStorage.getItem("deckforge.projects.v1");
      const projects = raw ? JSON.parse(raw) : [];
      const project = projects.find((item) => item.id === expectedProjectId);
      if (!project) return keys;
      return keys.filter((key) => project[key] === undefined || project[key] === null);
    },
    { expectedProjectId: projectId, keys: artifactKeys },
  );
  if (missing.length > 0) {
    throw new Error(`Missing production UI E2E artifacts: ${missing.join(", ")}`);
  }
}

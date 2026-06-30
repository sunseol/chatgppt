import { target } from "./interaction-recorder.mjs";
import { runLiveImageToPptFlow } from "./live-image-to-ppt-flow.mjs";
import { currentProjectId, expectProjectArtifacts, waitForProjectStage } from "./project-state.mjs";

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
      await page
        .getByRole("button", {
          name: "레이아웃 초안을 승인하고 슬라이드 생성 시작",
          exact: true,
        })
        .waitFor({ timeout: 10_000 });
    },
  );
  await runLiveImageToPptFlow({ page, recorder, projectId });
}

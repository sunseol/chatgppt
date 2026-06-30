import { target } from "./interaction-recorder.mjs";
import {
  expectProjectArtifacts,
  expectProjectCollections,
  waitForProjectStage,
} from "./project-state.mjs";

export async function runLiveImageToPptFlow({ page, recorder, projectId }) {
  await recorder.capture(
    16,
    "Approve layout for live generation",
    target(layoutApprovalButton(page), {
      role: "button",
      accessibleName: "레이아웃 초안을 승인하고 슬라이드 생성 시작",
      exact: true,
    }),
    async () => {
      await layoutApprovalButton(page).click();
      await page.waitForURL(/\/project\/[^/]+\/generate/, { timeout: 10_000 });
      await waitForProjectStage(page, projectId, "GENERATING_SLIDES");
      await imageGenerationButton(page).waitFor({ timeout: 10_000 });
    },
  );
  await recorder.capture(
    17,
    "Run live image generation",
    target(imageGenerationButton(page), {
      role: "button",
      accessibleName: "승인한 레이아웃으로 슬라이드 이미지 생성",
      exact: true,
    }),
    async () => {
      await imageGenerationButton(page).click();
      await waitForProjectStage(page, projectId, "SLIDE_REVIEW_PENDING", 20_000);
      await expectProjectArtifacts(page, projectId, [
        "slides",
        "layers",
        "liveSlideGeneration",
        "imagePathDecision",
      ]);
      await expectProjectCollections(page, projectId, { slides: 5, layers: 5 });
      await reviewButton(page).waitFor({ timeout: 10_000 });
    },
  );
  await recorder.capture(
    18,
    "Open live review",
    target(reviewButton(page), {
      role: "button",
      accessibleName: "검토로 이동",
      exact: true,
    }),
    async () => {
      await reviewButton(page).click();
      await page.waitForURL(/\/project\/[^/]+\/review/, { timeout: 10_000 });
      await reviewApprovalButton(page).waitFor({ timeout: 10_000 });
    },
  );
  await recorder.capture(
    19,
    "Approve live review",
    target(reviewApprovalButton(page), {
      role: "button",
      accessibleName: "전체 검토 완료하고 편집 시작",
      exact: true,
    }),
    async () => {
      await reviewApprovalButton(page).click();
      await page.waitForURL(/\/project\/[^/]+\/editor/, { timeout: 10_000 });
      await waitForProjectStage(page, projectId, "EDITOR");
      await editorFinalizeButton(page).waitFor({ timeout: 10_000 });
    },
  );
  await recorder.capture(
    20,
    "Finalize editor",
    target(editorFinalizeButton(page), {
      role: "button",
      accessibleName: "최종화하고 내보내기로 이동",
      exact: true,
    }),
    async () => {
      await editorFinalizeButton(page).click();
      await page.waitForURL(/\/project\/[^/]+\/export/, { timeout: 10_000 });
      await waitForProjectStage(page, projectId, "FINAL_REPORTING");
    },
  );
  await recorder.capture(
    21,
    "Verify PPTX export readiness",
    target(page.getByText("내보내기 파일이 준비되었습니다.", { exact: true }), {
      role: "status",
      accessibleName: "내보내기 파일이 준비되었습니다.",
      exact: true,
    }),
    async () => {
      await page
        .getByText("내보내기 파일이 준비되었습니다.", { exact: true })
        .waitFor({ timeout: 15_000 });
      await page.getByRole("button", { name: "PPTX 파일 다운로드", exact: true }).waitFor({
        timeout: 10_000,
      });
      await expectProjectArtifacts(page, projectId, ["exportPackage"]);
    },
  );
}

function layoutApprovalButton(page) {
  return page.getByRole("button", {
    name: "레이아웃 초안을 승인하고 슬라이드 생성 시작",
    exact: true,
  });
}

function imageGenerationButton(page) {
  return page.getByRole("button", {
    name: "승인한 레이아웃으로 슬라이드 이미지 생성",
    exact: true,
  });
}

function reviewButton(page) {
  return page.getByRole("button", { name: "검토로 이동", exact: true });
}

function reviewApprovalButton(page) {
  return page.getByRole("button", { name: "전체 검토 완료하고 편집 시작", exact: true });
}

function editorFinalizeButton(page) {
  return page.getByRole("button", { name: "최종화하고 내보내기로 이동", exact: true });
}

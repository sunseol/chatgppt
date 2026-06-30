import { inspect } from "./inspect.mjs";
import { visualQaProject } from "./project.mjs";

export async function runHomeDialogs({ page, baseUrl, outDir, viewportName, results }) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  results.push(await inspect(page, `${viewportName}-home`, outDir));
  await openAndInspectDialog(page, "새 프로젝트", `${viewportName}-new-project`, outDir, results);
  await openAndInspectDialog(
    page,
    "연결 및 실행 환경",
    `${viewportName}-settings`,
    outDir,
    results,
    runSettingsSmokeIfEnabled,
  );
  await openAndInspectDialog(page, "로컬 데이터", `${viewportName}-local-data`, outDir, results);
  await openAndInspectDialog(page, "도움말", `${viewportName}-help`, outDir, results);
}

export async function inspectStep({ page, outDir, viewportName, step }) {
  const routePath = `/project/${visualQaProject.id}/${step}`;
  await navigateSpa(page, routePath);
  await page.waitForTimeout(250);
  return inspect(page, `${viewportName}-step-${step}`, outDir, {
    requestedPath: routePath,
    actualPath: new URL(page.url()).pathname,
  });
}

export async function exercisePrimaryInteractions({ page, baseUrl, outDir, results }) {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await runLiveInterviewInteraction(page, outDir, results);
  await runReviewInteractions(page, outDir, results);
  await runEditorInteraction(page, outDir, results);
  await runExportInteraction(page, outDir, results);
}

async function openAndInspectDialog(page, label, name, outDir, results, interact) {
  await page.getByRole("button", { name: label, exact: true }).first().click();
  await page.getByRole("dialog").waitFor({ timeout: 5_000 });
  if (interact) await interact(page);
  results.push(await inspect(page, name, outDir));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
}

async function runSettingsSmokeIfEnabled(page) {
  const smokeButton = page.getByRole("button", { name: "연결 확인" });
  const ready =
    (await smokeButton.isVisible().catch(() => false)) &&
    (await smokeButton.isEnabled().catch(() => false));
  if (!ready) return;
  await smokeButton.click();
  await page
    .getByText(/Smoke OK|thread_/)
    .first()
    .waitFor({ timeout: 5_000 });
}

async function runLiveInterviewInteraction(page, outDir, results) {
  await navigateSpa(page, `/project/${visualQaProject.id}/interview`);
  if (await clickIfVisible(page.getByRole("button", { name: "라이브 인터뷰 실행" }))) {
    await page
      .getByText(/인터뷰 질문이 준비되었습니다|라이브 인터뷰 브리프가 준비되었습니다/)
      .first()
      .waitFor({ timeout: 8_000 });
    results.push(await inspect(page, "desktop-interview-live-questions", outDir));

    const answerPanel = page.locator("section").filter({ hasText: "Live interview answers" });
    const answerInput = answerPanel.locator("textarea").first();
    if (await answerInput.isVisible().catch(() => false)) {
      await page.getByText("필수 답변 1개 남음").waitFor({ timeout: 5_000 });
      await answerInput.fill("후속 미팅을 요청하도록 명확한 투자 설득 구조를 원합니다.");
      await page.getByText("모든 필수 답변 입력 완료").waitFor({ timeout: 5_000 });
      await answerPanel.getByRole("button", { name: "답변 제출하고 브리프 생성" }).click();
      const briefReady = await page
        .waitForFunction(
          () => document.body.innerText.includes("라이브 인터뷰 브리프가 준비되었습니다"),
          null,
          { timeout: 30_000 },
        )
        .then(() => true)
        .catch(() => false);
      results.push(
        await inspect(
          page,
          briefReady ? "desktop-interview-live-brief" : "desktop-interview-live-brief-pending",
          outDir,
          briefReady ? {} : { skipped: true, reason: "brief_ready_timeout" },
        ),
      );
    }
    return;
  }
  results.push(await inspect(page, "desktop-interview-no-live-button", outDir, { skipped: true }));
}

async function runReviewInteractions(page, outDir, results) {
  await navigateSpa(page, `/project/${visualQaProject.id}/review`);
  if (await clickIfVisible(page.getByRole("button", { name: /크게 보기/ }).first())) {
    await page.getByRole("dialog").waitFor({ timeout: 5_000 });
    results.push(await inspect(page, "desktop-review-large-dialog", outDir));
    await page.keyboard.press("Escape");
  } else {
    results.push(
      await inspect(page, "desktop-review-large-dialog-skipped", outDir, { skipped: true }),
    );
  }

  const revisionInput = page.getByPlaceholder(/오른쪽 그래프/);
  if (!(await revisionInput.isVisible().catch(() => false))) {
    results.push(await inspect(page, "desktop-review-revision-skipped", outDir, { skipped: true }));
    return;
  }
  await revisionInput.fill("제목 대비를 조금 더 강하게");
  await page.getByRole("button", { name: "이 슬라이드만 수정 생성" }).click();
  await page.getByText("수정본 승인").waitFor({ timeout: 5_000 });
  results.push(await inspect(page, "desktop-review-revision", outDir));
}

async function runEditorInteraction(page, outDir, results) {
  await navigateSpa(page, `/project/${visualQaProject.id}/editor`);
  const button = page.getByRole("button", { name: /크게 편집|큰 화면 편집|크게 보기/ }).first();
  if (await clickIfVisible(button)) {
    await page.getByRole("dialog").waitFor({ timeout: 5_000 });
    results.push(await inspect(page, "desktop-editor-large-dialog", outDir));
    await page.keyboard.press("Escape");
    return;
  }
  results.push(
    await inspect(page, "desktop-editor-large-dialog-skipped", outDir, { skipped: true }),
  );
}

async function runExportInteraction(page, outDir, results) {
  await navigateSpa(page, `/project/${visualQaProject.id}/export`);
  if (await clickIfVisible(page.getByText("세부 기록 보기"))) {
    results.push(await inspect(page, "desktop-export-details-open", outDir));
    return;
  }
  results.push(await inspect(page, "desktop-export-details-skipped", outDir, { skipped: true }));
}

async function navigateSpa(page, routePath) {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, routePath);
  await page.waitForFunction(
    (nextPath) =>
      window.location.pathname === nextPath ||
      document.body.innerText.includes("프로젝트를 찾을 수 없습니다") ||
      !document.body.innerText.includes("프로젝트 불러오는 중"),
    routePath,
    { timeout: 5_000 },
  );
  await page.waitForTimeout(150);
}

async function clickIfVisible(locator) {
  try {
    await locator.waitFor({ state: "visible", timeout: 1_000 });
    await locator.click();
    return true;
  } catch {
    return false;
  }
}

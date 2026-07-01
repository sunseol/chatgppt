import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function inspect(page, name, outDir, extra = {}) {
  await mkdir(outDir, { recursive: true });
  await page.waitForTimeout(150);
  const screenshot = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  const metrics = await page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const bodyText = document.body.innerText.trim().replace(/\s+/g, " ");
    const focusables = Array.from(
      document.querySelectorAll('button,a,input,textarea,select,summary,[role="button"]'),
    ).flatMap((node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      if (style.visibility === "hidden" || style.display === "none") return [];
      if (rect.width <= 0 || rect.height <= 0) return [];
      const label =
        node.getAttribute("aria-label") ?? node.getAttribute("title") ?? node.textContent ?? "";
      return [
        {
          label: label.trim().replace(/\s+/g, " ").slice(0, 100),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      ];
    });
    return {
      title: document.title,
      viewport,
      bodyTextLength: bodyText.length,
      bodyTextSample: bodyText.slice(0, 260),
      overflowX: Math.max(0, document.documentElement.scrollWidth - viewport.width),
      overflowY: Math.max(0, document.documentElement.scrollHeight - viewport.height),
      focusableCount: focusables.length,
      offscreen: offscreenControls(focusables, viewport),
      buttonTextOverflow: buttonTextOverflow(),
      activeDialogCount: document.querySelectorAll('[role="dialog"]').length,
    };

    function offscreenControls(items, viewportSize) {
      return items.filter(
        (item) =>
          item.left < -1 ||
          item.right > viewportSize.width + 1 ||
          item.top < -1 ||
          item.bottom > viewportSize.height + 1,
      );
    }

    function buttonTextOverflow() {
      return Array.from(document.querySelectorAll("button")).flatMap((button) => {
        const style = window.getComputedStyle(button);
        if (style.visibility === "hidden" || style.display === "none") return [];
        if (button.scrollWidth <= button.clientWidth + 2) return [];
        return [
          {
            text: button.textContent?.trim().replace(/\s+/g, " ").slice(0, 100) ?? "",
            scrollWidth: button.scrollWidth,
            clientWidth: button.clientWidth,
          },
        ];
      });
    }
  });
  return { name, screenshot, url: page.url(), ...extra, ...metrics };
}

export async function writeSummary(outDir, summary) {
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
}

export function wirePageDiagnostics(page) {
  const consoleMessages = [];
  const pageErrors = [];
  const httpErrors = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.url()}`);
  });
  return {
    snapshot: () => ({
      consoleMessages: consoleMessages.slice(-50),
      pageErrors: pageErrors.slice(-20),
      httpErrors: httpErrors.slice(-50),
    }),
  };
}

export function collectFailures(results, diagnostics) {
  const failures = [];
  for (const result of results) {
    if (result.bodyTextLength === 0) failures.push(`${result.name}: blank body`);
    if (result.overflowX > 1) {
      failures.push(`${result.name}: horizontal overflow ${result.overflowX}px`);
    }
    collectHorizontalOffscreenFailures(result, failures);
    collectButtonOverflowFailures(result, failures);
  }
  for (const error of diagnostics.pageErrors) failures.push(`page error: ${error}`);
  for (const message of diagnostics.consoleMessages) {
    if (message.startsWith("error:") && !message.includes("404 (Not Found)")) {
      failures.push(`console ${message}`);
    }
  }
  for (const error of diagnostics.httpErrors) failures.push(`http ${error}`);
  return failures;
}

function collectHorizontalOffscreenFailures(result, failures) {
  for (const item of result.offscreen) {
    if (item.left >= -1 && item.right <= result.viewport.width + 1) continue;
    failures.push(
      `${result.name}: horizontally offscreen control "${item.label || "[unlabelled]"}"`,
    );
  }
}

function collectButtonOverflowFailures(result, failures) {
  for (const item of result.buttonTextOverflow) {
    failures.push(
      `${result.name}: button text overflow "${item.text}" ${item.clientWidth}/${item.scrollWidth}`,
    );
  }
}

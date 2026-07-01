import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { interactionDirectoryName, redactSensitiveText } from "./evidence-model.mjs";

export class InteractionRecorder {
  constructor({ page, outDir }) {
    this.page = page;
    this.outDir = outDir;
    this.activeId = null;
    this.interactions = [];
    this.networkEvents = [];
    this.ipcEvents = [];
  }

  attachNetworkCapture() {
    this.page.on("request", (request) => {
      this.recordNetwork({ type: "request", method: request.method(), url: request.url() });
    });
    this.page.on("response", (response) => {
      this.recordNetwork({ type: "response", status: response.status(), url: response.url() });
    });
    this.page.on("requestfailed", (request) => {
      this.recordNetwork({
        type: "requestfailed",
        method: request.method(),
        url: request.url(),
        failure: request.failure()?.errorText ?? "unknown",
      });
    });
  }

  recordIpc(event) {
    this.ipcEvents.push({ interactionId: this.activeId, ...event });
  }

  async capture(index, label, target, action) {
    const id = interactionDirectoryName(index, label);
    const dir = path.join(this.outDir, "interactions", id);
    await mkdir(dir, { recursive: true });
    const startedAt = new Date().toISOString();
    const beforeState = await this.snapshotState();
    await this.page.screenshot({ path: path.join(dir, "before.png"), fullPage: false });
    const box = await target.locator.boundingBox().catch(() => null);

    this.activeId = id;
    let ok = true;
    let error = null;
    try {
      await action();
    } catch (caught) {
      ok = false;
      error = caught instanceof Error ? caught.message : String(caught);
    } finally {
      this.activeId = null;
    }

    const afterState = await this.snapshotState();
    await this.page.screenshot({ path: path.join(dir, "after.png"), fullPage: false });
    const completedAt = new Date().toISOString();
    const network = this.networkEvents.filter((event) => event.interactionId === id);
    const ipc = this.ipcEvents.filter((event) => event.interactionId === id);
    const interaction = {
      id,
      label,
      target: target.metadata,
      coordinates: box ? centerOf(box) : null,
      startedAt,
      completedAt,
      ok,
      error,
      files: {
        interaction: path.join(dir, "interaction.json"),
        beforeScreenshot: path.join(dir, "before.png"),
        afterScreenshot: path.join(dir, "after.png"),
        beforeState: path.join(dir, "before-state.json"),
        afterState: path.join(dir, "after-state.json"),
        network: path.join(dir, "network.jsonl"),
        ipc: path.join(dir, "ipc.jsonl"),
      },
    };
    await writeJson(path.join(dir, "before-state.json"), beforeState);
    await writeJson(path.join(dir, "after-state.json"), afterState);
    await writeJson(interaction.files.interaction, interaction);
    await writeJsonLines(path.join(dir, "network.jsonl"), network);
    await writeJsonLines(path.join(dir, "ipc.jsonl"), ipc);
    this.interactions.push(interaction);
    if (!ok) throw new Error(error ?? `Interaction failed: ${label}`);
    return interaction;
  }

  recordNetwork(event) {
    this.networkEvents.push({
      interactionId: this.activeId,
      timestamp: new Date().toISOString(),
      ...redactObject(event),
    });
  }

  async snapshotState() {
    const state = await this.page.evaluate(() => {
      const rawProjects = window.localStorage.getItem("deckforge.projects.v1");
      let projects = [];
      try {
        projects = rawProjects ? JSON.parse(rawProjects) : [];
      } catch {
        projects = [];
      }
      const bodyText = document.body.innerText.trim().replace(/\s+/g, " ");
      return {
        url: window.location.href,
        title: document.title,
        bodyTextSample: bodyText.slice(0, 5000),
        bodyTextLength: bodyText.length,
        projectCount: Array.isArray(projects) ? projects.length : 0,
        projects: Array.isArray(projects)
          ? projects.map((project) => ({
              id: project.id,
              name: project.name,
              stage: project.stage,
            }))
          : [],
      };
    });
    return redactObject(state);
  }
}

export function target(locator, metadata) {
  return { locator, metadata };
}

function centerOf(box) {
  return {
    x: Math.round(box.x + box.width / 2),
    y: Math.round(box.y + box.height / 2),
  };
}

function redactObject(value) {
  return JSON.parse(redactSensitiveText(JSON.stringify(value)));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeJsonLines(filePath, values) {
  await writeFile(filePath, values.map((value) => JSON.stringify(value)).join("\n"));
}

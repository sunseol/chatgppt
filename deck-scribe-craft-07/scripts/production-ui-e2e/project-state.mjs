export function currentProjectId(page) {
  const match = /\/project\/([^/]+)\//.exec(page.url());
  if (!match) throw new Error(`Could not read project id from ${page.url()}`);
  return decodeURIComponent(match[1]);
}

export async function waitForProjectStage(page, projectId, stage, timeout = 10_000) {
  await page.waitForFunction(
    ({ expectedProjectId, expectedStage }) => {
      const raw = window.localStorage.getItem("deckforge.projects.v1");
      const projects = raw ? JSON.parse(raw) : [];
      return projects.some(
        (project) => project.id === expectedProjectId && project.stage === expectedStage,
      );
    },
    { expectedProjectId: projectId, expectedStage: stage },
    { timeout },
  );
}

export function missingProjectArtifactsFromRaw(raw, projectId, artifactKeys) {
  const projects = parseStoredProjects(raw);
  const project = projects.find((item) => item.id === projectId);
  if (!project) return artifactKeys;
  return artifactKeys.filter((key) => project[key] === undefined || project[key] === null);
}

export async function expectProjectArtifacts(page, projectId, artifactKeys, timeout = 10_000) {
  try {
    await page.waitForFunction(
      ({ expectedProjectId, keys }) => {
        const raw = window.localStorage.getItem("deckforge.projects.v1");
        const projects = raw ? JSON.parse(raw) : [];
        const project = projects.find((item) => item.id === expectedProjectId);
        return keys.every((key) => project?.[key] !== undefined && project?.[key] !== null);
      },
      { expectedProjectId: projectId, keys: artifactKeys },
      { timeout },
    );
    return;
  } catch {
    // Fall through to a deterministic one-shot read for a precise failure message.
  }

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

export async function expectProjectCollections(page, projectId, expectedCounts) {
  const mismatches = await page.evaluate(
    ({ expectedProjectId, counts }) => {
      const raw = window.localStorage.getItem("deckforge.projects.v1");
      const projects = raw ? JSON.parse(raw) : [];
      const project = projects.find((item) => item.id === expectedProjectId);
      if (!project) return Object.keys(counts);
      return Object.entries(counts)
        .filter(([key, count]) => !Array.isArray(project[key]) || project[key].length !== count)
        .map(([key]) => key);
    },
    { expectedProjectId: projectId, counts: expectedCounts },
  );
  if (mismatches.length > 0) {
    throw new Error(`Unexpected production UI E2E collection counts: ${mismatches.join(", ")}`);
  }
}

function parseStoredProjects(raw) {
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

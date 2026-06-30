import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function readCurrentLocalArtifactIdentity({ root, releaseArtifact }) {
  const [buildVersionText, git] = await Promise.all([
    readOptionalFile(path.join(root, "release-artifacts", "BUILD_VERSION")),
    readGitState(root),
  ]);
  return buildLocalArtifactIdentity({
    root,
    releaseArtifact,
    buildVersionText,
    gitHead: git.head,
    gitStatusPorcelain: git.statusPorcelain,
  });
}

export function buildLocalArtifactIdentity({
  root,
  releaseArtifact,
  buildVersionText = "",
  gitHead = "",
  gitStatusPorcelain = "",
}) {
  const dmgPath = normalizeArtifactPath(root, releaseArtifact?.dmgPath ?? "");
  const version = releaseVersion(buildVersionText, dmgPath);
  return {
    gitCommit: gitHead.trim() || "unknown",
    dirtyWorktree: gitStatusPorcelain.trim().length > 0 || !gitHead.trim(),
    version,
    buildNumber: buildNumber(version),
    dmgPath,
    dmgSha256: releaseArtifact?.actualHash ?? releaseArtifact?.expectedHash ?? "",
  };
}

function normalizeArtifactPath(root, artifactPath) {
  if (typeof artifactPath !== "string" || artifactPath.trim().length === 0) return "";
  const trimmed = artifactPath.trim();
  const relativePath = path.isAbsolute(trimmed) ? path.relative(root, trimmed) : trimmed;
  return relativePath.split(path.sep).join("/");
}

function releaseVersion(buildVersionText, dmgPath) {
  const fromBuildFile = buildVersionText.trim();
  if (fromBuildFile) return fromBuildFile;
  const fileName = dmgPath.split("/").at(-1) ?? "";
  const match = /^DeckForge_(.+)_aarch64\.dmg$/.exec(fileName);
  return match?.[1] ?? "";
}

function buildNumber(version) {
  const parts = version.split(".").filter(Boolean);
  return parts.at(-1) ?? "";
}

async function readGitState(root) {
  try {
    const [{ stdout: head }, { stdout: statusPorcelain }] = await Promise.all([
      execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root }),
      execFileAsync("git", ["status", "--porcelain"], { cwd: root }),
    ]);
    return { head, statusPorcelain };
  } catch {
    return { head: "", statusPorcelain: "unknown" };
  }
}

async function readOptionalFile(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

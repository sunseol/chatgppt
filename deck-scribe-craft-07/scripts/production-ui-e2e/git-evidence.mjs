import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function collectGitEvidence(root) {
  const commit = await gitOutput(root, ["rev-parse", "HEAD"]);
  const status = await gitOutput(root, ["status", "--porcelain"]);
  return {
    commit,
    dirtyWorktree: status.length > 0,
    statusPorcelain: status,
  };
}

async function gitOutput(root, args) {
  const { stdout } = await execFileAsync("git", args, { cwd: root });
  return stdout.trim();
}

import { spawn } from "node:child_process";

export function startServer({ root, port, mode }) {
  const script = mode === "development" ? "dev" : "preview";
  return spawnBun(root, ["run", script, "--", "--host", "127.0.0.1", "--port", String(port)]);
}

export async function waitForServer(baseUrl) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20_000) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Preview/dev server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

export async function stopServer(server) {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
  await new Promise((resolve) => server.once("exit", resolve));
}

function spawnBun(root, args) {
  return spawn("bun", args, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

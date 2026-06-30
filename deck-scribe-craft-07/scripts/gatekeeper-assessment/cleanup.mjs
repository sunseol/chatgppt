export function finalizeGatekeeperMountCleanup({
  verification,
  attachedByScript,
  mountDir,
  run,
  removeMountDir,
}) {
  const cleanup = {
    ok: true,
    detach: null,
    remove: null,
  };

  if (attachedByScript) {
    const detach = run("hdiutil", ["detach", mountDir]);
    cleanup.detach = commandCleanup(detach);
    cleanup.ok = cleanup.ok && cleanup.detach.ok;
  }
  try {
    removeMountDir(mountDir);
    cleanup.remove = { ok: true };
  } catch (error) {
    cleanup.ok = false;
    cleanup.remove = errorCleanup(error);
  }

  verification.checks.cleanup = cleanup;
}

function commandCleanup(result) {
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function errorCleanup(error) {
  return {
    ok: false,
    code: error && typeof error === "object" && "code" in error ? error.code : "UNKNOWN",
    message: error instanceof Error ? error.message : String(error),
  };
}

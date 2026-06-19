import type { FrozenDeckContext } from "./deck-context";
import type { ProviderArtifactProvenance } from "./provider-provenance";
import {
  recoverProjectThreadManifest,
  type ProjectThreadRecoverySnapshot,
  type ResumableProjectWorkerThread,
} from "./project-thread-lifecycle";

export type ProjectThreadResumeEvidence = {
  readonly threadId: string;
  readonly previousTurnId: string;
  readonly resumedTurnId: string;
  readonly completed: boolean;
  readonly resumedAfterProcessRestart: boolean;
  readonly deckContextId: string;
  readonly deckContextHash: string;
  readonly approvedArtifactIds: readonly string[];
  readonly providerKind: ProviderArtifactProvenance["providerKind"];
  readonly authMode: ProviderArtifactProvenance["authMode"];
  readonly executionMode: ProviderArtifactProvenance["executionMode"];
};

export type ProjectThreadResumeEvidenceIssueCode =
  | "restart_recovery_blocked"
  | "resume_thread_not_in_manifest"
  | "resume_context_mismatch"
  | "resume_context_hash_mismatch"
  | "resume_artifact_bundle_mismatch"
  | "resume_turn_not_completed"
  | "missing_resume_previous_turn"
  | "missing_resume_next_turn"
  | "resume_previous_turn_not_recovered"
  | "resume_reused_existing_turn"
  | "resume_not_after_restart"
  | "resume_non_codex_turn"
  | "resume_non_codex_session_auth"
  | "resume_non_production_turn";

export type ProjectThreadResumeEvidenceIssue = {
  readonly code: ProjectThreadResumeEvidenceIssueCode;
  readonly message: string;
};

export type ProjectThreadResumeEvidenceResult =
  | {
      readonly kind: "ready";
      readonly resumedThread: ResumableProjectWorkerThread;
      readonly previousTurnId: string;
      readonly resumedTurnId: string;
    }
  | {
      readonly kind: "blocked";
      readonly issues: readonly ProjectThreadResumeEvidenceIssue[];
    };

export function evaluateProjectThreadResumeEvidence(input: {
  readonly context: FrozenDeckContext;
  readonly snapshot: ProjectThreadRecoverySnapshot;
  readonly evidence: ProjectThreadResumeEvidence;
}): ProjectThreadResumeEvidenceResult {
  const recovery = recoverProjectThreadManifest({
    context: input.context,
    snapshot: input.snapshot,
  });
  if (recovery.kind === "blocked") {
    return {
      kind: "blocked",
      issues: recovery.issues.map((message) => ({
        code: "restart_recovery_blocked",
        message,
      })),
    };
  }

  const resumedThread = recovery.resumableThreads.find(
    (thread) => thread.threadId === input.evidence.threadId,
  );
  const issues = resumeEvidenceIssues(input.context, input.evidence, resumedThread);
  if (issues.length > 0 || resumedThread === undefined) return { kind: "blocked", issues };
  return {
    kind: "ready",
    resumedThread,
    previousTurnId: input.evidence.previousTurnId,
    resumedTurnId: input.evidence.resumedTurnId,
  };
}

function resumeEvidenceIssues(
  context: FrozenDeckContext,
  evidence: ProjectThreadResumeEvidence,
  resumedThread: ResumableProjectWorkerThread | undefined,
): readonly ProjectThreadResumeEvidenceIssue[] {
  return [
    ...resumeLiveCodexIssues(evidence),
    ...(resumedThread === undefined
      ? [
          issue(
            "resume_thread_not_in_manifest",
            "Resume evidence must reference a recovered project worker thread.",
          ),
        ]
      : []),
    ...(evidence.deckContextId === context.deckContextId
      ? []
      : [issue("resume_context_mismatch", "Resume evidence uses a stale deck context id.")]),
    ...(evidence.deckContextHash === context.hash
      ? []
      : [issue("resume_context_hash_mismatch", "Resume evidence uses a stale deck context hash.")]),
    ...(sameIds(evidence.approvedArtifactIds, approvedIds(context))
      ? []
      : [
          issue(
            "resume_artifact_bundle_mismatch",
            "Resume evidence must cite the current approved artifact bundle.",
          ),
        ]),
    ...(evidence.completed
      ? []
      : [issue("resume_turn_not_completed", "The resumed App Server turn must complete.")]),
    ...(evidence.previousTurnId.trim()
      ? []
      : [
          issue(
            "missing_resume_previous_turn",
            "Resume evidence must include the pre-restart turn id.",
          ),
        ]),
    ...(evidence.resumedTurnId.trim()
      ? []
      : [issue("missing_resume_next_turn", "Resume evidence must include the resumed turn id.")]),
    ...(resumedThread !== undefined &&
    evidence.previousTurnId.trim() &&
    evidence.previousTurnId !== resumedThread.lastCompletedTurnId
      ? [
          issue(
            "resume_previous_turn_not_recovered",
            "Resume evidence must continue from the recovered worker's last completed turn.",
          ),
        ]
      : []),
    ...(evidence.previousTurnId !== evidence.resumedTurnId
      ? []
      : [
          issue(
            "resume_reused_existing_turn",
            "The resumed turn must be a new turn on the recovered thread.",
          ),
        ]),
    ...(evidence.resumedAfterProcessRestart
      ? []
      : [
          issue(
            "resume_not_after_restart",
            "Resume evidence must be collected after recreating the App Server process.",
          ),
        ]),
  ];
}

function resumeLiveCodexIssues(
  evidence: ProjectThreadResumeEvidence,
): readonly ProjectThreadResumeEvidenceIssue[] {
  return [
    ...(evidence.providerKind === "codex"
      ? []
      : [issue("resume_non_codex_turn", "The resumed worker turn must be generated by Codex.")]),
    ...(evidence.authMode === "codex_session"
      ? []
      : [
          issue(
            "resume_non_codex_session_auth",
            "The resumed worker turn must use the authenticated Codex session.",
          ),
        ]),
    ...(evidence.executionMode === "production"
      ? []
      : [
          issue(
            "resume_non_production_turn",
            "The resumed worker turn must come from production execution mode.",
          ),
        ]),
  ];
}

function approvedIds(context: FrozenDeckContext): readonly string[] {
  return [
    context.approvedArtifacts.briefId,
    context.approvedArtifacts.researchPackId,
    context.approvedArtifacts.deckPlanId,
    context.approvedArtifacts.designSystemId,
    context.approvedArtifacts.layoutPrototypeId,
  ];
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function issue(
  code: ProjectThreadResumeEvidenceIssueCode,
  message: string,
): ProjectThreadResumeEvidenceIssue {
  return { code, message };
}

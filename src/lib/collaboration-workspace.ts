export type WorkspaceRole = "owner" | "editor" | "reviewer" | "viewer";
export type WorkspaceAction = "edit_slide" | "comment" | "approve_stage" | "manage_members";

export type CollaborationWorkspace = {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly syncStrategy: {
    readonly mode: "local_first_append_only_log";
    readonly conflictPolicy: "manual_review_required";
    readonly approvalLogStrategy: "versioned_stage_entries";
  };
  readonly members: readonly {
    readonly userId: string;
    readonly displayName: string;
    readonly role: WorkspaceRole;
  }[];
  readonly comments: readonly {
    readonly threadId: string;
    readonly authorUserId: string;
    readonly slideNumber: number;
    readonly body: string;
    readonly createdAt: number;
    readonly status: "open" | "resolved";
    readonly resolvedBy?: string;
    readonly resolvedAt?: number;
  }[];
  readonly approvals: readonly {
    readonly resourceKey: string;
    readonly approvedBy: string;
    readonly approvedAt: number;
    readonly baseRevision: number;
    readonly hash: string;
  }[];
  readonly resourceRevisions: Readonly<Record<string, number>>;
};

export function createCollaborationWorkspace(input: {
  readonly id: string;
  readonly name: string;
  readonly members: readonly {
    readonly userId: string;
    readonly displayName: string;
    readonly role: WorkspaceRole;
  }[];
  readonly resourceRevisions: Readonly<Record<string, number>>;
  readonly createdAt: number;
}): CollaborationWorkspace {
  return {
    id: input.id,
    name: input.name,
    createdAt: input.createdAt,
    syncStrategy: {
      mode: "local_first_append_only_log",
      conflictPolicy: "manual_review_required",
      approvalLogStrategy: "versioned_stage_entries",
    },
    members: input.members,
    comments: [],
    approvals: [],
    resourceRevisions: input.resourceRevisions,
  };
}

export function workspaceMemberCan(
  workspace: CollaborationWorkspace,
  userId: string,
  action: WorkspaceAction,
): boolean {
  const role = workspace.members.find((member) => member.userId === userId)?.role;
  if (role === undefined) return false;
  switch (action) {
    case "manage_members":
      return role === "owner";
    case "approve_stage":
      return role === "owner" || role === "reviewer";
    case "edit_slide":
      return role === "owner" || role === "editor";
    case "comment":
      return role === "owner" || role === "editor" || role === "reviewer";
    default:
      return assertNever(action);
  }
}

export function addWorkspaceComment(
  workspace: CollaborationWorkspace,
  input: {
    readonly threadId: string;
    readonly authorUserId: string;
    readonly slideNumber: number;
    readonly body: string;
    readonly createdAt: number;
  },
): CollaborationWorkspace {
  if (!workspaceMemberCan(workspace, input.authorUserId, "comment")) {
    throw new Error(`User ${input.authorUserId} cannot comment in workspace ${workspace.id}.`);
  }
  return {
    ...workspace,
    comments: [...workspace.comments, { ...input, status: "open" }],
  };
}

export function resolveWorkspaceComment(
  workspace: CollaborationWorkspace,
  input: { readonly threadId: string; readonly resolvedBy: string; readonly resolvedAt: number },
): CollaborationWorkspace {
  if (!workspaceMemberCan(workspace, input.resolvedBy, "comment")) {
    throw new Error(
      `User ${input.resolvedBy} cannot resolve comments in workspace ${workspace.id}.`,
    );
  }
  return {
    ...workspace,
    comments: workspace.comments.map((comment) =>
      comment.threadId === input.threadId
        ? {
            ...comment,
            status: "resolved",
            resolvedBy: input.resolvedBy,
            resolvedAt: input.resolvedAt,
          }
        : comment,
    ),
  };
}

export function recordWorkspaceApproval(
  workspace: CollaborationWorkspace,
  input: {
    readonly resourceKey: string;
    readonly approvedBy: string;
    readonly approvedAt: number;
    readonly baseRevision: number;
    readonly hash: string;
  },
):
  | { readonly kind: "accepted"; readonly workspace: CollaborationWorkspace }
  | {
      readonly kind: "conflict";
      readonly conflict: {
        readonly resourceKey: string;
        readonly currentRevision: number;
        readonly attemptedRevision: number;
        readonly policy: "manual_review_required";
      };
    } {
  if (!workspaceMemberCan(workspace, input.approvedBy, "approve_stage")) {
    throw new Error(`User ${input.approvedBy} cannot approve stage changes.`);
  }
  const currentRevision = workspace.resourceRevisions[input.resourceKey] ?? 0;
  if (input.baseRevision !== currentRevision) {
    return {
      kind: "conflict",
      conflict: {
        resourceKey: input.resourceKey,
        currentRevision,
        attemptedRevision: input.baseRevision,
        policy: "manual_review_required",
      },
    };
  }
  return {
    kind: "accepted",
    workspace: {
      ...workspace,
      approvals: [...workspace.approvals, input],
    },
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected workspace action: ${String(value)}`);
}

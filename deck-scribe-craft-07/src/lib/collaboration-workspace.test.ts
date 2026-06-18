import { describe, expect, test } from "bun:test";
import {
  addWorkspaceComment,
  createCollaborationWorkspace,
  recordWorkspaceApproval,
  resolveWorkspaceComment,
  workspaceMemberCan,
} from "./collaboration-workspace";

describe("collaboration workspace", () => {
  test("enforces role permissions for editing, approval, and workspace management", () => {
    const workspace = baseWorkspace();

    expect(workspaceMemberCan(workspace, "owner_1", "manage_members")).toBe(true);
    expect(workspaceMemberCan(workspace, "editor_1", "edit_slide")).toBe(true);
    expect(workspaceMemberCan(workspace, "editor_1", "approve_stage")).toBe(false);
    expect(workspaceMemberCan(workspace, "reviewer_1", "approve_stage")).toBe(true);
    expect(workspaceMemberCan(workspace, "viewer_1", "comment")).toBe(false);
  });

  test("adds and resolves async review comments without mutating workspace state", () => {
    const commented = addWorkspaceComment(baseWorkspace(), {
      threadId: "thread_1",
      authorUserId: "reviewer_1",
      slideNumber: 3,
      body: "The source note should be closer to the chart.",
      createdAt: 120,
    });
    const resolved = resolveWorkspaceComment(commented, {
      threadId: "thread_1",
      resolvedBy: "editor_1",
      resolvedAt: 160,
    });

    expect(baseWorkspace().comments.length).toBe(0);
    expect(commented.comments[0]?.status).toBe("open");
    expect(resolved.comments[0]?.status).toBe("resolved");
  });

  test("rejects comment resolution from viewers and non-members", () => {
    const commented = addWorkspaceComment(baseWorkspace(), {
      threadId: "thread_1",
      authorUserId: "reviewer_1",
      slideNumber: 3,
      body: "The source note should be closer to the chart.",
      createdAt: 120,
    });

    expect(() =>
      resolveWorkspaceComment(commented, {
        threadId: "thread_1",
        resolvedBy: "viewer_1",
        resolvedAt: 160,
      }),
    ).toThrow("cannot resolve comments");
    expect(() =>
      resolveWorkspaceComment(commented, {
        threadId: "thread_1",
        resolvedBy: "unknown_1",
        resolvedAt: 160,
      }),
    ).toThrow("cannot resolve comments");
  });

  test("returns a manual-review conflict when approval is based on a stale revision", () => {
    const result = recordWorkspaceApproval(baseWorkspace(), {
      resourceKey: "design",
      approvedBy: "reviewer_1",
      approvedAt: 200,
      baseRevision: 2,
      hash: "sha256:design-v2",
    });

    expect(result.kind).toBe("conflict");
    if (result.kind === "conflict") {
      expect(result.conflict.policy).toBe("manual_review_required");
      expect(result.conflict.currentRevision).toBe(3);
    }
  });
});

function baseWorkspace() {
  return createCollaborationWorkspace({
    id: "workspace_001",
    name: "DeckForge Team",
    members: [
      { userId: "owner_1", displayName: "Owner", role: "owner" },
      { userId: "editor_1", displayName: "Editor", role: "editor" },
      { userId: "reviewer_1", displayName: "Reviewer", role: "reviewer" },
      { userId: "viewer_1", displayName: "Viewer", role: "viewer" },
    ],
    resourceRevisions: {
      design: 3,
      layout: 5,
    },
    createdAt: 100,
  });
}

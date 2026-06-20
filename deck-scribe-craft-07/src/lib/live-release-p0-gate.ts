import type { LiveReleaseBlocker } from "./live-release-gate";

export const LIVE_P0_TICKET_IDS = [
  "DF-200",
  "DF-201",
  "DF-202",
  "DF-203",
  "DF-204",
  "DF-205",
  "DF-206",
  "DF-210",
  "DF-211",
  "DF-212",
  "DF-213",
  "DF-214",
  "DF-215",
  "DF-220",
  "DF-221",
  "DF-222",
  "DF-223",
  "DF-224",
  "DF-230",
  "DF-231",
  "DF-232",
  "DF-233",
  "DF-234",
  "DF-235",
  "DF-240",
  "DF-241",
  "DF-242",
  "DF-243",
  "DF-245",
  "DF-246",
  "DF-247",
] as const;

export type LiveP0TicketId = (typeof LIVE_P0_TICKET_IDS)[number];

export type LiveTicketStatus = "not_started" | "verified_mock" | "live_partial" | "verified_live";

export type LiveTicketEvidence = {
  readonly id: LiveP0TicketId;
  readonly status: LiveTicketStatus;
};

export function p0Blockers(tickets: readonly LiveTicketEvidence[]): readonly LiveReleaseBlocker[] {
  const liveIds = new Set(
    tickets.filter((ticket) => ticket.status === "verified_live").map((ticket) => ticket.id),
  );
  const conflicts = conflictingTicketIds(tickets);
  const missing = LIVE_P0_TICKET_IDS.filter((ticketId) => !liveIds.has(ticketId));
  return [
    ...(conflicts.length === 0
      ? []
      : [
          blocker(
            "p0_ticket_status_conflict",
            "P0 ticket status evidence must not contain contradictory records.",
            conflicts,
          ),
        ]),
    ...(missing.length === 0
      ? []
      : [
          blocker(
            "p0_not_live_verified",
            "Every P0 Live ticket must be Verified Live before release.",
            missing,
          ),
        ]),
  ];
}

function conflictingTicketIds(tickets: readonly LiveTicketEvidence[]): readonly LiveP0TicketId[] {
  const statusesById = new Map<LiveP0TicketId, Set<LiveTicketStatus>>();
  for (const ticket of tickets) {
    const statuses = statusesById.get(ticket.id) ?? new Set<LiveTicketStatus>();
    statuses.add(ticket.status);
    statusesById.set(ticket.id, statuses);
  }
  return LIVE_P0_TICKET_IDS.filter((ticketId) => (statusesById.get(ticketId)?.size ?? 0) > 1);
}

function blocker(
  code: LiveReleaseBlocker["code"],
  message: string,
  refs: readonly string[],
): LiveReleaseBlocker {
  return { code, message, refs };
}

# Ticket Status Migration Report

Date: 2026-06-18

Scope: DF-201 review of previously completed implementation tickets that lack Live provider evidence.

## Migration rule

- Structural implementation remains complete when local tests and mock workflow evidence exist.
- Live release evidence requires production-mode provider provenance with `execution_mode=production`, non-mock `provider_kind`, live `turn_id` or `request_id`, and fixture=false.
- P3 completion is preserved, but it does not count toward Live release readiness.

## Reviewed tickets

| Ticket  | Current release status | Rationale                                                                          |
| ------- | ---------------------- | ---------------------------------------------------------------------------------- |
| DF-021  | Verified - Mock        | Runtime/auth surface exists, but no fresh Live login evidence.                     |
| DF-022  | Verified - Mock        | Codex execution adapter is tested with controlled runner behavior only.            |
| DF-031  | Verified - Mock        | Interview question and brief generation are local deterministic flows.             |
| DF-041  | Verified - Mock        | Research orchestration uses local source specs and test fetchers.                  |
| DF-041B | Verified - Mock        | Source fetcher behavior is tested, but no stored live HTML/PDF bundle is attached. |
| DF-050  | Verified - Mock        | Deck plan prompt/parser exists without Live turn evidence.                         |
| DF-061  | Verified - Mock        | Design system output is local mock generation.                                     |
| DF-071  | Verified - Mock        | Layout IR renderer and validation are local/test-backed.                           |
| DF-092  | Verified - Mock        | Image artifacts are modelled, but production UI still uses mock provider id.       |
| DF-093  | Verified - Mock        | Review gallery is connected to local generated descriptors.                        |
| DF-095  | Verified - Mock        | Editable overlay/compositor logic is local/test-backed.                            |
| DF-101  | Verified - Mock        | Revision behavior is modeled without live image regeneration evidence.             |
| DF-132  | Verified - Mock        | Generation report exists, but live provider lineage is incomplete.                 |
| DF-152  | Verified - Mock        | Export gate exists for internal package completeness, not Live release.            |
| DF-153  | Verified - Mock        | MVP release checklist is internal mock-provider scoped.                            |

## Result

All reviewed tickets remain useful implementation evidence, but none should be counted as `Verified Live` until the new provider provenance gates pass in production mode.
